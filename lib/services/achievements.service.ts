"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import { awardXP } from "./gamification.service";
import { notifyAchievementUnlock } from "@/lib/actions/notifications.action";

// ===========================================================
// ACHIEVEMENT DEFINITIONS
// ===========================================================

const ACHIEVEMENTS = [
  // Study Room
  {
    slug: "first_lesson",
    title: "First Steps",
    description: "Complete your first lesson",
    icon: "📚",
    points: 10,
    category: "STUDY",
    requirementType: "count",
    requirementField: "lessons_completed",
    requirementValue: 1,
  },
  {
    slug: "book_worm",
    title: "Book Worm",
    description: "Complete all Study Room chapters",
    icon: "🎓",
    points: 200,
    category: "STUDY",
    requirementType: "count",
    requirementField: "chapters_completed",
    requirementValue: 7,
  },
  {
    slug: "quiz_master",
    title: "Quiz Master",
    description: "Score 100% on 5 quizzes",
    icon: "🧠",
    points: 100,
    category: "STUDY",
    requirementType: "count",
    requirementField: "perfect_quizzes",
    requirementValue: 5,
  },

  // Training Room
  {
    slug: "first_practice",
    title: "Practice Makes Perfect",
    description: "Complete your first training session",
    icon: "🎯",
    points: 10,
    category: "TRAINING",
    requirementType: "count",
    requirementField: "training_sessions",
    requirementValue: 1,
  },
  {
    slug: "star_student",
    title: "STAR Student",
    description: "Complete 10 training sessions",
    icon: "⭐",
    points: 50,
    category: "TRAINING",
    requirementType: "count",
    requirementField: "training_sessions",
    requirementValue: 10,
  },
  {
    slug: "interview_master",
    title: "Interview Master",
    description: "Score 90+ on 5 training sessions",
    icon: "👑",
    points: 150,
    category: "TRAINING",
    requirementType: "count",
    requirementField: "high_score_sessions",
    requirementValue: 5,
  },
  {
    slug: "voice_pro",
    title: "Voice Pro",
    description: "Complete 20 voice-based sessions",
    icon: "🎤",
    points: 75,
    category: "TRAINING",
    requirementType: "count",
    requirementField: "voice_sessions",
    requirementValue: 20,
  },

  // Streaks
  {
    slug: "streak_7",
    title: "Week Warrior",
    description: "Practice 7 days in a row",
    icon: "🔥",
    points: 50,
    category: "MILESTONE",
    requirementType: "streak",
    requirementField: "current_streak",
    requirementValue: 7,
  },
  {
    slug: "streak_30",
    title: "Monthly Champion",
    description: "Practice 30 days in a row",
    icon: "🏆",
    points: 200,
    category: "MILESTONE",
    requirementType: "streak",
    requirementField: "current_streak",
    requirementValue: 30,
  },

  // Community
  {
    slug: "storyteller",
    title: "Storyteller",
    description: "Share your success story",
    icon: "📖",
    points: 100,
    category: "COMMUNITY",
    requirementType: "count",
    requirementField: "stories_submitted",
    requirementValue: 1,
  },

  // Milestones
  {
    slug: "first_application",
    title: "Taking Action",
    description: "Submit your first job application",
    icon: "🚀",
    points: 25,
    category: "MILESTONE",
    requirementType: "count",
    requirementField: "applications_submitted",
    requirementValue: 1,
  },
  {
    slug: "application_streak",
    title: "Application Machine",
    description: "Submit 10 job applications",
    icon: "💼",
    points: 75,
    category: "MILESTONE",
    requirementType: "count",
    requirementField: "applications_submitted",
    requirementValue: 10,
  },
  {
    slug: "first_offer",
    title: "Dream Achieved",
    description: "Receive your first job offer",
    icon: "🎉",
    points: 500,
    category: "MILESTONE",
    requirementType: "count",
    requirementField: "offers_received",
    requirementValue: 1,
    isSecret: true,
  },
] as const;

type AchievementSlug = (typeof ACHIEVEMENTS)[number]["slug"];

// ===========================================================
// TYPES
// ===========================================================

interface AchievementWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  isSecret: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  requirementValue: number;
}

// ===========================================================
// SEED ACHIEVEMENTS (run once to populate DB)
// ===========================================================

export async function seedAchievements(): Promise<{ success: boolean; error: string | null }> {
  try {
    for (const achievement of ACHIEVEMENTS) {
      await adminSupabase.from("achievements").upsert(
        {
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          points: achievement.points,
          requirementType: achievement.requirementType,
          requirementField: achievement.requirementField,
          requirementValue: achievement.requirementValue,
          isSecret: (achievement as any).isSecret || false,
        },
        { onConflict: "slug" }
      );
    }
    return { success: true, error: null };
  } catch (err) {
    console.error("Error seeding achievements:", err);
    return { success: false, error: "Failed to seed achievements" };
  }
}

// ===========================================================
// GET USER ACHIEVEMENTS
// ===========================================================

