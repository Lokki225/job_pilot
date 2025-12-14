"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Eye, Calendar, Briefcase, MapPin, DollarSign, Loader2, Lightbulb, MessageSquare, BarChart3, Trash2, CornerDownRight, ChevronDown, ChevronRight, Bookmark, MoreVertical, EyeOff, Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoryById, likeStory, unlikeStory, bookmarkStory, unbookmarkStory, hideStory, reportStory, getStoryComments, addStoryComment, deleteStoryComment, likeStoryComment, unlikeStoryComment, type SuccessStoryDetail, type SuccessStoryComment } from "@/lib/actions/success-stories.action";

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const router = useRouter();

  const [story, setStory] = useState<SuccessStoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<SuccessStoryComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [collapsedCommentIds, setCollapsedCommentIds] = useState<Set<string>>(new Set());

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<string>("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  const totalCommentsCount = useMemo(() => {
    const countAll = (items: SuccessStoryComment[]): number => {
      let count = 0;
      for (const item of items) {
        count += 1;
        count += countAll(item.replies || []);
      }
      return count;
    };

    return countAll(comments);
  }, [comments]);

  useEffect(() => {
    loadStory();
  }, [storyId]);

  async function loadStory() {
    setIsLoading(true);
    setError(null);
    setCommentsError(null);

    try {
      const [storyResult, commentsResult] = await Promise.all([
        getStoryById(storyId),
        getStoryComments(storyId),
      ]);

      if (storyResult.error) {
        setError(storyResult.error);
      } else if (storyResult.data) {
        setStory(storyResult.data);
      }

      if (commentsResult.error) {
        setCommentsError(commentsResult.error);
        setComments([]);
      } else if (commentsResult.data) {
        setComments(commentsResult.data);
      }
    } catch (err) {
      console.error("Error loading story:", err);
      setError("Failed to load story");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHideStory() {
    if (!story || isHiding) return;
    setIsHiding(true);
    try {
      const result = await hideStory(storyId);
      if (result.error) {
        setReportSuccess(null);
        setReportError(result.error);
        return;
      }
      router.push("/dashboard/community");
    } catch (err) {
      console.error("Error hiding story:", err);
      setReportSuccess(null);
      setReportError("Failed to hide story");
    } finally {
      setIsHiding(false);
    }
  }

  async function handleSubmitReport() {
    if (!story || isReporting) return;
    setReportError(null);
    setReportSuccess(null);
    setIsReporting(true);

    try {
      const result = await reportStory(storyId, reportReason, reportDetails);
      if (result.error) {
        setReportError(result.error);
        return;
      }
      setReportSuccess("Report submitted. Thank you.");
      setIsReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (err) {
      console.error("Error reporting story:", err);
      setReportError("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  }

  async function handleAddComment(parentId?: string | null) {
    const content = parentId ? replyDraft : commentDraft;
    if (!content.trim()) return;
    setCommentsError(null);
    setIsSubmittingComment(true);

    try {
      const result = await addStoryComment(storyId, content, parentId);
      if (result.error) {
        setCommentsError(result.error);
        return;
      }

      if (parentId) {
        setReplyDraft("");
        setReplyToId(null);
      } else {
        setCommentDraft("");
      }

      const refreshed = await getStoryComments(storyId);
      if (!refreshed.error && refreshed.data) setComments(refreshed.data);
    } catch (err) {
      console.error("Error adding comment:", err);
      setCommentsError("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setCommentsError(null);
    try {
      const result = await deleteStoryComment(commentId);
      if (result.error) {
        setCommentsError(result.error);
        return;
      }
      const refreshed = await getStoryComments(storyId);
      if (!refreshed.error && refreshed.data) setComments(refreshed.data);
    } catch (err) {
      console.error("Error deleting comment:", err);
      setCommentsError("Failed to delete comment");
    }
  }

  async function handleToggleCommentLike(commentId: string, hasLiked: boolean) {
    setCommentsError(null);
    try {
      const result = hasLiked ? await unlikeStoryComment(commentId) : await likeStoryComment(commentId);
      if (result.error) {
        setCommentsError(result.error);
        return;
      }
      const refreshed = await getStoryComments(storyId);
      if (!refreshed.error && refreshed.data) setComments(refreshed.data);
    } catch (err) {
      console.error("Error toggling comment like:", err);
      setCommentsError("Failed to like comment");
    }
  }

  function handleToggleCollapse(commentId: string) {
    setCollapsedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  async function handleLike() {
    if (!story) return;

    const wasLiked = story.hasLiked;
    setStory((prev) =>
      prev
        ? { ...prev, hasLiked: !wasLiked, likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount + 1 }
        : prev
    );

    try {
      const result = wasLiked ? await unlikeStory(storyId) : await likeStory(storyId);
      if (result.error) {
        setStory((prev) =>
          prev
            ? { ...prev, hasLiked: wasLiked, likeCount: wasLiked ? prev.likeCount + 1 : prev.likeCount - 1 }
            : prev
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  }

  async function handleBookmark() {
    if (!story) return;

    const wasBookmarked = !!story.hasBookmarked;
    setStory((prev) =>
      prev
        ? { ...prev, hasBookmarked: !wasBookmarked }
        : prev
    );

    try {
      const result = wasBookmarked ? await unbookmarkStory(storyId) : await bookmarkStory(storyId);
      if (result.error) {
        setStory((prev) =>
          prev
            ? { ...prev, hasBookmarked: wasBookmarked }
            : prev
        );
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
      setStory((prev) =>
        prev
          ? { ...prev, hasBookmarked: wasBookmarked }
          : prev
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="outline" asChild className="mb-6">
          <Link href="/dashboard/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stories
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Story not found</CardTitle>
            <CardDescription>{error || "This story could not be loaded."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(story.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/dashboard/community">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stories
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {story.title || `${story.jobTitle} at ${story.companyName}`}
        </h1>

        {story.coverImageUrl && (
          <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <img
              src={story.coverImageUrl}
              alt="Story cover"
              className="w-full h-64 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {story.tags.slice(0, 6).map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
            {story.tags.length > 6 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{story.tags.length - 6}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {story.jobTitle} @ {story.companyName}
          </span>
          {story.industry && (
            <Badge variant="secondary">{story.industry}</Badge>
          )}
          {story.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {story.location}
            </span>
          )}
          {story.salaryRange && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {story.salaryRange}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </span>
          <span>by {story.authorName}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {story.viewCount} views
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Story */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Story</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {story.story.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-4 text-gray-700 dark:text-gray-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Learnings */}
          {story.keyLearnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Key Learnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {story.keyLearnings.map((learning, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{learning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Advice */}
          {story.adviceForOthers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Advice for Others
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{story.adviceForOthers}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Like Button */}
          <div className="flex items-center gap-4">
            <Button
              variant={story.hasLiked ? "default" : "outline"}
              onClick={handleLike}
              className={story.hasLiked ? "bg-red-500 hover:bg-red-600" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${story.hasLiked ? "fill-current" : ""}`} />
              {story.hasLiked ? "Liked" : "Like"} ({story.likeCount})
            </Button>

            <Button
              variant={story.hasBookmarked ? "default" : "outline"}
              onClick={handleBookmark}
              className={story.hasBookmarked ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${story.hasBookmarked ? "fill-current" : ""}`} />
              {story.hasBookmarked ? "Saved" : "Save"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Story actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setReportError(null);
                    setReportSuccess(null);
                    setIsReportOpen(true);
                  }}
                >
                  <Flag className="h-4 w-4" />
                  Report story
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleHideStory}>
                  <EyeOff className="h-4 w-4" />
                  {isHiding ? "Hiding..." : "Hide story"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {totalCommentsCount}
                </span>
              </CardTitle>
              {commentsError && (
                <CardDescription className="text-red-600 dark:text-red-400">
                  {commentsError}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleAddComment(null)}
                    disabled={isSubmittingComment || !commentDraft.trim()}
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    depth={0}
                    replyToId={replyToId}
                    replyDraft={replyDraft}
                    setReplyDraft={setReplyDraft}
                    setReplyToId={setReplyToId}
                    isSubmittingComment={isSubmittingComment}
                    onDelete={handleDeleteComment}
                    onReply={handleAddComment}
                    onToggleLike={handleToggleCommentLike}
                    collapsedCommentIds={collapsedCommentIds}
                    onToggleCollapse={handleToggleCollapse}
                  />
                ))}

                {comments.length === 0 && !commentsError && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Be the first to comment.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report story</DialogTitle>
              <DialogDescription>
                Tell us why you're reporting this story.
              </DialogDescription>
            </DialogHeader>

            {reportError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {reportError}
              </div>
            )}

            <div className="space-y-2">
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPAM">Spam</SelectItem>
                  <SelectItem value="HARASSMENT">Harassment</SelectItem>
                  <SelectItem value="HATE">Hate speech</SelectItem>
                  <SelectItem value="MISINFORMATION">Misinformation</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Optional details (max 2000 chars)"
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitReport}
                disabled={isReporting || !reportReason}
              >
                {isReporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sidebar - Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Journey Stats
              </CardTitle>
              <CardDescription>
                Auto-tracked from Job Pilot usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {story.daysToOffer !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Days to Offer</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.daysToOffer}</span>
                </div>
              )}
              {story.totalApplications !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Applications</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalApplications}</span>
                </div>
              )}
              {story.totalTrainingSessions !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Training Sessions</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalTrainingSessions}</span>
                </div>
              )}
              {story.avgTrainingScore !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Training Score</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.avgTrainingScore}%</span>
                </div>
              )}
              {story.totalStudyTimeMinutes !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Study Time</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {story.totalStudyTimeMinutes >= 60
                      ? `${Math.floor(story.totalStudyTimeMinutes / 60)}h ${story.totalStudyTimeMinutes % 60}m`
                      : `${story.totalStudyTimeMinutes}m`}
                  </span>
                </div>
              )}
              {story.totalQuestionsPracticed !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Questions Practiced</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalQuestionsPracticed}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Ready to share your story?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Inspire others by sharing your job search journey.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/community/submit">Share Your Story</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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
  onDelete,
  onReply,
  onToggleLike,
  collapsedCommentIds,
  onToggleCollapse,
}: {
  comment: SuccessStoryComment;
  depth: number;
  replyToId: string | null;
  replyDraft: string;
  setReplyDraft: (v: string) => void;
  setReplyToId: (v: string | null) => void;
  isSubmittingComment: boolean;
  onDelete: (commentId: string) => void;
  onReply: (parentId?: string | null) => void;
  onToggleLike: (commentId: string, hasLiked: boolean) => void;
  collapsedCommentIds: Set<string>;
  onToggleCollapse: (commentId: string) => void;
}) {
  const isReplyingHere = replyToId === comment.id;
  const hasReplies = (comment.replies?.length || 0) > 0;
  const isCollapsed = collapsedCommentIds.has(comment.id);

  return (
    <div className={depth > 0 ? "pl-6" : ""}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-white">{comment.authorName}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {comment.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={comment.hasLiked ? "default" : "outline"}
                onClick={() => onToggleLike(comment.id, comment.hasLiked)}
                className={comment.hasLiked ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <Heart className={`h-3.5 w-3.5 mr-2 ${comment.hasLiked ? "fill-current" : ""}`} />
                {comment.likeCount}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
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
                <CornerDownRight className="h-3.5 w-3.5 mr-2" />
                Reply
              </Button>

              {hasReplies && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleCollapse(comment.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 mr-2" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 mr-2" />
                  )}
                  {isCollapsed ? "Show" : "Hide"} replies ({comment.replies.length})
                </Button>
              )}
            </div>
          </div>

          {comment.isMine && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(comment.id)}
              aria-label="Delete comment"
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isReplyingHere && (
          <div className="mt-4 space-y-2">
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
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
                type="button"
                size="sm"
                onClick={() => onReply(comment.id)}
                disabled={isSubmittingComment || !replyDraft.trim()}
              >
                {isSubmittingComment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      {!isCollapsed && comment.replies?.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              depth={depth + 1}
              replyToId={replyToId}
              replyDraft={replyDraft}
              setReplyDraft={setReplyDraft}
              setReplyToId={setReplyToId}
              isSubmittingComment={isSubmittingComment}
              onDelete={onDelete}
              onReply={onReply}
              onToggleLike={onToggleLike}
              collapsedCommentIds={collapsedCommentIds}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
