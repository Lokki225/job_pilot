"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/services/event-dispatcher";
import { AppEvent } from "@/lib/types/app-events";

// ===========================================================
// TYPES
// ===========================================================

export type CommunityPostType = "TIP" | "QUESTION" | "DISCUSSION" | "RESOURCE" | "ANNOUNCEMENT";

export interface CommunityPostSummary {
  id: string;
  userId: string;
  type: CommunityPostType;
  title: string | null;
  content: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  hasLiked: boolean;
  hasBookmarked: boolean;
}

export interface CommunityPostDetail extends CommunityPostSummary {
  attachments: any[];
  isHighlighted: boolean;
  sharesCount: number;
  comments: PostComment[];
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  isEdited: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  hasLiked: boolean;
  isMine: boolean;
  replies: PostComment[];
}

export interface CreatePostInput {
  type: CommunityPostType;
  title?: string;
  content: string;
  tags?: string[];
  attachments?: any[];
}

export interface CommunityProfileData {
  id: string;
  userId: string;
  reputationPoints: number;
  level: number;
  postsCount: number;
  commentsCount: number;
  helpfulVotes: number;
  successStoriesShared: number;
  isModerator: boolean;
  isExpert: boolean;
  isMentor: boolean;
  badges: { badgeType: string; earnedAt: string }[];
  bio: string | null;
  favoriteTopics: string[];
  user: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export interface ChatRoomSummary {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  type: "PUBLIC" | "PREMIUM" | "ROLE_SPECIFIC";
  category: string | null;
  icon: string | null;
  memberCount: number;
  isActive: boolean;
  isMember: boolean;
  unreadCount: number;
}

export interface ChatMessageData {
  id: string;
  roomId: string;
  userId: string;
  replyToId: string | null;
  content: string;
  attachments: any[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  isMine: boolean;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  replyTo: { id: string; content: string; authorName: string } | null;
}

// ===========================================================
// COMMUNITY PROFILE
// ===========================================================

export async function getOrCreateCommunityProfile(): Promise<{
  data: CommunityProfileData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("community_profiles")
      .select("*, badges:community_badges(*)")
      .eq("userId", user.id)
      .single();

    if (existing) {
      if (existing.isMentor) {
        const hasMentorBadge = (existing.badges || []).some((b: any) => b.badgeType === "MENTOR");
        if (!hasMentorBadge) {
          const { data: newBadge } = await adminSupabase
            .from("community_badges")
            .upsert(
              { communityProfileId: existing.id, badgeType: "MENTOR" },
              { onConflict: "communityProfileId,badgeType" }
            )
            .select("badgeType, earnedAt")
            .single();

          if (newBadge) {
            existing.badges = [...(existing.badges || []), newBadge];
          }
        }
      }

      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("firstName, lastName, avatarUrl")
        .eq("userId", user.id)
        .single();

      return {
        data: {
          ...existing,
          favoriteTopics: Array.isArray(existing.favoriteTopics) ? existing.favoriteTopics : [],
          badges: (existing.badges || []).map((b: any) => ({
            badgeType: b.badgeType,
            earnedAt: b.earnedAt,
          })),
          user: {
            firstName: profile?.firstName || null,
            lastName: profile?.lastName || null,
            avatarUrl: profile?.avatarUrl || null,
          },
        },
        error: null,
      };
    }

    const { data: newProfile, error: createError } = await adminSupabase
      .from("community_profiles")
      .insert({ userId: user.id })
      .select("*")
      .single();

    if (createError) return { data: null, error: createError.message };

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("firstName, lastName, avatarUrl")
      .eq("userId", user.id)
      .single();

    return {
      data: {
        ...newProfile,
        favoriteTopics: [],
        badges: [],
        user: {
          firstName: profile?.firstName || null,
          lastName: profile?.lastName || null,
          avatarUrl: profile?.avatarUrl || null,
        },
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting community profile:", err);
    return { data: null, error: "Failed to get community profile" };
  }
}

export async function updateCommunityProfile(input: {
  bio?: string;
  favoriteTopics?: string[];
}): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_profiles")
      .update({
        bio: input.bio,
        favoriteTopics: input.favoriteTopics,
        lastActiveAt: new Date().toISOString(),
      })
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating community profile:", err);
    return { data: null, error: "Failed to update profile" };
  }
}

// ===========================================================
// COMMUNITY POSTS
// ===========================================================

export async function getCommunityPosts(options?: {
  type?: CommunityPostType;
  search?: string;
  tag?: string;
  sort?: "recent" | "popular" | "trending";
  limit?: number;
  offset?: number;
}): Promise<{ data: CommunityPostSummary[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = adminSupabase
      .from("community_posts")
      .select("id, userId, type, title, content, tags, likesCount, commentsCount, viewsCount, isPinned, isFeatured, createdAt")
      .eq("moderationStatus", "APPROVED")
      .order("isPinned", { ascending: false });

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.search) {
      query = query.or(`title.ilike.%${options.search}%,content.ilike.%${options.search}%`);
    }

    if (options?.sort === "popular") {
      query = query.order("likesCount", { ascending: false });
    } else if (options?.sort === "trending") {
      query = query.order("viewsCount", { ascending: false });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error } = await query;
    if (error) return { data: null, error: error.message };
    if (!posts || posts.length === 0) return { data: [], error: null };

    const userIds = [...new Set(posts.map((p: any) => p.userId))];
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    let userLikes: Set<string> = new Set();
    let userBookmarks: Set<string> = new Set();

    if (user) {
      const postIds = posts.map((p: any) => p.id);
      const [likesRes, bookmarksRes] = await Promise.all([
        adminSupabase
          .from("community_post_likes")
          .select("postId")
          .eq("userId", user.id)
          .in("postId", postIds),
        adminSupabase
          .from("community_post_bookmarks")
          .select("postId")
          .eq("userId", user.id)
          .in("postId", postIds),
      ]);
      userLikes = new Set((likesRes.data || []).map((l: any) => l.postId));
      userBookmarks = new Set((bookmarksRes.data || []).map((b: any) => b.postId));
    }

    const result: CommunityPostSummary[] = posts.map((p: any) => {
      const profile = profileMap.get(p.userId);
      return {
        id: p.id,
        userId: p.userId,
        type: p.type,
        title: p.title,
        content: p.content,
        tags: Array.isArray(p.tags) ? p.tags : [],
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        viewsCount: p.viewsCount,
        isPinned: p.isPinned,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        authorName: profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
        authorAvatar: profile?.avatarUrl || null,
        hasLiked: userLikes.has(p.id),
        hasBookmarked: userBookmarks.has(p.id),
      };
    });

    if (options?.tag) {
      return {
        data: result.filter((p) => p.tags.includes(options.tag!)),
        error: null,
      };
    }

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting community posts:", err);
    return { data: null, error: "Failed to get posts" };
  }
}

