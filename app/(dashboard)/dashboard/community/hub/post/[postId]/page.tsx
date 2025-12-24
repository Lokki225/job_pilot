"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  BookmarkCheck,
  Loader2,
  ArrowLeft,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  FileText,
  Megaphone,
  Trophy,
  Send,
  Trash2,
  CornerDownRight,
  Flag,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  getPostById,
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  addPostComment,
  deletePostComment,
  likePostComment,
  unlikePostComment,
  reportPost,
  markCommentHelpful,
  unmarkCommentHelpful,
  type CommunityPostDetail,
  type CommunityPostType,
  type PostComment,
} from "@/lib/actions/community.action";

const POST_TYPE_CONFIG: Record<CommunityPostType, { label: string; icon: React.ReactNode; color: string }> = {
  TIP: { label: "Tip", icon: <Lightbulb className="h-4 w-4" />, color: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" },
  QUESTION: { label: "Question", icon: <HelpCircle className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
  DISCUSSION: { label: "Discussion", icon: <MessageSquare className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" },
  RESOURCE: { label: "Resource", icon: <FileText className="h-4 w-4" />, color: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" },
  ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="h-4 w-4" />, color: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400" },
  TRAINING_RESULT_SHARE: {
    label: "Training Result",
    icon: <Trophy className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  },
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  const [helpfulActionIds, setHelpfulActionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPost();
  }, [postId]);

  async function loadPost() {
    setIsLoading(true);
    try {
      const res = await getPostById(postId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPost(res.data);
      }
    } catch (err) {
      console.error("Error loading post:", err);
      setError("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike() {
    if (!post) return;
    const wasLiked = post.hasLiked;

    setPost((prev) =>
      prev
        ? { ...prev, hasLiked: !wasLiked, likesCount: wasLiked ? prev.likesCount - 1 : prev.likesCount + 1 }
        : prev
    );

    try {
      const res = wasLiked ? await unlikePost(postId) : await likePost(postId);
      if (res.error) {
        setPost((prev) =>
          prev
            ? { ...prev, hasLiked: wasLiked, likesCount: wasLiked ? prev.likesCount + 1 : prev.likesCount - 1 }
            : prev
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  }

  async function handleBookmark() {
    if (!post) return;
    const wasBookmarked = post.hasBookmarked;

    setPost((prev) => (prev ? { ...prev, hasBookmarked: !wasBookmarked } : prev));

    try {
      const res = wasBookmarked ? await unbookmarkPost(postId) : await bookmarkPost(postId);
      if (res.error) {
        setPost((prev) => (prev ? { ...prev, hasBookmarked: wasBookmarked } : prev));
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  }

  async function handleAddComment(parentId?: string | null) {
    const content = parentId ? replyDraft : newComment;
    if (!content.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await addPostComment(postId, content.trim(), parentId);
      if (res.error) {
        setError(res.error);
      } else {
        if (parentId) {
          setReplyToId(null);
          setReplyDraft("");
        } else {
          setNewComment("");
        }
        loadPost();
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const res = await deletePostComment(commentId);
      if (res.error) {
        setError(res.error);
      } else {
        loadPost();
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  }

  async function handleToggleCommentLike(commentId: string, hasLiked: boolean) {
    if (!post) return;

    const updateComments = (comments: PostComment[]): PostComment[] =>
      comments.map((c) =>
        c.id === commentId
          ? { ...c, hasLiked: !hasLiked, likesCount: hasLiked ? c.likesCount - 1 : c.likesCount + 1 }
          : { ...c, replies: updateComments(c.replies) }
      );

    setPost((prev) => (prev ? { ...prev, comments: updateComments(prev.comments) } : prev));

    try {
      const res = hasLiked ? await unlikePostComment(commentId) : await likePostComment(commentId);
      if (res.error) {
        const revertComments = (comments: PostComment[]): PostComment[] =>
          comments.map((c) =>
            c.id === commentId
              ? { ...c, hasLiked, likesCount: hasLiked ? c.likesCount + 1 : c.likesCount - 1 }
              : { ...c, replies: revertComments(c.replies) }
          );
        setPost((prev) => (prev ? { ...prev, comments: revertComments(prev.comments) } : prev));
      }
    } catch (err) {
      console.error("Error toggling comment like:", err);
    }
  }

  function toggleCollapseComment(commentId: string) {
    setCollapsedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  const updateCommentTree = (
    comments: PostComment[],
    targetId: string,
    updater: (comment: PostComment) => PostComment
  ): PostComment[] => {
    return comments.map((comment) => {
      if (comment.id === targetId) {
        return updater(comment);
      }
      if (comment.replies.length > 0) {
        const nextReplies = updateCommentTree(comment.replies, targetId, updater);
        if (nextReplies !== comment.replies) {
          return { ...comment, replies: nextReplies };
        }
      }
      return comment;
    });
  };

  async function handleToggleCommentHelpful(commentId: string, isHelpful: boolean) {
    if (!post || !post.isMyPost) return;

    const previousComments = post.comments;
    const nextValue = !isHelpful;

    setHelpfulActionIds((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });

    setPost((prev) =>
      prev
        ? {
            ...prev,
            comments: updateCommentTree(prev.comments, commentId, (comment) => ({
              ...comment,
              isHelpful: nextValue,
            })),
          }
        : prev
    );

    try {
      const res = nextValue ? await markCommentHelpful(commentId) : await unmarkCommentHelpful(commentId);
      if (res.error) {
        setPost((prev) => (prev ? { ...prev, comments: previousComments } : prev));
        setError(res.error);
      }
    } catch (err) {
      console.error("Error toggling helpful:", err);
      setPost((prev) => (prev ? { ...prev, comments: previousComments } : prev));
      setError("Failed to update helpful status");
    } finally {
      setHelpfulActionIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }

  const totalCommentsCount = useMemo(() => {
    if (!post) return 0;
    const countReplies = (comments: PostComment[]): number =>
      comments.reduce((acc, c) => acc + 1 + countReplies(c.replies), 0);
    return countReplies(post.comments);
  }, [post]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">{error || "Post not found"}</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/community/hub")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = POST_TYPE_CONFIG[post.type];

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/community/hub")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.authorAvatar || undefined} />
              <AvatarFallback>{post.authorName[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{post.authorName}</span>
                <Badge className={`${typeConfig.color} gap-1`}>
                  {typeConfig.icon}
                  {typeConfig.label}
                </Badge>
                {post.isPinned && <Badge variant="outline">📌 Pinned</Badge>}
                {post.isFeatured && <Badge variant="outline" className="text-yellow-600">⭐ Featured</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Post actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Flag className="mr-2 h-4 w-4" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {post.title && <h1 className="mt-4 text-xl font-bold">{post.title}</h1>}

          <div className="mt-4 whitespace-pre-wrap text-foreground">{post.content}</div>

          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-4 border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              className={post.hasLiked ? "text-red-500" : ""}
              aria-label={post.hasLiked ? "Unlike post" : "Like post"}
              aria-pressed={post.hasLiked}
              onClick={handleLike}
            >
              <Heart className={`mr-1 h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`} />
              {post.likesCount} Likes
            </Button>
            <Button variant="ghost" size="sm">
              <MessageCircle className="mr-1 h-4 w-4" />
              {totalCommentsCount} Comments
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 h-4 w-4" />
              {post.viewsCount} Views
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`ml-auto ${post.hasBookmarked ? "text-primary" : ""}`}
              aria-label={post.hasBookmarked ? "Unsave post" : "Save post"}
              aria-pressed={post.hasBookmarked}
              onClick={handleBookmark}
            >
              {post.hasBookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold">Comments ({totalCommentsCount})</h2>

          <div className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => handleAddComment()}
                disabled={isSubmittingComment || !newComment.trim()}
              >
                {isSubmittingComment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </div>

          {post.comments.length > 0 && (
            <div className="mt-6 space-y-4">
              {post.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  replyToId={replyToId}
                  replyDraft={replyDraft}
                  setReplyDraft={setReplyDraft}
                  setReplyToId={setReplyToId}
                  isSubmittingComment={isSubmittingComment}
                  collapsedComments={collapsedComments}
                  onDelete={handleDeleteComment}
                  onReply={handleAddComment}
                  onToggleLike={handleToggleCommentLike}
                  onToggleCollapse={toggleCollapseComment}
                  onToggleHelpful={handleToggleCommentHelpful}
                  isPostOwner={post.isMyPost}
                  isProcessingHelpful={helpfulActionIds.has(comment.id)}
                  helpfulActionLookup={helpfulActionIds}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CommentItem({
  comment,
  depth,
  replyToId,
  replyDraft,
  setReplyDraft,
  setReplyToId,
  isSubmittingComment,
  collapsedComments,
  onDelete,
  onReply,
  onToggleLike,
  onToggleCollapse,
  onToggleHelpful,
  isPostOwner,
  isProcessingHelpful,
  helpfulActionLookup,
}: {
  comment: PostComment;
  depth: number;
  replyToId: string | null;
  replyDraft: string;
  setReplyDraft: (v: string) => void;
  setReplyToId: (v: string | null) => void;
  isSubmittingComment: boolean;
  collapsedComments: Set<string>;
  onDelete: (commentId: string) => void;
  onReply: (parentId?: string | null) => void;
  onToggleLike: (commentId: string, hasLiked: boolean) => void;
  onToggleCollapse: (commentId: string) => void;
  onToggleHelpful: (commentId: string, isHelpful: boolean) => void;
  isPostOwner: boolean;
  isProcessingHelpful: boolean;
  helpfulActionLookup: Set<string>;
}) {
  const isReplyingHere = replyToId === comment.id;
  const isCollapsed = collapsedComments.has(comment.id);

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""}>
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.authorAvatar || undefined} />
              <AvatarFallback>{comment.authorName[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{comment.authorName}</span>
                <span className="text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${comment.hasLiked ? "text-red-500" : ""}`}
                  aria-label={comment.hasLiked ? "Unlike comment" : "Like comment"}
                  aria-pressed={comment.hasLiked}
                  onClick={() => onToggleLike(comment.id, comment.hasLiked)}
                >
                  <Heart className={`mr-1 h-3 w-3 ${comment.hasLiked ? "fill-current" : ""}`} />
                  {comment.likesCount}
                </Button>
                {comment.isHelpful && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Helpful
                  </Badge>
                )}
                {isPostOwner && !comment.isMine && (
                  <Button
                    variant={comment.isHelpful ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 font-medium"
                    disabled={isProcessingHelpful}
                    onClick={() => onToggleHelpful(comment.id, comment.isHelpful)}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {comment.isHelpful ? "Helpful" : "Mark helpful"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    if (isReplyingHere) {
                      setReplyToId(null);
                      setReplyDraft("");
                    } else {
                      setReplyToId(comment.id);
                      setReplyDraft("");
                    }
                  }}
                >
                  <CornerDownRight className="mr-1 h-3 w-3" />
                  Reply
                </Button>
                {comment.replies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onToggleCollapse(comment.id)}
                  >
                    {isCollapsed ? `Show ${comment.replies.length} replies` : "Hide replies"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {comment.isMine && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Delete comment"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isReplyingHere && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReplyToId(null);
                  setReplyDraft("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onReply(comment.id)}
                disabled={isSubmittingComment || !replyDraft.trim()}
              >
                {isSubmittingComment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post Reply"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              replyToId={replyToId}
              replyDraft={replyDraft}
              setReplyDraft={setReplyDraft}
              setReplyToId={setReplyToId}
              isSubmittingComment={isSubmittingComment}
              collapsedComments={collapsedComments}
              onDelete={onDelete}
              onReply={onReply}
              onToggleLike={onToggleLike}
              onToggleCollapse={onToggleCollapse}
              onToggleHelpful={onToggleHelpful}
              isPostOwner={isPostOwner}
              isProcessingHelpful={helpfulActionLookup.has(reply.id)}
              helpfulActionLookup={helpfulActionLookup}
            />
          ))}
        </div>
      )}
    </div>
  );
}
