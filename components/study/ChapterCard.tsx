"use client";

import Link from "next/link";
import { ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ChapterWithProgress } from "@/lib/types/study.types";

interface ChapterCardProps {
  chapter: ChapterWithProgress;
}

export function ChapterCard({ chapter }: ChapterCardProps) {
  const isLocked = !chapter.isUnlocked;
  const isCompleted = chapter.progressPercentage === 100;

  return (
    <Link 
      href={isLocked ? "#" : `/dashboard/study/chapter/${chapter.id}`}
      className={isLocked ? "cursor-not-allowed" : ""}
    >
      <Card className={`
        transition-all duration-200 h-full
        ${isLocked 
          ? "opacity-60 bg-gray-50 dark:bg-gray-800/50" 
          : "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800"
        }
        ${isCompleted ? "border-green-300 dark:border-green-700" : "border-gray-200 dark:border-gray-700"}
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{chapter.icon}</span>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  {chapter.title}
                  {chapter.isPremium && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Pro
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {chapter.description}
                </CardDescription>
              </div>
            </div>
            {isLocked ? (
              <Lock className="h-5 w-5 text-gray-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>{chapter.completedLessons}/{chapter.totalLessons} lessons</span>
            <span>{chapter.estimatedMinutes} min</span>
          </div>
          <Progress 
            value={chapter.progressPercentage} 
            className="h-2 bg-gray-100 dark:bg-gray-700"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
