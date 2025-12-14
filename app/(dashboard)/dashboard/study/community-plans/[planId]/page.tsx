"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getPublicStudyPlan,
  toggleStudyPlanLike,
  getStudyPlanComments,
  addStudyPlanComment,
  deleteStudyPlanComment,
  type PublicStudyPlanDetail,
  type StudyPlanCommentData,
} from "@/lib/actions/custom-study-plan.action";

export default function CommunityPlanDetailPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [planData, setPlanData] = useState<PublicStudyPlanDetail | null>(null);
  const [comments, setComments] = useState<StudyPlanCommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadPlan();
    loadComments();
  }, [planId]);

  async function loadPlan() {
    setIsLoading(true);
    try {
      const res = await getPublicStudyPlan(planId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPlanData(res.data);
        setExpandedChapters(new Set(res.data.plan.chapters.map((c) => c.id)));
      }
    } catch (e) {
      setError("Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadComments() {
    const res = await getStudyPlanComments(planId);
    if (!res.error && res.data) {
      setComments(res.data);
    }
  }

  async function handleLike() {
    if (!planData) return;
    const res = await toggleStudyPlanLike(planId);
    if (!res.error && res.data) {
      setPlanData({
        ...planData,
        likeCount: res.data.liked ? planData.likeCount + 1 : planData.likeCount - 1,
        likedByMe: res.data.liked,
      });
    }
  }

  async function handleSubmitComment() {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await addStudyPlanComment(planId, newComment.trim());
      if (!res.error && res.data) {
        setComments((prev) => [res.data!, ...prev]);
        setNewComment("");
        if (planData) {
          setPlanData({ ...planData, commentCount: planData.commentCount + 1 });
        }
      }
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await deleteStudyPlanComment(commentId);
    if (!res.error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (planData) {
        setPlanData({ ...planData, commentCount: Math.max(0, planData.commentCount - 1) });
      }
    }
  }

  function toggleChapter(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !planData) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="rounded-lg border p-6">
          <h1 className="text-xl font-semibold">Plan not found</h1>
          <p className="mt-2 text-muted-foreground">{error || "This plan does not exist or is not public."}</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard/study/community-plans">Back to Community Plans</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/study/community-plans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Cover + Title */}
      <Card className="overflow-hidden">
        {planData.plan.coverImageUrl && (
          <div className="relative h-48 w-full bg-muted">
            <Image src={planData.plan.coverImageUrl} alt={planData.plan.title} fill className="object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{planData.plan.title}</CardTitle>
          {planData.plan.description && <CardDescription>{planData.plan.description}</CardDescription>}

          <div className="flex items-center gap-3 pt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={planData.author.avatarUrl || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">by {planData.author.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Badge variant="secondary">{planData.plan.chapters.length} chapters</Badge>
            <Badge variant="outline">
              {planData.plan.chapters.reduce((sum: number, c: { lessons: unknown[] }) => sum + c.lessons.length, 0)} lessons
            </Badge>

            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${
                planData.likedByMe ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${planData.likedByMe ? "fill-current" : ""}`} />
              {planData.likeCount}
            </button>

            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {planData.commentCount}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Chapters */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Chapters</h2>
        {planData.plan.chapters.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No chapters yet.
            </CardContent>
          </Card>
        ) : (
          planData.plan.chapters.map((chapter) => (
            <Collapsible
              key={chapter.id}
              open={expandedChapters.has(chapter.id)}
              onOpenChange={() => toggleChapter(chapter.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{chapter.title}</CardTitle>
                        {chapter.description && (
                          <CardDescription className="mt-1">{chapter.description}</CardDescription>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          expandedChapters.has(chapter.id) ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {chapter.lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No lessons in this chapter.</p>
                    ) : (
                      <ul className="space-y-2">
                        {chapter.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              href={`/dashboard/study/community-plans/${planId}/lesson/${lesson.id}`}
                              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                            >
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="font-medium">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.estimatedMinutes} min
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      {/* Comments */}
      <div id="comments" className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold">Comments ({planData.commentCount})</h2>

        <div className="flex gap-3">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleSubmitComment} disabled={isSubmittingComment || !newComment.trim()}>
            {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.avatarUrl || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{comment.content}</p>
                    </div>
                    {comment.isMine && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
