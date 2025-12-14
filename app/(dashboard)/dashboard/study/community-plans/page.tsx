"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Loader2, MessageCircle, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPublicStudyPlans,
  toggleStudyPlanLike,
  type PublicStudyPlanSummary,
} from "@/lib/actions/custom-study-plan.action";

export default function CommunityPlansPage() {
  const [plans, setPlans] = useState<PublicStudyPlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setIsLoading(true);
    try {
      const res = await getPublicStudyPlans();
      if (res.error) {
        setError(res.error);
      } else {
        setPlans(res.data || []);
      }
    } catch (e) {
      setError("Failed to load community plans");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike(planId: string) {
    const res = await toggleStudyPlanLike(planId);
    if (!res.error) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                likeCount: res.data?.liked ? p.likeCount + 1 : p.likeCount - 1,
                likedByMe: res.data?.liked ?? p.likedByMe,
              }
            : p
        )
      );
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/study">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Community Plans</h1>
            <p className="text-muted-foreground">Study plans created and shared by the community</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/study/tracks">
            <Button variant="outline">Career Tracks</Button>
          </Link>
          <Link href="/dashboard/study/my-plans">
            <Button>My Plans</Button>
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
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No public study plans yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your own plan and make it public to share with the community!
            </p>
            <div className="mt-4">
              <Link href="/dashboard/study/my-plans">
                <Button>Create a Plan</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <CommunityPlanCard key={plan.id} plan={plan} onLike={handleLike} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityPlanCard({
  plan,
  onLike,
}: {
  plan: PublicStudyPlanSummary;
  onLike: (id: string) => void;
}) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      {plan.coverImageUrl && (
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          <Image
            src={plan.coverImageUrl}
            alt={plan.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/study/community-plans/${plan.id}`} className="flex-1">
            <CardTitle className="line-clamp-1 text-lg hover:underline">{plan.title}</CardTitle>
          </Link>
        </div>
        {plan.description && (
          <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={plan.author.avatarUrl || undefined} />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{plan.author.name}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{plan.chapterCount} chapters</Badge>
          <Badge variant="outline">{plan.lessonCount} lessons</Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onLike(plan.id)}
              className={`flex items-center gap-1 text-sm transition-colors ${
                plan.likedByMe
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${plan.likedByMe ? "fill-current" : ""}`} />
              {plan.likeCount}
            </button>
            <Link
              href={`/dashboard/study/community-plans/${plan.id}#comments`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              {plan.commentCount}
            </Link>
          </div>
          <Link href={`/dashboard/study/community-plans/${plan.id}`}>
            <Button size="sm" variant="outline">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
