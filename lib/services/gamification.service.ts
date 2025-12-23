"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";

// ===========================================================
// XP REWARDS CONFIGURATION
// ===========================================================

const XP_REWARDS = {
  // Study Room
  lesson_complete: 25,
  quiz_pass: 50,
  quiz_perfect: 75,
  chapter_complete: 100,
  study_room_complete: 500,

  // Training Room
  training_session_complete: 30,
  training_perfect_score: 100, // 90+ on session
  weak_area_improved: 75,
  daily_practice: 20,

  // Milestones
  first_application: 50,
  first_interview: 100,
  job_offer: 500,

  // Community
  success_story_submitted: 200,
  peer_practice_complete: 50,

  // Streaks
  streak_7_days: 100,
  streak_30_days: 500,
} as const;

type XPSource = keyof typeof XP_REWARDS;

// ===========================================================
// LEVEL CONFIGURATION
// ===========================================================

const LEVELS = [
  { level: 1, xpRequired: 0, title: "Beginner" },
  { level: 2, xpRequired: 100, title: "Job Seeker" },
  { level: 3, xpRequired: 300, title: "Applicant" },
  { level: 4, xpRequired: 600, title: "Interviewer" },
  { level: 5, xpRequired: 1000, title: "Candidate" },
  { level: 6, xpRequired: 1500, title: "Contender" },
  { level: 7, xpRequired: 2200, title: "Professional" },
  { level: 8, xpRequired: 3000, title: "Expert" },
  { level: 9, xpRequired: 4000, title: "Master" },
  { level: 10, xpRequired: 5500, title: "Interview Champion" },
] as const;

// ===========================================================
// HELPER FUNCTIONS
// ===========================================================

function calculateLevel(totalXp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level;
    }
  }
  return 1;
}

function getLevelInfo(level: number) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

function getXPToNextLevel(currentLevel: number, totalXp: number): number {
  const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1);
  if (!nextLevel) return 0; // Max level
  return nextLevel.xpRequired - totalXp;
}

function getLevelProgress(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelInfo = getLevelInfo(currentLevel);
  const nextLevelInfo = getLevelInfo(currentLevel + 1);

  if (!nextLevelInfo || currentLevel >= 10) {
    return {
      currentLevel,
      currentLevelXp: totalXp - currentLevelInfo.xpRequired,
      nextLevelXp: 0,
      progressPercent: 100,
    };
  }

  const xpInCurrentLevel = totalXp - currentLevelInfo.xpRequired;
  const xpNeededForNextLevel = nextLevelInfo.xpRequired - currentLevelInfo.xpRequired;
  const progressPercent = Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel,
    currentLevelXp: xpInCurrentLevel,
    nextLevelXp: xpNeededForNextLevel,
    progressPercent,
  };
}

// ===========================================================
// AWARD XP
// ===========================================================

const COMMUNITY_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

