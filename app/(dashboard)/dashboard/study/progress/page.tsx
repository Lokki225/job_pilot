"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  Flame, 
  BookOpen,
  CheckCircle2,
  Target,
  TrendingUp,
  Calendar,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getUserStudyStats, getChaptersWithProgress } from "@/lib/actions/study.action";

interface ProgressStats {
  totalLessons: number;
  completedLessons: number;
  totalChapters: number;
  completedChapters: number;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
  quizzesPassed: number;
  averageQuizScore: number;
  xpEarned: number;
  level: number;
}

interface ChapterProgress {
  id: string;
  title: string;
  icon: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export default function StudyProgressPage() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgressData() {
      try {
        // Fetch stats and chapters in parallel
        const [statsResult, chaptersResult] = await Promise.all([
          getUserStudyStats(),
          getChaptersWithProgress(),
        ]);

        if (statsResult.error) {
          setError(statsResult.error);
          return;
        }

        if (statsResult.data) {
          // Calculate XP and level (simplified)
          const xpEarned = (statsResult.data.completedLessons * 25) + (statsResult.data.quizzesPassed * 50);
          const level = Math.floor(xpEarned / 200) + 1;
          
          setStats({
            ...statsResult.data,
            currentStreak: 0, // TODO: Implement streak tracking
            longestStreak: 0,
            xpEarned,
            level,
          });
        }

        if (chaptersResult.data) {
          setChapters(chaptersResult.data.chapters.map(c => ({
            id: c.id,
            title: c.title,
            icon: c.icon || "📖",
            totalLessons: c.totalLessons,
            completedLessons: c.completedLessons,
            progressPercentage: c.progressPercentage,
          })));
        }
      } catch (err) {
        console.error("Error loading progress data:", err);
        setError("Failed to load progress data");
      } finally {
        setIsLoading(false);
      }
    }

    loadProgressData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || "Failed to load progress data"}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/study">Back to Study Room</Link>
        </Button>
      </div>
    );
  }

  const overallProgress = Math.round((stats.completedLessons / stats.totalLessons) * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Link 
        href="/dashboard/study" 
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Study Room
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Your Progress
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your learning journey and achievements
        </p>
      </div>

      {/* Overall Progress Card */}
      <Card className="mb-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-blue-100 text-sm mb-1">Overall Progress</p>
              <p className="text-4xl font-bold mb-2">{overallProgress}%</p>
              <p className="text-blue-100">
                {stats.completedLessons} of {stats.totalLessons} lessons completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-16 w-16 text-yellow-300" />
              <div>
                <p className="text-2xl font-bold">Level {stats.level}</p>
                <p className="text-blue-100">{stats.xpEarned} XP</p>
              </div>
            </div>
          </div>
          <Progress 
            value={overallProgress} 
            className="mt-6 h-3 bg-blue-400/30 [&>div]:bg-white" 
          />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(stats.totalTimeSpent / 3600)}h {Math.floor((stats.totalTimeSpent % 3600) / 60)}m
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.quizzesPassed}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quizzes Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageQuizScore}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Quiz Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chapter Progress */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <BookOpen className="h-5 w-5" />
            Chapter Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="flex items-center gap-4">
                <span className="text-2xl w-10">{chapter.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {chapter.title}
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {chapter.completedLessons}/{chapter.totalLessons}
                    </span>
                  </div>
                  <Progress value={chapter.progressPercentage} className="h-2" />
                </div>
                {chapter.progressPercentage === 100 && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