export async function getPostById(postId: string): Promise<{
  data: CommunityPostDetail | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: post, error } = await adminSupabase
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) return { data: null, error: error?.message || "Post not found" };

    await adminSupabase
      .from("community_posts")
      .update({ viewsCount: (post.viewsCount || 0) + 1 })
      .eq("id", postId);

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("firstName, lastName, avatarUrl")
      .eq("userId", post.userId)
      .single();

    let hasLiked = false;
    let hasBookmarked = false;
    if (user) {
      const [likeRes, bookmarkRes] = await Promise.all([
        adminSupabase
          .from("community_post_likes")
          .select("id")
          .eq("postId", postId)
          .eq("userId", user.id)
          .maybeSingle(),
        adminSupabase
          .from("community_post_bookmarks")
          .select("id")
          .eq("postId", postId)
          .eq("userId", user.id)
          .maybeSingle(),
      ]);
      hasLiked = !!likeRes.data;
      hasBookmarked = !!bookmarkRes.data;
    }

    const { data: comments } = await adminSupabase
      .from("community_post_comments")
      .select("*")
      .eq("postId", postId)
      .eq("isDeleted", false)
      .order("createdAt", { ascending: true });

    const commentUserIds = [...new Set((comments || []).map((c: any) => c.userId))];
    const { data: commentProfiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", commentUserIds.length > 0 ? commentUserIds : ["00000000-0000-0000-0000-000000000000"]);

    const commentProfileMap = new Map((commentProfiles || []).map((p: any) => [p.userId, p]));

    let userCommentLikes: Set<string> = new Set();
    if (user && comments && comments.length > 0) {
      const commentIds = comments.map((c: any) => c.id);
      const { data: likes } = await adminSupabase
        .from("community_post_comment_likes")
        .select("commentId")
        .eq("userId", user.id)
        .in("commentId", commentIds);
      userCommentLikes = new Set((likes || []).map((l: any) => l.commentId));
    }

    const buildCommentTree = (parentId: string | null): PostComment[] => {
      return (comments || [])
        .filter((c: any) => c.parentId === parentId)
        .map((c: any) => {
          const cp = commentProfileMap.get(c.userId);
          return {
            id: c.id,
            postId: c.postId,
            userId: c.userId,
            parentId: c.parentId,
            content: c.content,
            likesCount: c.likesCount,
            isEdited: c.isEdited,
            createdAt: c.createdAt,
            authorName: cp ? `${cp.firstName || ""} ${cp.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
            authorAvatar: cp?.avatarUrl || null,
            hasLiked: userCommentLikes.has(c.id),
            isMine: user?.id === c.userId,
            replies: buildCommentTree(c.id),
          };
        });
    };

    return {
      data: {
        id: post.id,
        userId: post.userId,
        type: post.type,
        title: post.title,
        content: post.content,
        tags: Array.isArray(post.tags) ? post.tags : [],
        attachments: Array.isArray(post.attachments) ? post.attachments : [],
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        viewsCount: post.viewsCount + 1,
        sharesCount: post.sharesCount,
        isPinned: post.isPinned,
        isFeatured: post.isFeatured,
        isHighlighted: post.isHighlighted,
        createdAt: post.createdAt,
        authorName: profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
        authorAvatar: profile?.avatarUrl || null,
        hasLiked,
        hasBookmarked,
        comments: buildCommentTree(null),
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting post:", err);
    return { data: null, error: "Failed to get post" };
  }
}

export async function createPost(input: CreatePostInput): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    if (!input.content?.trim()) return { data: null, error: "Content is required" };

    const { data: post, error } = await adminSupabase
      .from("community_posts")
      .insert({
        userId: user.id,
        type: input.type || "DISCUSSION",
        title: input.title?.trim() || null,
        content: input.content.trim(),
        tags: input.tags || [],
        attachments: input.attachments || [],
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    await adminSupabase.rpc("increment_profile_posts", { user_id: user.id });

    return { data: { id: post.id }, error: null };
  } catch (err) {
    console.error("Error creating post:", err);
    return { data: null, error: "Failed to create post" };
  }
}

export async function updatePost(
  postId: string,
  input: { title?: string; content?: string; tags?: string[] }
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: post } = await adminSupabase
      .from("community_posts")
      .select("userId")
      .eq("id", postId)
      .single();

    if (!post) return { data: null, error: "Post not found" };
    if (post.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase
      .from("community_posts")
      .update({
        title: input.title?.trim(),
        content: input.content?.trim(),
        tags: input.tags,
      })
      .eq("id", postId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating post:", err);
    return { data: null, error: "Failed to update post" };
  }
}

export async function deletePost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: post } = await adminSupabase
      .from("community_posts")
      .select("userId")
      .eq("id", postId)
      .single();

    if (!post) return { data: null, error: "Post not found" };
    if (post.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting post:", err);
    return { data: null, error: "Failed to delete post" };
  }
}

// ===========================================================
// POST LIKES
// ===========================================================

export async function likePost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_likes")
      .insert({ postId, userId: user.id });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    await adminSupabase.rpc("increment_post_likes", { post_id: postId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error liking post:", err);
    return { data: null, error: "Failed to like post" };
  }
}

export async function unlikePost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_likes")
      .delete()
      .eq("postId", postId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };

    await adminSupabase.rpc("decrement_post_likes", { post_id: postId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unliking post:", err);
    return { data: null, error: "Failed to unlike post" };
  }
}

// ===========================================================
// POST BOOKMARKS
// ===========================================================

export async function bookmarkPost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_bookmarks")
      .insert({ postId, userId: user.id });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error bookmarking post:", err);
    return { data: null, error: "Failed to bookmark post" };
  }
}

export async function unbookmarkPost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_bookmarks")
      .delete()
      .eq("postId", postId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unbookmarking post:", err);
    return { data: null, error: "Failed to unbookmark post" };
  }
}

export async function getBookmarkedPosts(): Promise<{
  data: CommunityPostSummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: bookmarks } = await adminSupabase
      .from("community_post_bookmarks")
      .select("postId")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (!bookmarks || bookmarks.length === 0) return { data: [], error: null };

    const postIds = bookmarks.map((b: any) => b.postId);
    const { data: posts, error } = await adminSupabase
      .from("community_posts")
      .select("id, userId, type, title, content, tags, likesCount, commentsCount, viewsCount, isPinned, isFeatured, createdAt")
      .in("id", postIds);

    if (error) return { data: null, error: error.message };

    const userIds = [...new Set((posts || []).map((p: any) => p.userId))];
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    const { data: userLikesData } = await adminSupabase
      .from("community_post_likes")
      .select("postId")
      .eq("userId", user.id)
      .in("postId", postIds);

    const userLikes = new Set((userLikesData || []).map((l: any) => l.postId));

    const result: CommunityPostSummary[] = (posts || []).map((p: any) => {
      const profile = profileMap.get(p.userId);
      return {
        id: p.id,
        userId: p.userId,
        type: p.type,
        title: p.title,
        content: p.content,
        tags: Array.isArray(p.tags) ? p.tags : [],
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        viewsCount: p.viewsCount,
        isPinned: p.isPinned,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        authorName: profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
        authorAvatar: profile?.avatarUrl || null,
        hasLiked: userLikes.has(p.id),
        hasBookmarked: true,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting bookmarked posts:", err);
    return { data: null, error: "Failed to get bookmarked posts" };
  }
}

// ===========================================================
// POST COMMENTS
// ===========================================================

export async function addPostComment(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    if (!content?.trim()) return { data: null, error: "Content is required" };

    const { data: comment, error } = await adminSupabase
      .from("community_post_comments")
      .insert({
        postId,
        userId: user.id,
        parentId: parentId || null,
        content: content.trim(),
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    await adminSupabase.rpc("increment_post_comments", { post_id: postId });

    return { data: { id: comment.id }, error: null };
  } catch (err) {
    console.error("Error adding comment:", err);
    return { data: null, error: "Failed to add comment" };
  }
}

export async function deletePostComment(commentId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: comment } = await adminSupabase
      .from("community_post_comments")
      .select("userId, postId")
      .eq("id", commentId)
      .single();

    if (!comment) return { data: null, error: "Comment not found" };
    if (comment.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase
      .from("community_post_comments")
      .update({ isDeleted: true, content: "[deleted]" })
      .eq("id", commentId);

    if (error) return { data: null, error: error.message };

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting comment:", err);
    return { data: null, error: "Failed to delete comment" };
  }
}

export async function likePostComment(commentId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_comment_likes")
      .insert({ commentId, userId: user.id });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    await adminSupabase.rpc("increment_comment_likes", { comment_id: commentId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error liking comment:", err);
    return { data: null, error: "Failed to like comment" };
  }
}

export async function unlikePostComment(commentId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_comment_likes")
      .delete()
      .eq("commentId", commentId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };

    await adminSupabase.rpc("decrement_comment_likes", { comment_id: commentId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unliking comment:", err);
    return { data: null, error: "Failed to unlike comment" };
  }
}

// ===========================================================
// CHAT ROOMS
// ===========================================================

export async function getChatRooms(): Promise<{
  data: ChatRoomSummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: rooms, error } = await adminSupabase
      .from("chat_rooms")
      .select("*")
      .eq("isActive", true)
      .eq("isArchived", false)
      .order("memberCount", { ascending: false });

    if (error) return { data: null, error: error.message };

    const roomIds = (rooms || []).map((r: any) => r.id);
    const { data: memberRows } = await adminSupabase
      .from("chat_room_members")
      .select("roomId")
      .in(
        "roomId",
        roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"]
      );

    const memberCountMap = new Map<string, number>();
    (memberRows || []).forEach((m: any) => {
      memberCountMap.set(m.roomId, (memberCountMap.get(m.roomId) || 0) + 1);
    });

    let userMemberships: Map<string, { lastReadAt: string | null }> = new Map();
    if (user) {
      const { data: memberships } = await adminSupabase
        .from("chat_room_members")
        .select("roomId, lastReadAt")
        .eq("userId", user.id);

      userMemberships = new Map((memberships || []).map((m: any) => [m.roomId, m]));
    }

    const result: ChatRoomSummary[] = (rooms || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      slug: r.slug,
      type: r.type,
      category: r.category,
      icon: r.icon,
      memberCount: memberCountMap.get(r.id) ?? r.memberCount ?? 0,
      isActive: r.isActive,
      isMember: userMemberships.has(r.id),
      unreadCount: 0,
    }));

    result.sort((a, b) => b.memberCount - a.memberCount);

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting chat rooms:", err);
    return { data: null, error: "Failed to get chat rooms" };
  }
}

export async function getChatRoomBySlug(slug: string): Promise<{
  data: ChatRoomSummary | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: room, error } = await adminSupabase
      .from("chat_rooms")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !room) return { data: null, error: error?.message || "Room not found" };

    let isMember = false;
    if (user) {
      const { data: membership } = await adminSupabase
        .from("chat_room_members")
        .select("id")
        .eq("roomId", room.id)
        .eq("userId", user.id)
        .maybeSingle();

      isMember = !!membership;
    }

    const { count: memberCount } = await adminSupabase
      .from("chat_room_members")
      .select("*", { count: "exact", head: true })
      .eq("roomId", room.id);

    const effectiveMemberCount = typeof memberCount === "number" ? memberCount : room.memberCount;

    return {
      data: {
        id: room.id,
        name: room.name,
        description: room.description,
        slug: room.slug,
        type: room.type,
        category: room.category,
        icon: room.icon,
        memberCount: effectiveMemberCount,
        isActive: room.isActive,
        isMember,
        unreadCount: 0,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting chat room:", err);
    return { data: null, error: "Failed to get chat room" };
  }
}

export async function joinChatRoom(roomId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("chat_room_members")
      .insert({ roomId, userId: user.id });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    await adminSupabase.rpc("increment_room_members", { room_id: roomId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error joining chat room:", err);
    return { data: null, error: "Failed to join chat room" };
  }
}

export async function leaveChatRoom(roomId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("chat_room_members")
      .delete()
      .eq("roomId", roomId)
      .eq("userId", user.id);

    if (error) return { data: null, error: error.message };

    await adminSupabase.rpc("decrement_room_members", { room_id: roomId });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error leaving chat room:", err);
    return { data: null, error: "Failed to leave chat room" };
  }
}

// ===========================================================
// CHAT MESSAGES
// ===========================================================

export async function getChatMessages(
  roomId: string,
  options?: { limit?: number; before?: string }
): Promise<{ data: ChatMessageData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = adminSupabase
      .from("chat_messages")
      .select("*")
      .eq("roomId", roomId)
      .eq("isDeleted", false)
      .order("createdAt", { ascending: false })
      .limit(options?.limit || 50);

    if (options?.before) {
      query = query.lt("createdAt", options.before);
    }

    const { data: messages, error } = await query;
    if (error) return { data: null, error: error.message };

    const userIds = [...new Set((messages || []).map((m: any) => m.userId))];
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    const messageIds = (messages || []).map((m: any) => m.id);
    const { data: reactions } = await adminSupabase
      .from("chat_message_reactions")
      .select("messageId, emoji, userId")
      .in("messageId", messageIds.length > 0 ? messageIds : ["00000000-0000-0000-0000-000000000000"]);

    const reactionMap = new Map<string, { emoji: string; count: number; users: string[] }[]>();
    (reactions || []).forEach((r: any) => {
      const existing = reactionMap.get(r.messageId) || [];
      const emojiEntry = existing.find((e) => e.emoji === r.emoji);
      if (emojiEntry) {
        emojiEntry.count++;
        emojiEntry.users.push(r.userId);
      } else {
        existing.push({ emoji: r.emoji, count: 1, users: [r.userId] });
      }
      reactionMap.set(r.messageId, existing);
    });

    const replyToIds = (messages || []).filter((m: any) => m.replyToId).map((m: any) => m.replyToId);
    let replyToMap = new Map<string, { id: string; content: string; userId: string }>();
    if (replyToIds.length > 0) {
      const { data: replyMessages } = await adminSupabase
        .from("chat_messages")
        .select("id, content, userId")
        .in("id", replyToIds);

      replyToMap = new Map((replyMessages || []).map((m: any) => [m.id, m]));
    }

    const result: ChatMessageData[] = (messages || []).reverse().map((m: any) => {
      const profile = profileMap.get(m.userId);
      const msgReactions = reactionMap.get(m.id) || [];
      const replyTo = m.replyToId ? replyToMap.get(m.replyToId) : null;
      const replyProfile = replyTo ? profileMap.get(replyTo.userId) : null;

      return {
        id: m.id,
        roomId: m.roomId,
        userId: m.userId,
        replyToId: m.replyToId,
        content: m.content,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        isPinned: m.isPinned,
        createdAt: m.createdAt,
        authorName: profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
        authorAvatar: profile?.avatarUrl || null,
        isMine: user?.id === m.userId,
        reactions: msgReactions.map((r) => ({
          emoji: r.emoji,
          count: r.count,
          hasReacted: user ? r.users.includes(user.id) : false,
        })),
        replyTo: replyTo
          ? {
              id: replyTo.id,
              content: replyTo.content.substring(0, 100),
              authorName: replyProfile
                ? `${replyProfile.firstName || ""} ${replyProfile.lastName || ""}`.trim() || "Anonymous"
                : "Anonymous",
            }
          : null,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting chat messages:", err);
    return { data: null, error: "Failed to get messages" };
  }
}

export async function sendChatMessage(
  roomId: string,
  content: string,
  replyToId?: string | null
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    if (!content?.trim()) return { data: null, error: "Content is required" };

    const trimmed = content.trim();

    const { data: message, error } = await adminSupabase
      .from("chat_messages")
      .insert({
        roomId,
        userId: user.id,
        content: trimmed,
        replyToId: replyToId || null,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // Notify only for replies (avoid spamming members for every chat message)
    if (replyToId) {
      const { data: repliedTo } = await adminSupabase
        .from("chat_messages")
        .select("id,userId,roomId")
        .eq("id", replyToId)
        .maybeSingle();

      if (repliedTo && repliedTo.roomId === roomId && repliedTo.userId !== user.id) {
        const { data: room } = await adminSupabase
          .from("chat_rooms")
          .select("slug,name")
          .eq("id", roomId)
          .maybeSingle();

        const { data: senderProfile } = await adminSupabase
          .from("profiles")
          .select("firstName,lastName")
          .eq("userId", user.id)
          .maybeSingle();

        const senderName = senderProfile
          ? [senderProfile.firstName, senderProfile.lastName].filter(Boolean).join(" ") || "Someone"
          : "Someone";

        const roomName = room?.name || "a chat room";
        const preview = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
        const link = room?.slug ? `/dashboard/community/hub/chat/${room.slug}` : "/dashboard/community/hub";

        await emitEvent({
          event: AppEvent.CHAT_REPLY_RECEIVED,
          userId: repliedTo.userId,
          message: `${senderName} replied to you in ${roomName}: "${preview}"`,
          link,
          metadata: {
            roomId,
            roomSlug: room?.slug || null,
            messageId: message.id,
            replyToId,
            senderUserId: user.id,
          },
        });
      }
    }

    return { data: { id: message.id }, error: null };
  } catch (err) {
    console.error("Error sending message:", err);
    return { data: null, error: "Failed to send message" };
  }
}

export async function editChatMessage(
  messageId: string,
  content: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: message } = await adminSupabase
      .from("chat_messages")
      .select("userId")
      .eq("id", messageId)
      .single();

    if (!message) return { data: null, error: "Message not found" };
    if (message.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase
      .from("chat_messages")
      .update({ content: content.trim(), isEdited: true })
      .eq("id", messageId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error editing message:", err);
    return { data: null, error: "Failed to edit message" };
  }
}

export async function deleteChatMessage(messageId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: message } = await adminSupabase
      .from("chat_messages")
      .select("userId")
      .eq("id", messageId)
      .single();

    if (!message) return { data: null, error: "Message not found" };
    if (message.userId !== user.id) return { data: null, error: "Forbidden" };

    const { error } = await adminSupabase
      .from("chat_messages")
      .update({ isDeleted: true, content: "[deleted]" })
      .eq("id", messageId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting message:", err);
    return { data: null, error: "Failed to delete message" };
  }
}

export async function addMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("chat_message_reactions")
      .insert({ messageId, userId: user.id, emoji });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    // Notify message author (avoid notifying on self-reaction)
    const { data: msg } = await adminSupabase
      .from("chat_messages")
      .select("id,userId,roomId")
      .eq("id", messageId)
      .maybeSingle();

    if (msg && msg.userId !== user.id) {
      const { data: room } = await adminSupabase
        .from("chat_rooms")
        .select("slug,name")
        .eq("id", msg.roomId)
        .maybeSingle();

      const { data: reactorProfile } = await adminSupabase
        .from("profiles")
        .select("firstName,lastName")
        .eq("userId", user.id)
        .maybeSingle();

      const reactorName = reactorProfile
        ? [reactorProfile.firstName, reactorProfile.lastName].filter(Boolean).join(" ") || "Someone"
        : "Someone";

      const roomName = room?.name || "a chat room";
      const link = room?.slug ? `/dashboard/community/hub/chat/${room.slug}` : "/dashboard/community/hub";

      await emitEvent({
        event: AppEvent.CHAT_REACTION_RECEIVED,
        userId: msg.userId,
        message: `${reactorName} reacted ${emoji} to your message in ${roomName}.`,
        link,
        metadata: {
          roomId: msg.roomId,
          roomSlug: room?.slug || null,
          messageId,
          emoji,
          reactorUserId: user.id,
        },
      });
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error adding reaction:", err);
    return { data: null, error: "Failed to add reaction" };
  }
}

export async function removeMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("chat_message_reactions")
      .delete()
      .eq("messageId", messageId)
      .eq("userId", user.id)
      .eq("emoji", emoji);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error removing reaction:", err);
    return { data: null, error: "Failed to remove reaction" };
  }
}

// ===========================================================
// USER FOLLOWS
// ===========================================================

export async function followUser(userId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };
    if (user.id === userId) return { data: null, error: "Cannot follow yourself" };

    const { error } = await adminSupabase
      .from("user_follows")
      .insert({ followerId: user.id, followingId: userId });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    const { data: followerProfile } = await adminSupabase
      .from("profiles")
      .select("firstName,lastName")
      .eq("userId", user.id)
      .maybeSingle();

    const followerName = followerProfile
      ? [followerProfile.firstName, followerProfile.lastName].filter(Boolean).join(" ") || "Someone"
      : "Someone";

    await emitEvent({
      event: AppEvent.FOLLOWER_NEW,
      userId,
      message: `${followerName} started following you.`,
      link: "/dashboard/community",
      metadata: {
        followerId: user.id,
        followingId: userId,
      },
    });

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error following user:", err);
    return { data: null, error: "Failed to follow user" };
  }
}

export async function unfollowUser(userId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("user_follows")
      .delete()
      .eq("followerId", user.id)
      .eq("followingId", userId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error unfollowing user:", err);
    return { data: null, error: "Failed to unfollow user" };
  }
}

export async function getFollowers(userId: string): Promise<{
  data: { id: string; name: string; avatarUrl: string | null }[] | null;
  error: string | null;
}> {
  try {
    const { data: follows, error } = await adminSupabase
      .from("user_follows")
      .select("followerId")
      .eq("followingId", userId);

    if (error) return { data: null, error: error.message };

    const followerIds = (follows || []).map((f: any) => f.followerId);
    if (followerIds.length === 0) return { data: [], error: null };

    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", followerIds);

    const result = (profiles || []).map((p: any) => ({
      id: p.userId,
      name: `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Anonymous",
      avatarUrl: p.avatarUrl,
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting followers:", err);
    return { data: null, error: "Failed to get followers" };
  }
}

export async function getFollowing(userId: string): Promise<{
  data: { id: string; name: string; avatarUrl: string | null }[] | null;
  error: string | null;
}> {
  try {
    const { data: follows, error } = await adminSupabase
      .from("user_follows")
      .select("followingId")
      .eq("followerId", userId);

    if (error) return { data: null, error: error.message };

    const followingIds = (follows || []).map((f: any) => f.followingId);
    if (followingIds.length === 0) return { data: [], error: null };

    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", followingIds);

    const result = (profiles || []).map((p: any) => ({
      id: p.userId,
      name: `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Anonymous",
      avatarUrl: p.avatarUrl,
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting following:", err);
    return { data: null, error: "Failed to get following" };
  }
}

// ===========================================================
// POST REPORTS
// ===========================================================

export async function reportPost(
  postId: string,
  reason: string,
  details?: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_post_reports")
      .insert({
        postId,
        reporterId: user.id,
        reason,
        details: details || null,
      });

    if (error) {
      if (error.code === "23505") return { data: { success: true }, error: null };
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error reporting post:", err);
    return { data: null, error: "Failed to report post" };
  }
}

// ===========================================================
// SEED DEFAULT CHAT ROOMS
// ===========================================================

export async function seedDefaultChatRooms(): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const defaultRooms = [
      { name: "General Discussion", slug: "general", description: "General job hunting discussions", category: "general", icon: "💬" },
      { name: "Interview Tips", slug: "interview-tips", description: "Share and learn interview strategies", category: "tips", icon: "🎯" },
      { name: "Resume Review", slug: "resume-review", description: "Get feedback on your resume", category: "tips", icon: "📄" },
      { name: "Tech Jobs", slug: "tech-jobs", description: "Discussions for tech industry job seekers", category: "industry", icon: "💻" },
      { name: "Remote Work", slug: "remote-work", description: "Tips and discussions about remote opportunities", category: "work-style", icon: "🏠" },
      { name: "Salary Negotiation", slug: "salary-negotiation", description: "Learn how to negotiate your worth", category: "tips", icon: "💰" },
      { name: "Career Change", slug: "career-change", description: "Support for those switching careers", category: "support", icon: "🔄" },
      { name: "Success Stories", slug: "success-stories", description: "Celebrate wins and inspire others", category: "community", icon: "🎉" },
    ];

    for (const room of defaultRooms) {
      const { data: existing } = await adminSupabase
        .from("chat_rooms")
        .select("id")
        .eq("slug", room.slug)
        .maybeSingle();

      if (!existing) {
        await adminSupabase.from("chat_rooms").insert(room);
      }
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error seeding chat rooms:", err);
    return { data: null, error: "Failed to seed chat rooms" };
  }
}

// ===========================================================
// GAMIFICATION - LEADERBOARD
// ===========================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  reputationPoints: number;
  level: number;
  postsCount: number;
  helpfulVotes: number;
  badges: string[];
}

export async function getCommunityLeaderboard(options?: {
  limit?: number;
  timeframe?: "all" | "week" | "month";
}): Promise<{ data: LeaderboardEntry[] | null; error: string | null }> {
  try {
    const limit = options?.limit || 50;

    const { data: profiles, error } = await adminSupabase
      .from("community_profiles")
      .select("userId, reputationPoints, level, postsCount, helpfulVotes")
      .eq("isBanned", false)
      .order("reputationPoints", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    if (!profiles || profiles.length === 0) return { data: [], error: null };

    const userIds = profiles.map((p: any) => p.userId);
    const { data: userProfiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", userIds);

    const profileMap = new Map((userProfiles || []).map((p: any) => [p.userId, p]));

    const { data: badges } = await adminSupabase
      .from("community_badges")
      .select("communityProfileId, badgeType")
      .in(
        "communityProfileId",
        profiles.map((p: any) => p.id || p.userId)
      );

    const badgeMap = new Map<string, string[]>();
    (badges || []).forEach((b: any) => {
      const existing = badgeMap.get(b.communityProfileId) || [];
      existing.push(b.badgeType);
      badgeMap.set(b.communityProfileId, existing);
    });

    const result: LeaderboardEntry[] = profiles.map((p: any, index: number) => {
      const userProfile = profileMap.get(p.userId);
      return {
        rank: index + 1,
        userId: p.userId,
        name: userProfile
          ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous",
        avatarUrl: userProfile?.avatarUrl || null,
        reputationPoints: p.reputationPoints,
        level: p.level,
        postsCount: p.postsCount,
        helpfulVotes: p.helpfulVotes,
        badges: badgeMap.get(p.userId) || [],
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting leaderboard:", err);
    return { data: null, error: "Failed to get leaderboard" };
  }
}

// ===========================================================
// GAMIFICATION - REPUTATION POINTS
// ===========================================================

const REPUTATION_POINTS = {
  CREATE_POST: 5,
  RECEIVE_LIKE: 2,
  RECEIVE_COMMENT: 1,
  HELPFUL_ANSWER: 10,
  SHARE_SUCCESS_STORY: 25,
  FIRST_POST_BONUS: 10,
};

export async function awardReputationPoints(
  userId: string,
  action: keyof typeof REPUTATION_POINTS,
  multiplier: number = 1
): Promise<{ data: { points: number } | null; error: string | null }> {
  try {
    const points = REPUTATION_POINTS[action] * multiplier;

    const { data: profile, error: fetchError } = await adminSupabase
      .from("community_profiles")
      .select("id, reputationPoints, level")
      .eq("userId", userId)
      .single();

    if (fetchError || !profile) {
      const { error: createError } = await adminSupabase
        .from("community_profiles")
        .insert({ userId, reputationPoints: points });

      if (createError) return { data: null, error: createError.message };
      return { data: { points }, error: null };
    }

    const newPoints = profile.reputationPoints + points;
    const newLevel = calculateLevel(newPoints);

    const { error: updateError } = await adminSupabase
      .from("community_profiles")
      .update({ reputationPoints: newPoints, level: newLevel })
      .eq("id", profile.id);

    if (updateError) return { data: null, error: updateError.message };

    if (newLevel > profile.level) {
      await checkAndAwardBadges(userId, newLevel, newPoints);
    }

    return { data: { points }, error: null };
  } catch (err) {
    console.error("Error awarding reputation points:", err);
    return { data: null, error: "Failed to award points" };
  }
}

function calculateLevel(points: number): number {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) return i + 1;
  }
  return 1;
}

async function checkAndAwardBadges(userId: string, level: number, points: number) {
  try {
    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("id, postsCount, commentsCount, helpfulVotes")
      .eq("userId", userId)
      .single();

    if (!profile) return;

    const badgesToAward: string[] = [];

    if (profile.postsCount >= 1) badgesToAward.push("FIRST_POST");
    if (profile.postsCount >= 50) badgesToAward.push("CONVERSATIONALIST");
    if (profile.helpfulVotes >= 100) badgesToAward.push("COMMUNITY_FAVORITE");
    if (profile.helpfulVotes >= 25) badgesToAward.push("HELPFUL");
    if (level >= 5) badgesToAward.push("ON_FIRE");
    if (level >= 10) badgesToAward.push("LEGEND");

    for (const badgeType of badgesToAward) {
      await adminSupabase
        .from("community_badges")
        .upsert(
          { communityProfileId: profile.id, badgeType },
          { onConflict: "communityProfileId,badgeType" }
        );
    }
  } catch (err) {
    console.error("Error checking badges:", err);
  }
}

// ===========================================================
// MODERATION
// ===========================================================

export interface ReportData {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  post: { title: string | null; content: string };
  reporter: { name: string };
}

export async function getPostReports(options?: {
  status?: "OPEN" | "RESOLVED" | "DISMISSED";
  limit?: number;
}): Promise<{ data: ReportData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("isModerator")
      .eq("userId", user.id)
      .single();

    if (!profile?.isModerator) return { data: null, error: "Not authorized" };

    let query = adminSupabase
      .from("community_post_reports")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(options?.limit || 50);

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data: reports, error } = await query;
    if (error) return { data: null, error: error.message };

    const postIds = [...new Set((reports || []).map((r: any) => r.postId))];
    const reporterIds = [...new Set((reports || []).map((r: any) => r.reporterId))];

    const [postsRes, profilesRes] = await Promise.all([
      adminSupabase
        .from("community_posts")
        .select("id, title, content")
        .in("id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]),
      adminSupabase
        .from("profiles")
        .select("userId, firstName, lastName")
        .in("userId", reporterIds.length > 0 ? reporterIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const postMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]));
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.userId, p]));

    const result: ReportData[] = (reports || []).map((r: any) => {
      const post = postMap.get(r.postId);
      const reporter = profileMap.get(r.reporterId);
      return {
        id: r.id,
        postId: r.postId,
        reporterId: r.reporterId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        post: {
          title: post?.title || null,
          content: post?.content || "[Post deleted]",
        },
        reporter: {
          name: reporter
            ? `${reporter.firstName || ""} ${reporter.lastName || ""}`.trim() || "Anonymous"
            : "Anonymous",
        },
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting reports:", err);
    return { data: null, error: "Failed to get reports" };
  }
}

export async function resolveReport(
  reportId: string,
  action: "dismiss" | "warn" | "remove_post" | "ban_user"
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("isModerator")
      .eq("userId", user.id)
      .single();

    if (!profile?.isModerator) return { data: null, error: "Not authorized" };

    const { data: report } = await adminSupabase
      .from("community_post_reports")
      .select("postId")
      .eq("id", reportId)
      .single();

    if (!report) return { data: null, error: "Report not found" };

    if (action === "remove_post") {
      await adminSupabase
        .from("community_posts")
        .update({ moderationStatus: "REJECTED", moderationNote: "Removed by moderator" })
        .eq("id", report.postId);
    }

    if (action === "ban_user") {
      const { data: post } = await adminSupabase
        .from("community_posts")
        .select("userId")
        .eq("id", report.postId)
        .single();

      if (post) {
        await adminSupabase
          .from("community_profiles")
          .update({ isBanned: true, banReason: "Violated community guidelines" })
          .eq("userId", post.userId);
      }
    }

    const newStatus = action === "dismiss" ? "DISMISSED" : "RESOLVED";
    await adminSupabase
      .from("community_post_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error resolving report:", err);
    return { data: null, error: "Failed to resolve report" };
  }
}

export async function flagPostForModeration(
  postId: string,
  reason: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const { error } = await adminSupabase
      .from("community_posts")
      .update({ moderationStatus: "FLAGGED", moderationNote: reason })
      .eq("id", postId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error flagging post:", err);
    return { data: null, error: "Failed to flag post" };
  }
}

export async function approvePost(postId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("isModerator")
      .eq("userId", user.id)
      .single();

    if (!profile?.isModerator) return { data: null, error: "Not authorized" };

    const { error } = await adminSupabase
      .from("community_posts")
      .update({ moderationStatus: "APPROVED", moderationNote: null })
      .eq("id", postId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error approving post:", err);
    return { data: null, error: "Failed to approve post" };
  }
}

export async function rejectPost(
  postId: string,
  reason: string
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: profile } = await adminSupabase
      .from("community_profiles")
      .select("isModerator")
      .eq("userId", user.id)
      .single();

    if (!profile?.isModerator) return { data: null, error: "Not authorized" };

    const { error } = await adminSupabase
      .from("community_posts")
      .update({ moderationStatus: "REJECTED", moderationNote: reason })
      .eq("id", postId);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error rejecting post:", err);
    return { data: null, error: "Failed to reject post" };
  }
}

// ===========================================================
// MENTORSHIP
// ===========================================================

export interface MentorData {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  expertise: string[];
  availability: string | null;
  maxMentees: number;
  currentMentees: number;
  isActive: boolean;
}

export interface MentorshipData {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  message: string | null;
  startedAt: string | null;
  createdAt: string;
  mentor: { name: string; avatarUrl: string | null };
  mentee: { name: string; avatarUrl: string | null };
}

export async function getMentors(): Promise<{
  data: MentorData[] | null;
  error: string | null;
}> {
  try {
    const { data: mentors, error } = await adminSupabase
      .from("mentor_profiles")
      .select("*")
      .eq("isActive", true)
      .order("currentMentees", { ascending: true });

    if (error) return { data: null, error: error.message };

    const userIds = (mentors || []).map((m: any) => m.userId);
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    const result: MentorData[] = (mentors || []).map((m: any) => {
      const profile = profileMap.get(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        name: profile
          ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous",
        avatarUrl: profile?.avatarUrl || null,
        bio: m.bio,
        expertise: Array.isArray(m.expertise) ? m.expertise : [],
        availability: m.availability?.schedule || null,
        maxMentees: m.maxMentees,
        currentMentees: m.currentMentees,
        isActive: m.isActive,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting mentors:", err);
    return { data: null, error: "Failed to get mentors" };
  }
}

export async function getMyMentorProfile(): Promise<{
  data: MentorData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: mentor } = await adminSupabase
      .from("mentor_profiles")
      .select("*")
      .eq("userId", user.id)
      .maybeSingle();

    if (!mentor) return { data: null, error: null };

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("firstName, lastName, avatarUrl")
      .eq("userId", user.id)
      .single();

    return {
      data: {
        id: mentor.id,
        userId: mentor.userId,
        name: profile
          ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous",
        avatarUrl: profile?.avatarUrl || null,
        bio: mentor.bio,
        expertise: Array.isArray(mentor.expertise) ? mentor.expertise : [],
        availability: mentor.availability?.schedule || null,
        maxMentees: mentor.maxMentees,
        currentMentees: mentor.currentMentees,
        isActive: mentor.isActive,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting mentor profile:", err);
    return { data: null, error: "Failed to get mentor profile" };
  }
}

export async function becomeMentor(input: {
  bio: string;
  expertise: string[];
  availability?: string;
  maxMentees?: number;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: existing } = await adminSupabase
      .from("mentor_profiles")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await adminSupabase
        .from("mentor_profiles")
        .update({
          bio: input.bio,
          expertise: input.expertise,
          availability: input.availability ? { schedule: input.availability } : null,
          maxMentees: input.maxMentees || 3,
          isActive: true,
        })
        .eq("id", existing.id);

      if (error) return { data: null, error: error.message };

      await adminSupabase
        .from("community_profiles")
        .update({ isMentor: true })
        .eq("userId", user.id);

      const { data: communityProfile } = await adminSupabase
        .from("community_profiles")
        .select("id")
        .eq("userId", user.id)
        .maybeSingle();

      if (communityProfile) {
        await adminSupabase
          .from("community_badges")
          .upsert(
            { communityProfileId: communityProfile.id, badgeType: "MENTOR" },
            { onConflict: "communityProfileId,badgeType" }
          );
      }

      return { data: { id: existing.id }, error: null };
    }

    const { data: mentor, error } = await adminSupabase
      .from("mentor_profiles")
      .insert({
        userId: user.id,
        bio: input.bio,
        expertise: input.expertise,
        availability: input.availability ? { schedule: input.availability } : null,
        maxMentees: input.maxMentees || 3,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    await adminSupabase
      .from("community_profiles")
      .update({ isMentor: true })
      .eq("userId", user.id);

    const { data: communityProfile } = await adminSupabase
      .from("community_profiles")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    if (communityProfile) {
      await adminSupabase
        .from("community_badges")
        .upsert(
          { communityProfileId: communityProfile.id, badgeType: "MENTOR" },
          { onConflict: "communityProfileId,badgeType" }
        );
    }

    return { data: { id: mentor.id }, error: null };
  } catch (err) {
    console.error("Error becoming mentor:", err);
    return { data: null, error: "Failed to become mentor" };
  }
}

export async function requestMentorship(
  mentorId: string,
  message: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: mentor } = await adminSupabase
      .from("mentor_profiles")
      .select("id, userId, maxMentees, currentMentees, isActive")
      .eq("id", mentorId)
      .single();

    if (!mentor) return { data: null, error: "Mentor not found" };
    if (!mentor.isActive) return { data: null, error: "Mentor is not accepting mentees" };
    if (mentor.currentMentees >= mentor.maxMentees) return { data: null, error: "Mentor has reached capacity" };
    if (mentor.userId === user.id) return { data: null, error: "Cannot mentor yourself" };

    const { data: existing } = await adminSupabase
      .from("mentorships")
      .select("id, status")
      .eq("mentorId", mentorId)
      .eq("menteeId", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "PENDING") return { data: null, error: "Request already pending" };
      if (existing.status === "ACCEPTED") return { data: null, error: "Already in mentorship" };
    }

    const { data: mentorship, error } = await adminSupabase
      .from("mentorships")
      .insert({
        mentorId,
        menteeId: user.id,
        message,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // Get mentee's name for notification
    const { data: menteeProfile } = await adminSupabase
      .from("profiles")
      .select("firstName, lastName")
      .eq("userId", user.id)
      .single();

    const menteeName = menteeProfile
      ? `${menteeProfile.firstName || ""} ${menteeProfile.lastName || ""}`.trim() || "Someone"
      : "Someone";

    // Send notification to mentor (X)
    await emitEvent({
      event: AppEvent.MENTORSHIP_REQUEST_RECEIVED,
      userId: mentor.userId,
      titleOverride: "New Mentorship Request",
      message: `${menteeName} wants you to be their mentor`,
      link: "/dashboard/community/hub/mentorship",
      metadata: { mentorshipId: mentorship.id, menteeId: user.id },
    });

    return { data: { id: mentorship.id }, error: null };
  } catch (err) {
    console.error("Error requesting mentorship:", err);
    return { data: null, error: "Failed to request mentorship" };
  }
}

export async function respondToMentorshipRequest(
  mentorshipId: string,
  accept: boolean
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: mentorship } = await adminSupabase
      .from("mentorships")
      .select("id, mentorId, status")
      .eq("id", mentorshipId)
      .single();

    if (!mentorship) return { data: null, error: "Request not found" };
    if (mentorship.status !== "PENDING") return { data: null, error: "Request already processed" };

    const { data: mentor } = await adminSupabase
      .from("mentor_profiles")
      .select("userId")
      .eq("id", mentorship.mentorId)
      .single();

    if (!mentor || mentor.userId !== user.id) return { data: null, error: "Not authorized" };

    const newStatus = accept ? "ACCEPTED" : "DECLINED";
    const { error } = await adminSupabase
      .from("mentorships")
      .update({
        status: newStatus,
        startedAt: accept ? new Date().toISOString() : null,
      })
      .eq("id", mentorshipId);

    if (error) return { data: null, error: error.message };

    if (accept) {
      const { data: mentorCounts } = await adminSupabase
        .from("mentor_profiles")
        .select("currentMentees")
        .eq("id", mentorship.mentorId)
        .single();

      await adminSupabase
        .from("mentor_profiles")
        .update({ currentMentees: (mentorCounts?.currentMentees || 0) + 1 })
        .eq("id", mentorship.mentorId);
    }

    // Get mentee ID from mentorship
    const { data: fullMentorship } = await adminSupabase
      .from("mentorships")
      .select("menteeId")
      .eq("id", mentorshipId)
      .single();

    if (fullMentorship) {
      // Get mentor's name for notification
      const { data: mentorProfile } = await adminSupabase
        .from("profiles")
        .select("firstName, lastName")
        .eq("userId", user.id)
        .single();

      const mentorName = mentorProfile
        ? `${mentorProfile.firstName || ""} ${mentorProfile.lastName || ""}`.trim() || "The mentor"
        : "The mentor";

      // Send notification to mentee (Y)
      await emitEvent({
        event: accept ? AppEvent.MENTORSHIP_REQUEST_ACCEPTED : AppEvent.MENTORSHIP_REQUEST_DECLINED,
        userId: fullMentorship.menteeId,
        titleOverride: accept ? "Mentorship Request Accepted!" : "Mentorship Request Declined",
        message: accept
          ? `${mentorName} accepted your mentorship request`
          : `${mentorName} declined your mentorship request`,
        link: "/dashboard/community/hub/mentorship",
        metadata: { mentorshipId, mentorId: mentorship.mentorId },
      });
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error responding to mentorship:", err);
    return { data: null, error: "Failed to respond" };
  }
}

export async function getMyMentorships(): Promise<{
  data: { asMentor: MentorshipData[]; asMentee: MentorshipData[] } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data: myMentorProfile } = await adminSupabase
      .from("mentor_profiles")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    let asMentor: MentorshipData[] = [];
    if (myMentorProfile) {
      const { data: mentorships } = await adminSupabase
        .from("mentorships")
        .select("*")
        .eq("mentorId", myMentorProfile.id)
        .order("createdAt", { ascending: false });

      const menteeIds = (mentorships || []).map((m: any) => m.menteeId);
      const { data: menteeProfiles } = await adminSupabase
        .from("profiles")
        .select("userId, firstName, lastName, avatarUrl")
        .in("userId", menteeIds.length > 0 ? menteeIds : ["00000000-0000-0000-0000-000000000000"]);

      const menteeMap = new Map((menteeProfiles || []).map((p: any) => [p.userId, p]));

      asMentor = (mentorships || []).map((m: any) => {
        const mentee = menteeMap.get(m.menteeId);
        return {
          id: m.id,
          mentorId: m.mentorId,
          menteeId: m.menteeId,
          status: m.status,
          message: m.message,
          startedAt: m.startedAt,
          createdAt: m.createdAt,
          mentor: { name: "You", avatarUrl: null },
          mentee: {
            name: mentee
              ? `${mentee.firstName || ""} ${mentee.lastName || ""}`.trim() || "Anonymous"
              : "Anonymous",
            avatarUrl: mentee?.avatarUrl || null,
          },
        };
      });
    }

    const { data: menteeships } = await adminSupabase
      .from("mentorships")
      .select("*")
      .eq("menteeId", user.id)
      .order("createdAt", { ascending: false });

    const mentorProfileIds = (menteeships || []).map((m: any) => m.mentorId);
    let mentorUserMap = new Map<string, any>();

    if (mentorProfileIds.length > 0) {
      const { data: mentorProfiles } = await adminSupabase
        .from("mentor_profiles")
        .select("id, userId")
        .in("id", mentorProfileIds);

      const mentorUserIds = (mentorProfiles || []).map((m: any) => m.userId);
      const { data: userProfiles } = await adminSupabase
        .from("profiles")
        .select("userId, firstName, lastName, avatarUrl")
        .in("userId", mentorUserIds);

      const profileMap = new Map((userProfiles || []).map((p: any) => [p.userId, p]));
      mentorUserMap = new Map(
        (mentorProfiles || []).map((m: any) => [m.id, profileMap.get(m.userId)])
      );
    }

    const asMentee: MentorshipData[] = (menteeships || []).map((m: any) => {
      const mentorProfile = mentorUserMap.get(m.mentorId);
      return {
        id: m.id,
        mentorId: m.mentorId,
        menteeId: m.menteeId,
        status: m.status,
        message: m.message,
        startedAt: m.startedAt,
        createdAt: m.createdAt,
        mentor: {
          name: mentorProfile
            ? `${mentorProfile.firstName || ""} ${mentorProfile.lastName || ""}`.trim() || "Anonymous"
            : "Anonymous",
          avatarUrl: mentorProfile?.avatarUrl || null,
        },
        mentee: { name: "You", avatarUrl: null },
      };
    });

    return { data: { asMentor, asMentee }, error: null };
  } catch (err) {
    console.error("Error getting mentorships:", err);
    return { data: null, error: "Failed to get mentorships" };
  }
}
