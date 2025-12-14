"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/study/MarkdownRenderer";
import {
  getCustomStudyLessonForStudy,
  type CustomStudyLessonForStudy,
} from "@/lib/actions/custom-study-plan.action";

export default function CommunityLessonPage() {
  const params = useParams();
  const planId = params.planId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<CustomStudyLessonForStudy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getCustomStudyLessonForStudy(lessonId);
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setLesson(res.data);
        }
      } catch (e) {
        setError("Failed to load lesson");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [lessonId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="rounded-lg border p-6">
          <h1 className="text-xl font-semibold">Lesson not found</h1>
          <p className="mt-2 text-muted-foreground">{error || "This lesson does not exist or is not accessible."}</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={`/dashboard/study/community-plans/${planId}`}>Back to Plan</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/study/community-plans/${planId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plan
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{lesson.plan.title}</span>
          <ChevronRight className="h-4 w-4" />
          <span>{lesson.chapter.title}</span>
        </div>
      </div>

      {/* Lesson Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{lesson.title}</CardTitle>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lesson.estimatedMinutes} min
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lesson Content */}
      <Card>
        <CardContent className="py-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MarkdownRenderer content={lesson.content} />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Navigation */}
      <div className="flex justify-between pt-4">
        <Link href={`/dashboard/study/community-plans/${planId}`}>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Plan
          </Button>
        </Link>
      </div>
    </div>
  );
}
