"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/services/gamification.service";
import { triggerAchievementCheck } from "@/lib/services/achievements.service";

// ===========================================================
// TYPES
// ===========================================================

export interface SuccessStoryStats {
  totalApplications: number;
  totalTrainingSessions: number;
  totalStudyTimeMinutes: number;
  totalQuestionsPracticed: number;
  avgTrainingScore: number;
  daysToOffer: number | null;
}

export interface SuccessStorySummary {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  title: string | null;
  story: string;
  isAnonymous: boolean;
  displayName: string | null;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  // Computed
  authorName: string;
  hasLiked?: boolean;
}

export interface SuccessStoryDetail extends SuccessStorySummary {
  salaryRange: string | null;
  keyLearnings: string[];
  adviceForOthers: string | null;
  totalApplications: number | null;
  totalTrainingSessions: number | null;
  totalStudyTimeMinutes: number | null;
  totalQuestionsPracticed: number | null;
  avgTrainingScore: number | null;
  daysToOffer: number | null;
}

export interface SubmitStoryInput {
  jobTitle: string;
  companyName: string;
  industry?: string;
  location?: string;
  salaryRange?: string;
  title?: string;
  story: string;
  keyLearnings?: string[];
  adviceForOthers?: string;
  isAnonymous?: boolean;
  displayName?: string;
}

// ===========================================================
// GET SUCCESS STORIES (Feed)
// ===========================================================

