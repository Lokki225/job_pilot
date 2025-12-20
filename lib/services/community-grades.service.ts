import "server-only";

import { adminSupabase } from "@/lib/supabase/server";

export type CommunityGrade = "BRONZE" | "SILVER" | "GOLD";
export type CommunityGradeTrack = "MENTOR" | "RESOURCE_SHARER" | "MODERATOR";

export interface MentorGradeMetrics {
  completedMentorships: number;
}

export interface ResourceSharerGradeMetrics {
  resourcePosts: number;
  likes: number;
  bookmarks: number;
}

function gradeRank(grade: string): number {
  if (grade === "GOLD") return 3;
  if (grade === "SILVER") return 2;
  return 1;
}

function defaultThresholds(trackType: CommunityGradeTrack): { bronze: any; silver: any; gold: any } {
  if (trackType === "MENTOR") {
    return {
      bronze: { minCompletedMentorships: 0 },
      silver: { minCompletedMentorships: 5 },
      gold: { minCompletedMentorships: 20 },
    };
  }

  if (trackType === "RESOURCE_SHARER") {
    return {
      bronze: { minResourcePosts: 3, minLikes: 10, minBookmarks: 5 },
      silver: { minResourcePosts: 10, minLikes: 50, minBookmarks: 25 },
      gold: { minResourcePosts: 25, minLikes: 200, minBookmarks: 100 },
    };
  }

  return {
    bronze: {},
    silver: {},
    gold: {},
  };
}

export async function getGradeThresholds(trackType: CommunityGradeTrack): Promise<{
  bronze: any;
  silver: any;
  gold: any;
}> {
  const defaults = defaultThresholds(trackType);

  const { data, error } = await adminSupabase
    .from("community_grade_thresholds")
    .select("grade,criteria")
    .eq("trackType", trackType);

  if (error || !data || data.length === 0) return defaults;

  const byGrade = new Map((data || []).map((r: any) => [r.grade, r.criteria]));
  return {
    bronze: byGrade.get("BRONZE") || defaults.bronze,
    silver: byGrade.get("SILVER") || defaults.silver,
    gold: byGrade.get("GOLD") || defaults.gold,
  };
}

export async function computeMentorGrade(userId: string): Promise<{
  grade: CommunityGrade;
  metrics: MentorGradeMetrics;
}> {
  const { data: mentorProfile } = await adminSupabase
    .from("mentor_profiles")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  let completedMentorships = 0;
  if (mentorProfile?.id) {
    const { count } = await adminSupabase
      .from("mentorships")
      .select("id", { count: "exact", head: true })
      .eq("mentorId", mentorProfile.id)
      .eq("status", "COMPLETED");
    completedMentorships = typeof count === "number" ? count : 0;
  }
  const thresholds = await getGradeThresholds("MENTOR");

  const goldMin = Number((thresholds.gold as any)?.minCompletedMentorships ?? 20);
  const silverMin = Number((thresholds.silver as any)?.minCompletedMentorships ?? 5);

  const grade: CommunityGrade =
    completedMentorships >= goldMin ? "GOLD" : completedMentorships >= silverMin ? "SILVER" : "BRONZE";

  return { grade, metrics: { completedMentorships } };
}

export async function computeResourceSharerGrade(userId: string): Promise<{
  grade: CommunityGrade;
  metrics: ResourceSharerGradeMetrics;
}> {
  const { data: posts, error } = await adminSupabase
    .from("community_posts")
    .select("id,likesCount")
    .eq("userId", userId)
    .eq("type", "RESOURCE")
    .eq("moderationStatus", "APPROVED");

  if (error) throw new Error(error.message);

  const resourcePosts = posts?.length || 0;
  const likes = (posts || []).reduce((sum: number, p: any) => sum + (p.likesCount || 0), 0);

  const postIds = (posts || []).map((p: any) => p.id);
  let bookmarks = 0;
  if (postIds.length > 0) {
    const { count: bCount } = await adminSupabase
      .from("community_post_bookmarks")
      .select("id", { count: "exact", head: true })
      .in("postId", postIds);
    bookmarks = typeof bCount === "number" ? bCount : 0;
  }

  const thresholds = await getGradeThresholds("RESOURCE_SHARER");

  const gold = thresholds.gold as any;
  const silver = thresholds.silver as any;

  const goldReq = {
    minResourcePosts: Number(gold?.minResourcePosts ?? 25),
    minLikes: Number(gold?.minLikes ?? 200),
    minBookmarks: Number(gold?.minBookmarks ?? 100),
  };
  const silverReq = {
    minResourcePosts: Number(silver?.minResourcePosts ?? 10),
    minLikes: Number(silver?.minLikes ?? 50),
    minBookmarks: Number(silver?.minBookmarks ?? 25),
  };

  const meetsGold = resourcePosts >= goldReq.minResourcePosts && likes >= goldReq.minLikes && bookmarks >= goldReq.minBookmarks;
  const meetsSilver =
    resourcePosts >= silverReq.minResourcePosts && likes >= silverReq.minLikes && bookmarks >= silverReq.minBookmarks;

  const grade: CommunityGrade = meetsGold ? "GOLD" : meetsSilver ? "SILVER" : "BRONZE";

  return { grade, metrics: { resourcePosts, likes, bookmarks } };
}

export function pickHigherGrade(a: string | null | undefined, b: string | null | undefined): CommunityGrade {
  const ga = a || "BRONZE";
  const gb = b || "BRONZE";
  return gradeRank(ga) >= gradeRank(gb) ? (ga as CommunityGrade) : (gb as CommunityGrade);
}
