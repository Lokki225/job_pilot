"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Briefcase, CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateJobStudyModule, getJobStudyModule, toggleJobStudyModuleTopic, type JobStudyModuleDetail } from "@/lib/actions/study.action";

export default function JobStudyModulePage() {
  const params = useParams();
  const prepPackId = params.prepPackId as string;

  const [data, setData] = useState<JobStudyModuleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateJobStudyModule(prepPackId);
      if (result.error) {
        setError(result.error);
        return;
      }

      const refreshed = await getJobStudyModule(prepPackId);
      if (refreshed.error) {
        setError(refreshed.error);
      } else if (refreshed.data) {
        setData(refreshed.data);
        const ids = Array.isArray(refreshed.data.studyModuleProgress?.completedTopicIds)
          ? refreshed.data.studyModuleProgress?.completedTopicIds
          : [];
        setCompletedTopicIds(new Set(ids));
      }
    } catch (err) {
      console.error("Error generating module:", err);
      setError("Failed to generate module");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTopic = async (topicId: string) => {
    setError(null);

    const prev = completedTopicIds;
    const next = new Set(prev);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    setCompletedTopicIds(next);

    try {
      const result = await toggleJobStudyModuleTopic(prepPackId, topicId);
      if (result.error) {
        setCompletedTopicIds(prev);
        setError(result.error);
        return;
      }

      if (result.data?.moduleProgressPercent !== undefined) {
        setData((d) => (d ? { ...d, moduleProgressPercent: result.data!.moduleProgressPercent } : d));
      }
    } catch (err) {
      console.error("Error toggling topic:", err);
      setCompletedTopicIds(prev);
      setError("Failed to update topic");
    }
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getJobStudyModule(prepPackId);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
          const ids = Array.isArray(result.data.studyModuleProgress?.completedTopicIds)
            ? result.data.studyModuleProgress?.completedTopicIds
            : [];
          setCompletedTopicIds(new Set(ids));
        }
      } catch (err) {
        console.error("Error loading module:", err);
        setError("Failed to load module");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [prepPackId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="outline" asChild>
          <Link href="/dashboard/study">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Study Room
          </Link>
        </Button>
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Module unavailable</CardTitle>
              <CardDescription>{error || "This module could not be loaded."}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/study">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study Room
            </Link>
          </Button>

          <div className="mt-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-7 w-7" />
              {data.jobTitle} @ {data.companyName}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">Job-specific module</Badge>
              <Badge variant="outline">{data.moduleProgressPercent}% complete</Badge>
              <Badge variant="outline">{data.totalTopics} topics</Badge>
              {!data.moduleGenerated && <Badge variant="outline">Not generated</Badge>}
            </div>
            <div className="mt-4 max-w-xl">
              <Progress value={data.moduleProgressPercent} />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/training/prep/${data.id}`}>
              Open Prep Pack
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/training">
              <BookOpen className="h-4 w-4 mr-2" />
              Practice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {!data.moduleGenerated && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Generate your module curriculum</CardTitle>
              <CardDescription>
                This will create chapters and topic-to-lesson recommendations you can follow and check off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Curriculum"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recommended Lessons
            </CardTitle>
            <CardDescription>
              Based on your job post keywords and generated study topics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendedLessons.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No strong matches found yet. Use the Study Topics list to pick what to review.
              </div>
            ) : (
              data.recommendedLessons.map((l) => (
                <Link key={l.id} href={`/dashboard/study/lesson/${l.id}`}>
                  <Card className="hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {l.title}
                      </CardTitle>
                      <CardDescription>
                        {l.chapter?.title ? `${l.chapter.title} • ` : ""}{l.estimatedMinutes} min
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {l.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          {l.isPremium && <Badge variant="secondary">Pro</Badge>}
                          <Badge variant="outline">Match {l.matchScore}</Badge>
                        </div>
                        <Button size="sm" variant="outline">Open</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Topics</CardTitle>
            <CardDescription>
              A mini curriculum tailored to this job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.studyTopics.length === 0 ? (
              <div className="text-sm text-muted-foreground">No study topics available for this module.</div>
            ) : (
              data.studyTopics.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{t.title}</span>
                      {t.priority && <Badge variant="outline">{t.priority}</Badge>}
                    </CardTitle>
                    {(t.estimatedMinutes || t.description) && (
                      <CardDescription>
                        {t.estimatedMinutes ? `${t.estimatedMinutes} min` : ""}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {t.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {data.moduleGenerated && data.chapters.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Curriculum</CardTitle>
            <CardDescription>
              Follow chapters, complete topics, and jump into matching lessons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.chapters.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  {c.description && <CardDescription>{c.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.topics.map((t) => {
                    const isDone = completedTopicIds.has(t.id);
                    return (
                      <div key={t.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleTopic(t.id)}
                            className="mt-0.5"
                          >
                            {isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
                          </Button>
                          <div>
                            <div className="font-medium">{t.title}</div>
                            {(t.estimatedMinutes || t.description) && (
                              <div className="text-sm text-muted-foreground">
                                {t.estimatedMinutes ? `${t.estimatedMinutes} min` : ""}
                                {t.estimatedMinutes && t.description ? " • " : ""}
                                {t.description || ""}
                              </div>
                            )}
                            {t.recommendedLessons.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {t.recommendedLessons.map((l) => (
                                  <Button key={l.id} size="sm" variant="outline" asChild>
                                    <Link href={`/dashboard/study/lesson/${l.id}`}>{l.title}</Link>
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {t.priority && <Badge variant="outline">{t.priority}</Badge>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {data.extractedKeywords.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Focus Keywords</CardTitle>
            <CardDescription>
              What this module is optimizing for
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.extractedKeywords.slice(0, 20).map((k) => (
              <Badge key={k} variant="secondary">{k}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