export async function getSuccessStories(params?: {
  industry?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  data: { stories: SuccessStorySummary[]; total: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    let query = adminSupabase
      .from("success_stories")
      .select("id, userId, jobTitle, companyName, industry, location, title, story, isAnonymous, displayName, isFeatured, viewCount, likeCount, createdAt, user:users(profile:profiles(firstName,lastName))", { count: "exact" })
      .eq("isPublished", true)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params?.industry) {
      query = query.eq("industry", params.industry);
    }

    if (params?.featured) {
      query = query.eq("isFeatured", true);
    }

    const { data, error, count } = await query;

    if (error) return { data: null, error: error.message };

    // Check if current user has liked each story
    let userLikes: Set<string> = new Set();
    if (user) {
      const storyIds = (data || []).map((s: any) => s.id);
      if (storyIds.length > 0) {
        const { data: likes } = await adminSupabase
          .from("success_story_likes")
          .select("storyId")
          .eq("userId", user.id)
          .in("storyId", storyIds);
        userLikes = new Set((likes || []).map((l: any) => l.storyId));
      }
    }

    const stories: SuccessStorySummary[] = (data || []).map((s: any) => {
      const profileRaw = s.user?.profile;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      const profileName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName || ""}`.trim()
        : null;

      return ({
      id: s.id,
      userId: s.userId,
      jobTitle: s.jobTitle,
      companyName: s.companyName,
      industry: s.industry,
      location: s.location,
      title: s.title,
      story: s.story,
      isAnonymous: s.isAnonymous,
      displayName: s.displayName,
      isFeatured: s.isFeatured,
      viewCount: s.viewCount,
      likeCount: s.likeCount,
      createdAt: s.createdAt,
      authorName: s.isAnonymous
        ? (s.displayName || "Anonymous")
        : (profileName || s.displayName || "Job Pilot User"),
      hasLiked: userLikes.has(s.id),
      });
    });

    return { data: { stories, total: count || 0 }, error: null };
  } catch (err) {
    console.error("Error getting success stories:", err);
    return { data: null, error: "Failed to load stories" };
  }
}

// ===========================================================
// GET STORY BY ID (Detail)
// ===========================================================

export async function getStoryById(storyId: string): Promise<{
  data: SuccessStoryDetail | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: story, error } = await adminSupabase
      .from("success_stories")
      .select("*, user:users(profile:profiles(firstName,lastName))")
      .eq("id", storyId)
      .eq("isPublished", true)
      .single();

    if (error || !story) return { data: null, error: "Story not found" };

    // Increment view count (fire and forget)
    adminSupabase
      .from("success_stories")
      .update({ viewCount: (story.viewCount || 0) + 1 })
      .eq("id", storyId)
      .then(() => {});

    // Check if user has liked
    let hasLiked = false;
    if (user) {
      const { data: like } = await adminSupabase
        .from("success_story_likes")
        .select("id")
        .eq("storyId", storyId)
        .eq("userId", user.id)
        .single();
      hasLiked = !!like;
    }

    const profileRaw = (story as any).user?.profile;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const profileName = profile?.firstName
      ? `${profile.firstName} ${profile.lastName || ""}`.trim()
      : null;

    const detail: SuccessStoryDetail = {
      id: story.id,
      userId: story.userId,
      jobTitle: story.jobTitle,
      companyName: story.companyName,
      industry: story.industry,
      location: story.location,
      salaryRange: story.salaryRange,
      title: story.title,
      story: story.story,
      keyLearnings: Array.isArray(story.keyLearnings) ? story.keyLearnings : [],
      adviceForOthers: story.adviceForOthers,
      isAnonymous: story.isAnonymous,
      displayName: story.displayName,
      isFeatured: story.isFeatured,
      viewCount: story.viewCount,
      likeCount: story.likeCount,
      createdAt: story.createdAt,
      totalApplications: story.totalApplications,
      totalTrainingSessions: story.totalTrainingSessions,
      totalStudyTimeMinutes: story.totalStudyTimeMinutes,
      totalQuestionsPracticed: story.totalQuestionsPracticed,
      avgTrainingScore: story.avgTrainingScore,
      daysToOffer: story.daysToOffer,
      authorName: story.isAnonymous
        ? (story.displayName || "Anonymous")
        : (profileName || story.displayName || "Job Pilot User"),
      hasLiked,
    };

    return { data: detail, error: null };
  } catch (err) {
    console.error("Error getting story:", err);
    return { data: null, error: "Failed to load story" };
  }
}

// ===========================================================
// GET USER SUCCESS STATS (for auto-populating story form)
// ===========================================================

export async function getUserSuccessStats(): Promise<{
  data: SuccessStoryStats | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    // Total applications
    const { count: totalApplications } = await adminSupabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id);

    // Training sessions
    const { data: sessions } = await adminSupabase
      .from("training_sessions")
      .select("overallScore")
      .eq("userId", user.id)
      .eq("status", "COMPLETED");

    const totalTrainingSessions = sessions?.length || 0;
    const avgTrainingScore = totalTrainingSessions > 0
      ? Math.round((sessions || []).reduce((sum, s) => sum + (s.overallScore || 0), 0) / totalTrainingSessions)
      : 0;

    // Study time
    const { data: studyProgress } = await adminSupabase
      .from("user_study_progress")
      .select("timeSpentSeconds")
      .eq("userId", user.id);

    const totalStudyTimeMinutes = Math.round(
      ((studyProgress || []).reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0)) / 60
    );

    // Questions practiced (from training questions)
    const { count: totalQuestionsPracticed } = await adminSupabase
      .from("training_questions")
      .select("*", { count: "exact", head: true })
      .in("sessionId", (sessions || []).map((s: any) => s.id).filter(Boolean));

    // Days to offer - find first application and first offer
    const { data: firstApp } = await adminSupabase
      .from("job_applications")
      .select("createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();

    const { data: firstOffer } = await adminSupabase
      .from("job_applications")
      .select("updatedAt")
      .eq("userId", user.id)
      .in("status", ["OFFERED", "ACCEPTED"])
      .order("updatedAt", { ascending: true })
      .limit(1)
      .single();

    let daysToOffer: number | null = null;
    if (firstApp && firstOffer) {
      const start = new Date(firstApp.createdAt);
      const end = new Date(firstOffer.updatedAt);
      daysToOffer = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      data: {
        totalApplications: totalApplications || 0,
        totalTrainingSessions,
        totalStudyTimeMinutes,
        totalQuestionsPracticed: totalQuestionsPracticed || 0,
        avgTrainingScore,
        daysToOffer,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting user stats:", err);
    return { data: null, error: "Failed to load stats" };
  }
}

// ===========================================================
// SUBMIT SUCCESS STORY
// ===========================================================

export async function submitSuccessStory(input: SubmitStoryInput): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    // Get user stats to auto-populate
    const { data: stats } = await getUserSuccessStats();

    const { data, error } = await adminSupabase
      .from("success_stories")
      .insert({
        userId: user.id,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        industry: input.industry || null,
        location: input.location || null,
        salaryRange: input.salaryRange || null,
        title: input.title || null,
        story: input.story,
        keyLearnings: input.keyLearnings || [],
        adviceForOthers: input.adviceForOthers || null,
        isAnonymous: input.isAnonymous || false,
        displayName: input.displayName || null,
        isPublished: true, // Publish immediately for MVP
        totalApplications: stats?.totalApplications || null,
        totalTrainingSessions: stats?.totalTrainingSessions || null,
        totalStudyTimeMinutes: stats?.totalStudyTimeMinutes || null,
        totalQuestionsPracticed: stats?.totalQuestionsPracticed || null,
        avgTrainingScore: stats?.avgTrainingScore || null,
        daysToOffer: stats?.daysToOffer || null,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // Award XP for submitting success story
    await awardXP(user.id, "success_story_submitted", data.id);

    // Check achievements
    await triggerAchievementCheck(user.id, ["stories_submitted"]);

    return { data: { id: data.id }, error: null };
  } catch (err) {
    console.error("Error submitting story:", err);
    return { data: null, error: "Failed to submit story" };
  }
}

// ===========================================================
// LIKE / UNLIKE STORY
// ===========================================================

export async function likeStory(storyId: string): Promise<{
  data: { likeCount: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    // Check if already liked
    const { data: existing } = await adminSupabase
      .from("success_story_likes")
      .select("id")
      .eq("storyId", storyId)
      .eq("userId", user.id)
      .single();

    if (existing) {
      return { data: null, error: "Already liked" };
    }

    // Insert like
    const { error: likeError } = await adminSupabase
      .from("success_story_likes")
      .insert({ storyId, userId: user.id });

    if (likeError) return { data: null, error: likeError.message };

    // Increment like count
    const { data: story } = await adminSupabase
      .from("success_stories")
      .select("likeCount")
      .eq("id", storyId)
      .single();

    const newCount = (story?.likeCount || 0) + 1;

    await adminSupabase
      .from("success_stories")
      .update({ likeCount: newCount })
      .eq("id", storyId);

    return { data: { likeCount: newCount }, error: null };
  } catch (err) {
    console.error("Error liking story:", err);
    return { data: null, error: "Failed to like story" };
  }
}

export async function unlikeStory(storyId: string): Promise<{
  data: { likeCount: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    // Delete like
    const { error: deleteError } = await adminSupabase
      .from("success_story_likes")
      .delete()
      .eq("storyId", storyId)
      .eq("userId", user.id);

    if (deleteError) return { data: null, error: deleteError.message };

    // Decrement like count
    const { data: story } = await adminSupabase
      .from("success_stories")
      .select("likeCount")
      .eq("id", storyId)
      .single();

    const newCount = Math.max(0, (story?.likeCount || 0) - 1);

    await adminSupabase
      .from("success_stories")
      .update({ likeCount: newCount })
      .eq("id", storyId);

    return { data: { likeCount: newCount }, error: null };
  } catch (err) {
    console.error("Error unliking story:", err);
    return { data: null, error: "Failed to unlike story" };
  }
}

// ===========================================================
// GET USER'S OWN STORIES
// ===========================================================

export async function getMyStories(): Promise<{
  data: SuccessStorySummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("success_stories")
      .select("id, userId, jobTitle, companyName, industry, location, title, story, isAnonymous, displayName, isFeatured, viewCount, likeCount, createdAt, isPublished")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) return { data: null, error: error.message };

    const stories: SuccessStorySummary[] = (data || []).map((s: any) => ({
      id: s.id,
      userId: s.userId,
      jobTitle: s.jobTitle,
      companyName: s.companyName,
      industry: s.industry,
      location: s.location,
      title: s.title,
      story: s.story,
      isAnonymous: s.isAnonymous,
      displayName: s.displayName,
      isFeatured: s.isFeatured,
      viewCount: s.viewCount,
      likeCount: s.likeCount,
      createdAt: s.createdAt,
      authorName: "You",
      hasLiked: false,
    }));

    return { data: stories, error: null };
  } catch (err) {
    console.error("Error getting my stories:", err);
    return { data: null, error: "Failed to load your stories" };
  }
}

// ===========================================================
// GET INDUSTRIES (for filter dropdown)
// ===========================================================

export async function getStoryIndustries(): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await adminSupabase
      .from("success_stories")
      .select("industry")
      .eq("isPublished", true)
      .not("industry", "is", null);

    if (error) return { data: null, error: error.message };

    const industries = Array.from(new Set((data || []).map((d: any) => d.industry).filter(Boolean)));
    return { data: industries.sort(), error: null };
  } catch (err) {
    console.error("Error getting industries:", err);
    return { data: null, error: "Failed to load industries" };
  }
}
