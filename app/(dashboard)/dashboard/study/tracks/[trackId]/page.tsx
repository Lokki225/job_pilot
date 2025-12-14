"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getChaptersWithProgress } from "@/lib/actions/study.action";
import type { ChapterWithProgress, StudyRoomHomeData } from "@/lib/types/study.types";
import { CAREER_TRACKS, type CareerTrackId } from "@/lib/services/study-content/types";

type TrackId = CareerTrackId | "general";

export default function StudyTrackDetailPage() {
  const params = useParams();
  const trackId = (params.trackId as string) as TrackId;

  const [data, setData] = useState<StudyRoomHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getChaptersWithProgress();
        if (res.error) {
          setError(res.error);
        } else {
          setData(res.data);
        }
      } catch (e) {
        setError("Failed to load track");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const trackInfo = useMemo(() => {
    if (trackId === "general") {
      return { name: "General", description: "Core interview fundamentals", icon: "📚" };
    }

    const t = (CAREER_TRACKS as any)[trackId];
    if (!t) return null;
    return { name: t.name, description: t.description, icon: t.icon };
  }, [trackId]);

  const chapters: ChapterWithProgress[] = useMemo(() => {
    const list = (data?.chapters || []).filter((c) => (c.careerTrackId || "general") === trackId);
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [data, trackId]);

  if (!trackInfo) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="rounded-lg border p-6">
          <h1 className="text-xl font-semibold">Track not found</h1>
          <p className="mt-2 text-muted-foreground">This career track does not exist.</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard/study/tracks">Back to Tracks</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/study/tracks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>{trackInfo.icon}</span>
              {trackInfo.name}
            </h1>
            <p className="text-muted-foreground">{trackInfo.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/study/community-plans">
            <Button variant="outline">Community Plans</Button>
          </Link>
          <Link href="/dashboard/study/my-plans">
            <Button variant="outline">My Plans</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No chapters yet for this track.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {chapters.map((chapter) => (
            <TrackChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackChapterCard({ chapter }: { chapter: ChapterWithProgress }) {
  const isLocked = !chapter.isUnlocked;
  const isCompleted = chapter.progressPercentage === 100;

  return (
    <Link
      href={isLocked ? "#" : `/dashboard/study/chapter/${chapter.id}`}
      className={isLocked ? "cursor-not-allowed" : ""}
    >
      <Card
        className={`transition-all duration-200 h-full ${
          isLocked
            ? "opacity-60 bg-gray-50 dark:bg-gray-800/50"
            : "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800"
        } ${isCompleted ? "border-green-300 dark:border-green-700" : "border-gray-200 dark:border-gray-700"}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{chapter.icon}</span>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  {chapter.title}
                  {chapter.isPremium && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Pro
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">{chapter.description}</CardDescription>
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
            <span>
              {chapter.completedLessons}/{chapter.totalLessons} lessons
            </span>
            <span>{chapter.estimatedMinutes} min</span>
          </div>
          <Progress value={chapter.progressPercentage} className="h-2 bg-gray-100 dark:bg-gray-700" />
        </CardContent>
      </Card>
    </Link>
  );
}