export async function getUserAchievements(): Promise<{
  data: AchievementWithProgress[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    // Get all achievements
    const { data: achievements, error: achievementsError } = await adminSupabase
      .from("achievements")
      .select("*")
      .order("category");

    if (achievementsError) return { data: null, error: achievementsError.message };

    // Get user's achievement progress
    const { data: userAchievements } = await adminSupabase
      .from("user_achievements")
      .select("achievementId, progress, unlockedAt")
      .eq("userId", user.id);

    const userAchievementMap = new Map(
      (userAchievements || []).map((ua: any) => [ua.achievementId, ua])
    );

    const result: AchievementWithProgress[] = (achievements || []).map((a: any) => {
      const userProgress = userAchievementMap.get(a.id);
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        description: a.description,
        icon: a.icon || "🏅",
        category: a.category,
        points: a.points,
        isSecret: a.isSecret,
        isUnlocked: !!userProgress?.unlockedAt,
        unlockedAt: userProgress?.unlockedAt || null,
        progress: userProgress?.progress || 0,
        requirementValue: a.requirementValue || 1,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting user achievements:", err);
    return { data: null, error: "Failed to load achievements" };
  }
}

// ===========================================================
// CHECK AND UNLOCK ACHIEVEMENTS
// ===========================================================

export async function checkAndUnlockAchievements(
  userId: string,
  trigger: string,
  triggerValue?: number
): Promise<{
  data: { unlockedAchievements: AchievementWithProgress[] } | null;
  error: string | null;
}> {
  try {
    const unlockedAchievements: AchievementWithProgress[] = [];

    // Get all achievements
    const { data: achievements } = await adminSupabase
      .from("achievements")
      .select("*");

    if (!achievements) return { data: { unlockedAchievements: [] }, error: null };

    // Get user's current achievements
    const { data: userAchievements } = await adminSupabase
      .from("user_achievements")
      .select("achievementId, unlockedAt")
      .eq("userId", userId);

    const unlockedIds = new Set(
      (userAchievements || [])
        .filter((ua: any) => ua.unlockedAt)
        .map((ua: any) => ua.achievementId)
    );

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      // Check if this achievement matches the trigger
      if (achievement.requirementField !== trigger) continue;

      const currentValue = triggerValue ?? 0;
      const requiredValue = achievement.requirementValue || 1;

      if (currentValue >= requiredValue) {
        // Unlock achievement
        await adminSupabase.from("user_achievements").upsert(
          {
            userId,
            achievementId: achievement.id,
            progress: currentValue,
            unlockedAt: new Date().toISOString(),
            isNotified: false,
          },
          { onConflict: "userId,achievementId" }
        );

        // Award XP for achievement
        await awardXP(userId, "achievement_unlock" as any, achievement.id, achievement.points);

        // Send notification
        await notifyAchievementUnlock(userId, achievement.title, achievement.icon || "🏅");

        unlockedAchievements.push({
          id: achievement.id,
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon || "🏅",
          category: achievement.category,
          points: achievement.points,
          isSecret: achievement.isSecret,
          isUnlocked: true,
          unlockedAt: new Date().toISOString(),
          progress: currentValue,
          requirementValue: requiredValue,
        });
      } else {
        // Update progress
        await adminSupabase.from("user_achievements").upsert(
          {
            userId,
            achievementId: achievement.id,
            progress: currentValue,
          },
          { onConflict: "userId,achievementId" }
        );
      }
    }

    return { data: { unlockedAchievements }, error: null };
  } catch (err) {
    console.error("Error checking achievements:", err);
    return { data: null, error: "Failed to check achievements" };
  }
}

// ===========================================================
// GET USER STATS FOR ACHIEVEMENT CHECKING
// ===========================================================

export async function getUserAchievementStats(userId: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  try {
    // Lessons completed
    const { count: lessonsCompleted } = await adminSupabase
      .from("user_study_progress")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("status", "COMPLETED");
    stats.lessons_completed = lessonsCompleted || 0;

    // Training sessions
    const { count: trainingSessions } = await adminSupabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("status", "COMPLETED");
    stats.training_sessions = trainingSessions || 0;

    // High score sessions (90+)
    const { count: highScoreSessions } = await adminSupabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("status", "COMPLETED")
      .gte("overallScore", 90);
    stats.high_score_sessions = highScoreSessions || 0;

    // Applications submitted
    const { count: applications } = await adminSupabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId);
    stats.applications_submitted = applications || 0;

    // Offers received
    const { count: offers } = await adminSupabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .in("status", ["OFFERED", "ACCEPTED"]);
    stats.offers_received = offers || 0;

    // Stories submitted
    const { count: stories } = await adminSupabase
      .from("success_stories")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId);
    stats.stories_submitted = stories || 0;

    // Current streak (from user_interview_stats)
    const { data: interviewStats } = await adminSupabase
      .from("user_interview_stats")
      .select("currentStreakDays")
      .eq("userId", userId)
      .single();
    stats.current_streak = interviewStats?.currentStreakDays || 0;

    return stats;
  } catch (err) {
    console.error("Error getting achievement stats:", err);
    return stats;
  }
}

// ===========================================================
// TRIGGER ACHIEVEMENT CHECK (call after relevant actions)
// ===========================================================

export async function triggerAchievementCheck(
  userId: string,
  triggers: string[]
): Promise<AchievementWithProgress[]> {
  const allUnlocked: AchievementWithProgress[] = [];

  try {
    const stats = await getUserAchievementStats(userId);

    for (const trigger of triggers) {
      const value = stats[trigger] || 0;
      const result = await checkAndUnlockAchievements(userId, trigger, value);
      if (result.data?.unlockedAchievements) {
        allUnlocked.push(...result.data.unlockedAchievements);
      }
    }
  } catch (err) {
    console.error("Error triggering achievement check:", err);
  }

  return allUnlocked;
}