function calculateCommunityLevel(points: number): number {
  for (let i = COMMUNITY_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= COMMUNITY_LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function deriveReputationFromXP(totalXp: number): number {
  const base = Math.max(0, Math.floor(totalXp / 20));
  let milestoneBonus = 0;
  if (totalXp >= 6000) milestoneBonus = 500;
  else if (totalXp >= 4000) milestoneBonus = 250;
  else if (totalXp >= 1500) milestoneBonus = 100;
  return base + milestoneBonus;
}

export async function syncReputationFromXP(userId: string, totalXp: number) {
  try {
    const derivedReputation = deriveReputationFromXP(totalXp);
    if (derivedReputation <= 0) return;

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("id, reputationPoints, level")
      .eq("userId", userId)
      .maybeSingle();

    const existingPoints = profile?.reputationPoints ?? 0;
    if (derivedReputation <= existingPoints) return;

    const targetLevel = calculateCommunityLevel(derivedReputation);
    if (profile) {
      await adminSupabase
        .from("community_profiles")
        .update({
          reputationPoints: derivedReputation,
          level: Math.max(profile.level ?? 1, targetLevel),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", profile.id);
    } else {
      await adminSupabase.from("community_profiles").insert({
        userId,
        reputationPoints: derivedReputation,
        level: targetLevel,
      });
    }
  } catch (err) {
    console.error("Error syncing reputation from XP:", err);
  }
}

export async function awardXP(
  userId: string,
  source: XPSource | string,
  sourceId?: string,
  customAmount?: number
): Promise<{
  data: {
    xpAwarded: number;
    newTotal: number;
    leveledUp: boolean;
    newLevel?: number;
    levelTitle?: string;
  } | null;
  error: string | null;
}> {
  try {
    const amount = customAmount ?? (XP_REWARDS[source as XPSource] || 0);
    if (amount <= 0) {
      return { data: null, error: "Invalid XP amount" };
    }

    // Get current XP
    const { data: userXP } = await adminSupabase
      .from("user_xp")
      .select("*")
      .eq("userId", userId)
      .single();

    const currentXP = userXP?.totalXp || 0;
    const newTotal = currentXP + amount;

    // Check for level up
    const currentLevel = calculateLevel(currentXP);
    const newLevel = calculateLevel(newTotal);
    const leveledUp = newLevel > currentLevel;

    const xpToNext = getXPToNextLevel(newLevel, newTotal);

    // Upsert user XP
    const { error: upsertError } = await adminSupabase.from("user_xp").upsert(
      {
        userId,
        totalXp: newTotal,
        currentLevel: newLevel,
        xpToNextLevel: xpToNext,
        weeklyXp: (userXP?.weeklyXp || 0) + amount,
        monthlyXp: (userXP?.monthlyXp || 0) + amount,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "userId" }
    );

    if (upsertError) {
      console.error("Error upserting user XP:", upsertError);
      return { data: null, error: upsertError.message };
    }

    // Log transaction
    const { error: txError } = await adminSupabase.from("xp_transactions").insert({
      userId,
      amount,
      source,
      sourceId: sourceId || null,
      description: `Earned ${amount} XP from ${source.replace(/_/g, " ")}`,
    });

    if (txError) {
      console.error("Error logging XP transaction:", txError);
    }

    await syncReputationFromXP(userId, newTotal);

    // If leveled up, could create a notification here
    // (skipping for now, can add later)

    return {
      data: {
        xpAwarded: amount,
        newTotal,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        levelTitle: leveledUp ? getLevelInfo(newLevel).title : undefined,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error awarding XP:", err);
    return { data: null, error: "Failed to award XP" };
  }
}

// ===========================================================
// GET USER XP & LEVEL
// ===========================================================

export async function getUserXP(): Promise<{
  data: {
    totalXp: number;
    currentLevel: number;
    levelTitle: string;
    xpToNextLevel: number;
    weeklyXp: number;
    monthlyXp: number;
    progressPercent: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: userXP } = await adminSupabase
      .from("user_xp")
      .select("*")
      .eq("userId", user.id)
      .single();

    const totalXp = userXP?.totalXp || 0;
    await syncReputationFromXP(user.id, totalXp);
    const progress = getLevelProgress(totalXp);
    const levelInfo = getLevelInfo(progress.currentLevel);

    return {
      data: {
        totalXp,
        currentLevel: progress.currentLevel,
        levelTitle: levelInfo.title,
        xpToNextLevel: progress.nextLevelXp - progress.currentLevelXp,
        weeklyXp: userXP?.weeklyXp || 0,
        monthlyXp: userXP?.monthlyXp || 0,
        progressPercent: progress.progressPercent,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting user XP:", err);
    return { data: null, error: "Failed to load XP" };
  }
}

export async function syncCurrentUserReputation(): Promise<{
  data: { reputationPoints: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: userXP } = await adminSupabase
      .from("user_xp")
      .select("totalXp")
      .eq("userId", user.id)
      .maybeSingle();

    const totalXp = userXP?.totalXp || 0;
    await syncReputationFromXP(user.id, totalXp);

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("reputationPoints")
      .eq("userId", user.id)
      .maybeSingle();

    return {
      data: {
        reputationPoints: profile?.reputationPoints ?? deriveReputationFromXP(totalXp),
      },
      error: null,
    };
  } catch (err) {
    console.error("Error syncing reputation:", err);
    return { data: null, error: "Failed to sync reputation" };
  }
}

// ===========================================================
// GET XP HISTORY
// ===========================================================

export async function getXPHistory(limit: number = 20): Promise<{
  data: {
    id: string;
    amount: number;
    source: string;
    description: string | null;
    createdAt: string;
  }[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("xp_transactions")
      .select("id, amount, source, description, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };

    return { data: data || [], error: null };
  } catch (err) {
    console.error("Error getting XP history:", err);
    return { data: null, error: "Failed to load XP history" };
  }
}

// ===========================================================
// GET LEADERBOARD
// ===========================================================

export async function getLeaderboard(
  period: "weekly" | "monthly" | "all" = "weekly",
  limit: number = 10
): Promise<{
  data: {
    rank: number;
    userId: string;
    displayName: string;
    xp: number;
    level: number;
    isCurrentUser: boolean;
  }[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const xpField = period === "weekly" ? "weeklyXp" : period === "monthly" ? "monthlyXp" : "totalXp";

    const { data, error } = await adminSupabase
      .from("user_xp")
      .select(
        `${xpField}, currentLevel, userId, user:users(email, profile:profiles(firstName, lastName, displayName))`
      )
      .order(xpField, { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };

    const userIds = (data || []).map((entry: any) => entry.userId).filter(Boolean);
    const privacyMap = new Map<string, boolean>();
    if (userIds.length > 0) {
      const { data: privacyRows } = await adminSupabase
        .from("community_profile_settings")
        .select("userId, showOnLeaderboard")
        .in("userId", userIds);
      (privacyRows || []).forEach((row: any) => {
        if (row?.userId) {
          privacyMap.set(row.userId, row.showOnLeaderboard ?? true);
        }
      });
    }

    const leaderboard = (data || []).map((entry: any, index: number) => {
      const profileRaw = entry.user?.profile;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      const trimmedDisplayName = (profile?.displayName || "").trim();
      const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
      const emailHandle = (entry.user?.email || "").split("@")[0] || "";
      const prefersPublicName = privacyMap.has(entry.userId) ? privacyMap.get(entry.userId)! : true;
      const computedName = trimmedDisplayName || fullName || emailHandle || "Anonymous";
      const displayName = prefersPublicName ? computedName : "Anonymous";

      return {
        rank: index + 1,
        userId: entry.userId,
        displayName,
        xp: entry[xpField] || 0,
        level: entry.currentLevel || 1,
        isCurrentUser: user?.id === entry.userId,
      };
    });

    return { data: leaderboard, error: null };
  } catch (err) {
    console.error("Error getting leaderboard:", err);
    return { data: null, error: "Failed to get leaderboard" };
  }
}

export async function getLeaderboardPrivacyPreference(): Promise<{
  data: { showOnLeaderboard: boolean } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("community_profile_settings")
      .select("showOnLeaderboard")
      .eq("userId", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return { data: null, error: error.message };
    }

    return {
      data: {
        showOnLeaderboard: data?.showOnLeaderboard ?? true,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting leaderboard privacy preference:", err);
    return { data: null, error: "Failed to load preference" };
  }
}

export async function updateLeaderboardPrivacyPreference(showOnLeaderboard: boolean): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("community_profile_settings")
      .select("userId")
      .eq("userId", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await adminSupabase
        .from("community_profile_settings")
        .update({ showOnLeaderboard, updatedAt: new Date().toISOString() })
        .eq("userId", user.id);
      if (error) return { data: null, error: error.message };
    } else {
      const { error } = await adminSupabase.from("community_profile_settings").insert({
        userId: user.id,
        showOnLeaderboard,
      });
      if (error) return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating leaderboard privacy preference:", err);
    return { data: null, error: "Failed to update preference" };
  }
}
