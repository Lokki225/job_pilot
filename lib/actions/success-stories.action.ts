"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/services/gamification.service";
import { triggerAchievementCheck } from "@/lib/services/achievements.service";
import { emitEvent } from "@/lib/services/event-dispatcher";
import { AppEvent } from "@/lib/types/app-events";
import { awardReputationPoints } from "@/lib/actions/community.action";

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

export async function bookmarkStory(storyId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("success_story_bookmarks")
      .select("id")
      .eq("storyId", storyId)
      .eq("userId", user.id)
      .single();

    if (existing) return { data: null, error: "Already bookmarked" };

    const { error } = await adminSupabase
      .from("success_story_bookmarks")
      .insert({ storyId, userId: user.id });

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error bookmarking story:", err);
    return { data: null, error: "Failed to bookmark story" };
  }
}

export async function hideStory(storyId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("success_story_hides")
      .select("id")
      .eq("storyId", storyId)
      .eq("userId", user.id)
      .single();

    if (existing) return { data: null, error: "Already hidden" };

    const { error } = await adminSupabase
      .from("success_story_hides")
      .insert({ storyId, userId: user.id });

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error hiding story:", err);
    return { data: null, error: "Failed to hide story" };
  }
}

export async function unhideStory(storyId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("success_story_hides")
      .delete()
      .eq("storyId", storyId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unhiding story:", err);
    return { data: null, error: "Failed to unhide story" };
  }
}

export async function reportStory(storyId: string, reason: string, details?: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const trimmedReason = (reason || "").trim();
    if (!trimmedReason) return { data: null, error: "Please select a reason" };

    const trimmedDetails = (details || "").trim();
    if (trimmedDetails.length > 2000) return { data: null, error: "Details are too long" };

    const { data: existing } = await adminSupabase
      .from("success_story_reports")
      .select("id")
      .eq("storyId", storyId)
      .eq("reporterId", user.id)
      .single();

    if (existing) return { data: null, error: "You already reported this story" };

    const { error } = await adminSupabase
      .from("success_story_reports")
      .insert({
        storyId,
        reporterId: user.id,
        reason: trimmedReason,
        details: trimmedDetails || null,
        status: "OPEN",
      });

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error reporting story:", err);
    return { data: null, error: "Failed to submit report" };
  }
}

export async function unbookmarkStory(storyId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("success_story_bookmarks")
      .delete()
      .eq("storyId", storyId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unbookmarking story:", err);
    return { data: null, error: "Failed to remove bookmark" };
  }
}

