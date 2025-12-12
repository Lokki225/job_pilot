"use client";

import { useState, useEffect } from "react";
import { BookOpen, Trophy, Clock, Flame, ChevronRight, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { StudyRoomHomeData, ChapterWithProgress } from "@/lib/types/study.types";
import { getChaptersWithProgress } from "@/lib/actions/study.action";

export default function StudyRoomPage() {
  const [data, setData] = useState<StudyRoomHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudyData() {
      try {
        const result = await getChaptersWithProgress();
        
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Error loading study data:", err);
        setError("Failed to load study room data");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadStudyData();
  }, []);

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
        <p className="text-gray-500 dark:text-gray-400">{error || "Failed to load study room data"}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📖 Study Room
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Master the art of interviewing with our structured curriculum
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Overall Progress</p>
                <p className="text-2xl font-bold">{data.overallProgress.percentage}%</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-200" />
            </div>
            <Progress 
              value={data.overallProgress.percentage} 
              className="mt-3 bg-blue-400/30 [&>div]:bg-white" 
            />
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Lessons Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.overallProgress.completedLessons}/{data.overallProgress.totalLessons}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(data.overallProgress.totalTimeSpent / 60)}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.overallProgress.currentStreak} days
                </p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Learning */}
      {data.nextLesson && (
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                  Continue Learning
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.nextLesson.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.nextLesson.chapter.title} • {data.nextLesson.estimatedMinutes} min
                </p>
              </div>
              <Button asChild>
                <Link href={`/dashboard/study/lesson/${data.nextLesson.id}`}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapters Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Chapters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChapterCard({ chapter }: { chapter: ChapterWithProgress }) {
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
