"use client";

import Link from "next/link";
import { Clock, CheckCircle2, Lock, PlayCircle, FileText, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { LessonWithProgress } from "@/lib/types/study.types";

interface LessonCardProps {
  lesson: LessonWithProgress;
  index: number;
  isUnlocked: boolean;
}

export function LessonCard({ lesson, index, isUnlocked }: LessonCardProps) {
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