export async function getBookmarkedStories(): Promise<{
  data: SuccessStorySummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: bookmarks, error: bookmarksError } = await adminSupabase
      .from("success_story_bookmarks")
      .select("storyId")
      .eq("userId", user.id);

    if (bookmarksError) return { data: null, error: bookmarksError.message };

    const storyIds = (bookmarks || []).map((b: any) => b.storyId);
    if (storyIds.length === 0) return { data: [], error: null };

    const { data, error } = await adminSupabase
      .from("success_stories")
      .select("id, userId, jobTitle, companyName, industry, location, title, story, tags, coverImageUrl, isAnonymous, displayName, isFeatured, viewCount, likeCount, createdAt, user:users(profile:profiles(firstName,lastName))")
      .eq("isPublished", true)
      .in("id", storyIds)
      .order("createdAt", { ascending: false });

    if (error) return { data: null, error: error.message };

    const { data: likes } = await adminSupabase
      .from("success_story_likes")
      .select("storyId")
      .eq("userId", user.id)
      .in("storyId", storyIds);
    const userLikes = new Set((likes || []).map((l: any) => l.storyId));

    const stories: SuccessStorySummary[] = (data || []).map((s: any) => {
      const profileRaw = s.user?.profile;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      const profileName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName || ""}`.trim()
        : null;

      return {
        id: s.id,
        userId: s.userId,
        jobTitle: s.jobTitle,
        companyName: s.companyName,
        industry: s.industry,
        location: s.location,
        title: s.title,
        story: s.story,
        tags: Array.isArray(s.tags) ? s.tags : [],
        coverImageUrl: s.coverImageUrl || null,
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
        hasBookmarked: true,
      };
    });

    return { data: stories, error: null };
  } catch (err) {
    console.error("Error getting bookmarked stories:", err);
    return { data: null, error: "Failed to load bookmarked stories" };
  }
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
  tags: string[];
  coverImageUrl?: string | null;
  // Computed
  authorName: string;
  hasLiked?: boolean;
  hasBookmarked?: boolean;
}

export interface SuccessStoryDetail extends SuccessStorySummary {
  salaryRange: string | null;
  keyLearnings: string[];
  adviceForOthers: string | null;
  coverImagePath?: string | null;
  totalApplications: number | null;
  totalTrainingSessions: number | null;
  totalStudyTimeMinutes: number | null;
  totalQuestionsPracticed: number | null;
  avgTrainingScore: number | null;
  daysToOffer: number | null;
}

export interface SuccessStoryComment {
  id: string;
  storyId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  likeCount: number;
  hasLiked: boolean;
  createdAt: string;
  authorName: string;
  isMine: boolean;
  replies: SuccessStoryComment[];
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
  tags?: string[];
  coverImageUrl?: string;
  coverImagePath?: string;
  isAnonymous?: boolean;
  displayName?: string;
}

// ===========================================================
// GET SUCCESS STORIES (Feed)
// ===========================================================

export async function getSuccessStories(params?: {
  industry?: string;
  featured?: boolean;
  query?: string;
  tag?: string;
  sort?: "newest" | "most_liked" | "most_viewed";
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

    let hiddenStoryIds: string[] = [];
    if (user) {
      const { data: hides, error: hidesError } = await adminSupabase
        .from("success_story_hides")
        .select("storyId")
        .eq("userId", user.id);
      if (!hidesError) {
        hiddenStoryIds = (hides || []).map((h: any) => h.storyId).filter(Boolean);
      }
    }

    let query = adminSupabase
      .from("success_stories")
      .select("id, userId, jobTitle, companyName, industry, location, title, story, tags, coverImageUrl, isAnonymous, displayName, isFeatured, viewCount, likeCount, createdAt, user:users(profile:profiles(firstName,lastName))", { count: "exact" })
      .eq("isPublished", true);

    if (hiddenStoryIds.length > 0) {
      const hiddenIn = `(${hiddenStoryIds.map((id) => `"${id}"`).join(",")})`;
      query = query.not("id", "in", hiddenIn);
    }

    if (params?.industry) {
      query = query.eq("industry", params.industry);
    }

    if (params?.featured) {
      query = query.eq("isFeatured", true);
    }

    if (params?.query?.trim()) {
      const q = params.query.trim();
      query = query.or(
        `title.ilike.%${q}%,story.ilike.%${q}%,companyName.ilike.%${q}%,jobTitle.ilike.%${q}%`
      );
    }

    if (params?.tag?.trim()) {
      query = query.contains("tags", [params.tag.trim()]);
    }

    const sort = params?.sort || "newest";
    if (sort === "most_liked") {
      query = query.order("likeCount", { ascending: false });
    } else if (sort === "most_viewed") {
      query = query.order("viewCount", { ascending: false });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return { data: null, error: error.message };

    // Check if current user has liked/bookmarked each story
    let userLikes: Set<string> = new Set();
    let userBookmarks: Set<string> = new Set();
    if (user) {
      const storyIds = (data || []).map((s: any) => s.id);
      if (storyIds.length > 0) {
        const { data: likes } = await adminSupabase
          .from("success_story_likes")
          .select("storyId")
          .eq("userId", user.id)
          .in("storyId", storyIds);
        userLikes = new Set((likes || []).map((l: any) => l.storyId));

        const { data: bookmarks } = await adminSupabase
          .from("success_story_bookmarks")
          .select("storyId")
          .eq("userId", user.id)
          .in("storyId", storyIds);
        userBookmarks = new Set((bookmarks || []).map((b: any) => b.storyId));
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
      tags: Array.isArray(s.tags) ? s.tags : [],
      coverImageUrl: s.coverImageUrl || null,
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
      hasBookmarked: userBookmarks.has(s.id),
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

    // Check if user has liked/bookmarked
    let hasLiked = false;
    let hasBookmarked = false;
    if (user) {
      const { data: like } = await adminSupabase
        .from("success_story_likes")
        .select("id")
        .eq("storyId", storyId)
        .eq("userId", user.id)
        .single();
      hasLiked = !!like;

      const { data: bookmark } = await adminSupabase
        .from("success_story_bookmarks")
        .select("id")
        .eq("storyId", storyId)
        .eq("userId", user.id)
        .single();
      hasBookmarked = !!bookmark;
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
      tags: Array.isArray((story as any).tags) ? (story as any).tags : [],
      coverImageUrl: (story as any).coverImageUrl || null,
      coverImagePath: (story as any).coverImagePath || null,
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
      hasBookmarked,
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

    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    ));

    const { count: publishedTodayCount, error: publishedCountError } = await adminSupabase
      .from("success_stories")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("isPublished", true)
      .gte("createdAt", startOfTodayUtc.toISOString());

    if (publishedCountError) return { data: null, error: publishedCountError.message };
    if ((publishedTodayCount || 0) >= 1) {
      return { data: null, error: "Daily publish limit reached (1 story/day). Try again tomorrow." };
    }

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
        tags: input.tags || [],
        coverImageUrl: input.coverImageUrl || null,
        coverImagePath: input.coverImagePath || null,
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

    await awardXP(user.id, "success_story_submitted", data.id);
    await triggerAchievementCheck(user.id, ["stories_submitted"]);
    await awardReputationPoints(user.id, "SHARE_SUCCESS_STORY");

    return { data: { id: data.id }, error: null };
  } catch (err) {
    console.error("Error submitting story:", err);
    return { data: null, error: "Failed to submit story" };
  }
}

export async function uploadSuccessStoryCoverImage(file: File): Promise<{
  data: { url: string; path: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    if (!file) return { data: null, error: "No file provided" };
    if (!file.type?.startsWith("image/")) return { data: null, error: "File must be an image" };

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) return { data: null, error: "Image is too large (max 5MB)" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = fileExt.replace(/[^a-z0-9]/g, "");
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt || "png"}`;
    const filePath = `covers/${user.id}/${fileName}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("success-stories")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) return { data: null, error: uploadError.message };

    const { data: { publicUrl } } = adminSupabase.storage
      .from("success-stories")
      .getPublicUrl(filePath);

    return { data: { url: publicUrl, path: filePath }, error: null };
  } catch (err) {
    console.error("Error uploading story cover:", err);
    return { data: null, error: "Failed to upload cover image" };
  }
}

export async function deleteSuccessStoryCoverImage(filePath: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const trimmedPath = (filePath || "").trim();
    if (!trimmedPath) return { data: null, error: "Invalid file path" };
    if (!trimmedPath.startsWith(`covers/${user.id}/`)) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase.storage
      .from("success-stories")
      .remove([trimmedPath]);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting story cover:", err);
    return { data: null, error: "Failed to delete cover image" };
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

    // Notify story author (if not liking own story)
    const { data: storyData } = await adminSupabase
      .from("success_stories")
      .select("userId, title, jobTitle")
      .eq("id", storyId)
      .single();

    if (storyData && storyData.userId !== user.id) {
      const { data: likerProfile } = await adminSupabase
        .from("profiles")
        .select("firstName,lastName")
        .eq("userId", user.id)
        .maybeSingle();

      const likerName = likerProfile
        ? [likerProfile.firstName, likerProfile.lastName].filter(Boolean).join(" ") || "Someone"
        : "Someone";

      const displayTitle = storyData.title || `${storyData.jobTitle} success story`;

      await emitEvent({
        event: AppEvent.STORY_LIKED,
        userId: storyData.userId,
        message: `${likerName} liked your success story "${displayTitle}"`,
        link: `/dashboard/community/${storyId}`,
        metadata: {
          storyId,
          storyTitle: displayTitle,
          likedByUserId: user.id,
        },
      });

      await awardReputationPoints(storyData.userId, "RECEIVE_LIKE");
    }

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
      .select("id, userId, jobTitle, companyName, industry, location, title, story, tags, coverImageUrl, isAnonymous, displayName, isFeatured, viewCount, likeCount, createdAt, isPublished")
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
      tags: Array.isArray(s.tags) ? s.tags : [],
      coverImageUrl: s.coverImageUrl || null,
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

export async function getStoryTags(): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await adminSupabase
      .from("success_stories")
      .select("tags")
      .eq("isPublished", true)
      .not("tags", "is", null);

    if (error) return { data: null, error: error.message };

    const tagSet = new Set<string>();
    for (const row of (data || []) as any[]) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const t of tags) {
        if (typeof t === "string" && t.trim()) tagSet.add(t.trim());
      }
    }

    return { data: Array.from(tagSet).sort((a, b) => a.localeCompare(b)), error: null };
  } catch (err) {
    console.error("Error getting tags:", err);
    return { data: null, error: "Failed to load tags" };
  }
}

export async function getStoryComments(storyId: string): Promise<{
  data: SuccessStoryComment[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("success_story_comments")
      .select("id, storyId, userId, parentId, content, likeCount, createdAt, user:users(profile:profiles(firstName,lastName))")
      .eq("storyId", storyId)
      .order("createdAt", { ascending: true });

    if (error) return { data: null, error: error.message };

    const commentIds = (data || []).map((c: any) => c.id);
    let userLikes: Set<string> = new Set();
    if (commentIds.length > 0) {
      const { data: likes, error: likesError } = await adminSupabase
        .from("success_story_comment_likes")
        .select("commentId")
        .eq("userId", user.id)
        .in("commentId", commentIds);
      if (!likesError) {
        userLikes = new Set((likes || []).map((l: any) => l.commentId));
      }
    }

    const byId: Record<string, SuccessStoryComment> = {};
    const roots: SuccessStoryComment[] = [];

    for (const c of (data || []) as any[]) {
      const profileRaw = c.user?.profile;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      const profileName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName || ""}`.trim()
        : null;

      byId[c.id] = {
        id: c.id,
        storyId: c.storyId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.content,
        createdAt: c.createdAt,
        authorName: profileName || "Job Pilot User",
        isMine: c.userId === user.id,
        likeCount: c.likeCount || 0,
        hasLiked: userLikes.has(c.id),
        replies: [],
      };

      if (!c.parentId) {
        roots.push(byId[c.id]);
      }
    }

    for (const id of Object.keys(byId)) {
      const comment = byId[id];
      if (comment.parentId && byId[comment.parentId]) {
        byId[comment.parentId].replies.push(comment);
      }
    }

    const sortTree = (items: SuccessStoryComment[]) => {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (const item of items) sortTree(item.replies);
    };

    sortTree(roots);

    return { data: roots, error: null };
  } catch (err) {
    console.error("Error getting story comments:", err);
    return { data: null, error: "Failed to load comments" };
  }
}

