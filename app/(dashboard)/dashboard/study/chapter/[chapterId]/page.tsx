"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Lock, 
  PlayCircle,
  FileText,
  HelpCircle,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChapterDetailData, LessonWithProgress } from "@/lib/types/study.types";
import { getChapterDetail } from "@/lib/actions/study.action";

export default function ChapterDetailPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const [data, setData] = useState<ChapterDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapterData() {
      try {
        const result = await getChapterDetail(chapterId);
        
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Error loading chapter data:", err);
        setError("Failed to load chapter");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadChapterData();
  }, [chapterId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || "Chapter not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/study">Back to Study Room</Link>
        </Button>
      </div>
    );
  }

  const completedLessons = data.lessons.filter(l => l.progress?.status === "COMPLETED").length;
  const progressPercentage = Math.round((completedLessons / data.lessons.length) * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link 
        href="/dashboard/study" 
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Study Room
      </Link>

      {/* Chapter Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{data.chapter.icon}</span>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chapter {data.chapter.orderIndex}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.chapter.title}
            </h1>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {data.chapter.description}
        </p>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-4">
          <Progress value={progressPercentage} className="flex-1 h-3" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completedLessons}/{data.lessons.length} lessons
          </span>
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-3">
        {data.lessons.map((lesson, index) => (
          <LessonCard 
            key={lesson.id} 
            lesson={lesson} 
            index={index}
            isUnlocked={index === 0 || data.lessons[index - 1]?.progress?.status === "COMPLETED"}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        {data.previousChapter ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/study/chapter/${data.previousChapter.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {data.previousChapter.title}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {data.nextChapter && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/study/chapter/${data.nextChapter.id}`}>
              {data.nextChapter.title}
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function LessonCard({ 
  lesson, 
  index, 
  isUnlocked 
}: { 
  lesson: LessonWithProgress; 
  index: number;
  isUnlocked: boolean;
}) {
  const isCompleted = lesson.progress?.status === "COMPLETED";
  const isInProgress = lesson.progress?.status === "IN_PROGRESS";

  const getIcon = () => {
    if (lesson.contentType === "QUIZ") return <HelpCircle className="h-5 w-5" />;
    if (lesson.contentType === "INTERACTIVE") return <PlayCircle className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getTypeLabel = () => {
    switch (lesson.contentType) {
      case "QUIZ": return "Quiz";
      case "INTERACTIVE": return "Interactive";
      case "PRACTICE": return "Practice";
      default: return "Lesson";
    }
  };

  return (
    <Link 
      href={isUnlocked ? `/dashboard/study/lesson/${lesson.id}` : "#"}
      className={!isUnlocked ? "cursor-not-allowed" : ""}
    >
      <Card className={`
        transition-all duration-200
        ${!isUnlocked 
          ? "opacity-50 bg-gray-50 dark:bg-gray-800/50" 
          : "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
        }
        ${isCompleted 
          ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10" 
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }
      `}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Status Icon */}
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${isCompleted 
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                : isInProgress
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : !isUnlocked
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }
            `}>
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : !isUnlocked ? (
                <Lock className="h-5 w-5" />
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {lesson.title}
                </h3>
                {lesson.isPremium && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                    Pro
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lesson.description}
              </p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                {getIcon()}
                <span>{getTypeLabel()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{lesson.estimatedMinutes}m</span>
              </div>
            </div>
          </div>

          {/* Progress bar for in-progress lessons */}
          {isInProgress && lesson.progress && (
            <div className="mt-3 ml-14">
              <Progress value={lesson.progress.progressPercentage} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
