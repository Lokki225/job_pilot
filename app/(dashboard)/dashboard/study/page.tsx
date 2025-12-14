"use client";

import { useState, useEffect } from "react";
import { BookOpen, Trophy, Clock, Flame, ChevronRight, Loader2, Briefcase, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { StudyRoomHomeData, ChapterWithProgress } from "@/lib/types/study.types";
import { getChaptersWithProgress, getJobStudyModules, type JobStudyModuleSummary } from "@/lib/actions/study.action";

export default function StudyRoomPage() {
  const [data, setData] = useState<StudyRoomHomeData | null>(null);
  const [modules, setModules] = useState<JobStudyModuleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modulesOpen, setModulesOpen] = useState(true);

  useEffect(() => {
    async function loadStudyData() {
      try {
        const result = await getChaptersWithProgress();
        const modulesResult = await getJobStudyModules();
        
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }

        if (!modulesResult.error && modulesResult.data) {
          setModules(modulesResult.data);
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📖 Study Room
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Master the art of interviewing with our structured curriculum
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/study/tracks">
            <Button variant="outline" className="h-11 gap-2">
              🎯 Browse Chapters
            </Button>
          </Link>
          <Link href="/dashboard/study/community-plans">
            <Button variant="outline" className="h-11 gap-2">
              🌐 Community Plans
            </Button>
          </Link>
          <Link href="/dashboard/study/my-plans">
            <Button variant="outline" className="h-11 gap-2">
              <BookOpen className="h-4 w-4" />
              My Plans
            </Button>
          </Link>
        </div>
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

      <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Briefcase className="h-5 w-5" />
                Job-specific Modules
              </CardTitle>
              <CardDescription>
                Mini study tracks generated from your Interview Prep Packs
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={modulesOpen ? "Collapse job-specific modules" : "Expand job-specific modules"}
              aria-expanded={modulesOpen}
              onClick={() => setModulesOpen((v) => !v)}
              className="shrink-0"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${modulesOpen ? "rotate-180" : "rotate-0"}`}
              />
            </Button>
          </div>
        </CardHeader>

        {modulesOpen && (
          <CardContent>
            {modules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((m) => (
                  <Link key={m.id} href={`/dashboard/study/module/${m.id}`}>
                    <Card className="hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-gray-900 dark:text-white">
                          {m.jobTitle} @ {m.companyName}
                        </CardTitle>
                        <CardDescription>
                          {m.moduleGenerated ? `${m.moduleProgressPercent}% complete` : "Not generated"} • {m.totalTopics} topics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={m.moduleProgressPercent} />
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant="outline">
                            Open Module <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No job-specific modules yet. Create an Interview Prep Pack to get started.
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/training/prep">
                    Create Prep Pack <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

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

      {/* Study Analytics */}
      <StudyRoomAnalytics data={data} />
    </div>
  );
}

function StudyRoomAnalytics({ data }: { data: StudyRoomHomeData }) {
  const totalLessons = data.overallProgress.totalLessons;
  const completedLessons = data.overallProgress.completedLessons;
  const lessonCompletionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const totalChapters = data.chapters.length;
  const unlockedChapters = data.chapters.filter((c) => c.isUnlocked).length;
  const completedChapters = data.chapters.filter((c) => c.progressPercentage === 100).length;
  const chapterUnlockRate = totalChapters > 0 ? Math.round((unlockedChapters / totalChapters) * 100) : 0;

  const totalMinutesSpent = Math.floor(data.overallProgress.totalTimeSpent / 60);
  const avgMinutesPerLesson = completedLessons > 0 ? Math.max(1, Math.round(totalMinutesSpent / completedLessons)) : 0;

  const remainingMinutes = data.chapters.reduce((sum, c) => {
    const remaining = c.estimatedMinutes * (1 - c.progressPercentage / 100);
    return sum + Math.max(0, Math.round(remaining));
  }, 0);

  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  const daysAt30Min = remainingMinutes > 0 ? Math.ceil(remainingMinutes / 30) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Study Analytics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">A snapshot of your progress and momentum</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/30 border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 dark:text-white">Learning Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overallProgress.percentage}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Lessons</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {completedLessons}/{totalLessons}
                </p>
              </div>
            </div>

            <Progress value={data.overallProgress.percentage} className="h-2 bg-blue-100 dark:bg-blue-900/40 [&>div]:bg-blue-600" />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Lesson completion</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{lessonCompletionRate}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Chapters done</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{completedChapters}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Chapters unlocked</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{unlockedChapters}/{totalChapters}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Unlock progress</span>
                <span className="font-medium text-gray-900 dark:text-white">{chapterUnlockRate}%</span>
              </div>
              <Progress value={chapterUnlockRate} className="h-2 bg-gray-100 dark:bg-gray-800 [&>div]:bg-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-emerald-50 dark:from-gray-900 dark:to-emerald-950/30 border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 dark:text-white">Momentum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Current streak</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {data.overallProgress.currentStreak} days
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Avg pace</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {avgMinutesPerLesson > 0 ? `${avgMinutesPerLesson} min/lesson` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Estimated time remaining</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {remainingMinutes === 0 ? "You're all caught up" : `${remainingHours}h ${remainingMins}m`}
                  </p>
                </div>
                <Trophy className="h-6 w-6 text-emerald-600" />
              </div>

              {remainingMinutes > 0 && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  If you study 30 min/day, you can finish in about <span className="font-medium text-gray-900 dark:text-white">{daysAt30Min} days</span>.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