export async function addStoryComment(storyId: string, content: string, parentId?: string | null): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const trimmed = content.trim();
    if (!trimmed) return { data: null, error: "Comment cannot be empty" };
    if (trimmed.length > 2000) return { data: null, error: "Comment is too long" };

    if (parentId) {
      const { data: parent, error: parentError } = await adminSupabase
        .from("success_story_comments")
        .select("id, storyId")
        .eq("id", parentId)
        .single();
      if (parentError || !parent || parent.storyId !== storyId) {
        return { data: null, error: "Invalid parent comment" };
      }
    }

    const { data, error } = await adminSupabase
      .from("success_story_comments")
      .insert({
        storyId,
        userId: user.id,
        parentId: parentId || null,
        content: trimmed,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // Notify story author (if not commenting on own story)
    const { data: storyData } = await adminSupabase
      .from("success_stories")
      .select("userId, title, jobTitle")
      .eq("id", storyId)
      .single();

    if (storyData && storyData.userId !== user.id) {
      const { data: commenterProfile } = await adminSupabase
        .from("profiles")
        .select("firstName,lastName")
        .eq("userId", user.id)
        .maybeSingle();

      const commenterName = commenterProfile
        ? [commenterProfile.firstName, commenterProfile.lastName].filter(Boolean).join(" ") || "Someone"
        : "Someone";

      const displayTitle = storyData.title || `${storyData.jobTitle} success story`;
      const preview = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;

      await emitEvent({
        event: AppEvent.STORY_COMMENTED,
        userId: storyData.userId,
        message: `${commenterName} commented on your story "${displayTitle}": "${preview}"`,
        link: `/dashboard/community/${storyId}`,
        metadata: {
          storyId,
          storyTitle: displayTitle,
          commentId: data.id,
          commenterUserId: user.id,
          parentId: parentId || null,
        },
      });

      await awardReputationPoints(storyData.userId, "RECEIVE_COMMENT");
    }

    await awardReputationPoints(user.id, "COMMENT_POST");

    return { data: { id: data.id }, error: null };
  } catch (err) {
    console.error("Error adding story comment:", err);
    return { data: null, error: "Failed to add comment" };
  }
}

