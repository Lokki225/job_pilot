"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getChaptersWithProgress } from "@/lib/actions/study.action";
import type { ChapterWithProgress, StudyRoomHomeData } from "@/lib/types/study.types";
import { CAREER_TRACKS, type CareerTrackId } from "@/lib/services/study-content/types";

type TrackCard = {
  id: CareerTrackId | "general";
  name: string;
  description: string;
  icon: string;
};

export default function StudyTracksPage() {
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
        setError("Failed to load career tracks");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const tracks: TrackCard[] = useMemo(() => {
    const predefined = Object.values(CAREER_TRACKS).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
    }));

    return [
      ...predefined,
      {
        id: "general",
        name: "General",
        description: "Core interview fundamentals applicable to any career",
        icon: "📚",
      },
    ];
  }, []);

  const countsByTrack = useMemo(() => {
    const counts = new Map<string, { total: number; unlocked: number; completed: number }>();

    const chapters: ChapterWithProgress[] = data?.chapters || [];
    for (const chapter of chapters) {
      const trackId = chapter.careerTrackId || "general";
      const current = counts.get(trackId) || { total: 0, unlocked: 0, completed: 0 };
      current.total += 1;
      if (chapter.isUnlocked) current.unlocked += 1;
      if (chapter.progressPercentage === 100) current.completed += 1;
      counts.set(trackId, current);
    }

    return counts;
  }, [data]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/study">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Career Tracks</h1>
            <p className="text-muted-foreground">Pick a track to study our predefined curriculum</p>
          </div>
        </div>
        <Link href="/dashboard/study/community-plans">
          <Button variant="outline">Browse Community Plans</Button>
        </Link>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => {
            const stats = countsByTrack.get(t.id) || { total: 0, unlocked: 0, completed: 0 };

            return (
              <Link key={t.id} href={`/dashboard/study/tracks/${t.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{t.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{t.name}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">{t.description}</CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{stats.total} chapters</Badge>
                      <Badge variant="outline">{stats.unlocked} unlocked</Badge>
                      <Badge variant="outline">{stats.completed} completed</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