export async function deleteStoryComment(commentId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: comment, error: commentError } = await adminSupabase
      .from("success_story_comments")
      .select("id, userId")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) return { data: null, error: "Comment not found" };
    if (comment.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error: deleteError } = await adminSupabase
      .from("success_story_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) return { data: null, error: deleteError.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting story comment:", err);
    return { data: null, error: "Failed to delete comment" };
  }
}

export async function likeStoryComment(commentId: string): Promise<{
  data: { likeCount: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("success_story_comment_likes")
      .select("id")
      .eq("commentId", commentId)
      .eq("userId", user.id)
      .single();

    if (existing) return { data: null, error: "Already liked" };

    const { error: likeError } = await adminSupabase
      .from("success_story_comment_likes")
      .insert({ commentId, userId: user.id });

    if (likeError) return { data: null, error: likeError.message };

    const { data: comment } = await adminSupabase
      .from("success_story_comments")
      .select("likeCount, userId")
      .eq("id", commentId)
      .single();

    const newCount = (comment?.likeCount || 0) + 1;

    await adminSupabase
      .from("success_story_comments")
      .update({ likeCount: newCount })
      .eq("id", commentId);

    if (comment?.userId && comment.userId !== user.id) {
      await awardReputationPoints(comment.userId, "RECEIVE_LIKE");
    }

    return { data: { likeCount: newCount }, error: null };
  } catch (err) {
    console.error("Error liking comment:", err);
    return { data: null, error: "Failed to like comment" };
  }
}

export async function unlikeStoryComment(commentId: string): Promise<{
  data: { likeCount: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error: deleteError } = await adminSupabase
      .from("success_story_comment_likes")
      .delete()
      .eq("commentId", commentId)
      .eq("userId", user.id);

    if (deleteError) return { data: null, error: deleteError.message };

    const { data: comment } = await adminSupabase
      .from("success_story_comments")
      .select("likeCount")
      .eq("id", commentId)
      .single();

    const newCount = Math.max(0, (comment?.likeCount || 0) - 1);

    await adminSupabase
      .from("success_story_comments")
      .update({ likeCount: newCount })
      .eq("id", commentId);

    return { data: { likeCount: newCount }, error: null };
  } catch (err) {
    console.error("Error unliking comment:", err);
    return { data: null, error: "Failed to unlike comment" };
  }
}
