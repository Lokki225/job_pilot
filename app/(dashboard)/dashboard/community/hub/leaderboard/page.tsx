"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Medal,
  Award,
  TrendingUp,
  MessageSquare,
  Heart,
  Crown,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCommunityLeaderboard,
  type LeaderboardEntry,
} from "@/lib/actions/community.action";
import { syncCurrentUserReputation } from "@/lib/services/gamification.service";
import { Loader2 as Spinner } from "lucide-react";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
}

function getRankBgColor(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800";
  if (rank === 2) return "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-700";
  if (rank === 3) return "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800";
  return "";
}

export default function CommunityLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setIsLoading(true);
    try {
      const res = await getCommunityLeaderboard({ limit: 50 });
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setLeaderboard(res.data);
      }
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      setError("Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const response = await fetch("/api/leaderboard/sync", {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Sync failed");
      }
      setSyncMessage(`Synced ${payload.data?.processed ?? 0} profiles. Your RP will update shortly.`);
      await loadLeaderboard();
      await syncCurrentUserReputation();
    } catch (err) {
      console.error("Error syncing leaderboard reputation:", err);
      setSyncMessage("Unable to sync reputation right now. Please try again later.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/community/hub">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Community Leaderboard
              </h1>
              <p className="text-muted-foreground">Top contributors in the Job Pilot community</p>
            </div>
            <Button onClick={handleSync} disabled={isSyncing} variant="secondary" className="flex items-center gap-2">
              {isSyncing && <Spinner className="h-4 w-4 animate-spin" />}
              {isSyncing ? "Syncing..." : "Sync XP → RP"}
            </Button>
          </div>
          {syncMessage && <p className="mt-2 text-sm text-muted-foreground">{syncMessage}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No rankings yet</h3>
            <p className="text-muted-foreground">Be the first to earn reputation points!</p>
            <Link href="/dashboard/community/hub">
              <Button className="mt-4">Start Contributing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {topThree.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {topThree.map((entry, index) => (
                <Card
                  key={entry.userId}
                  className={`${getRankBgColor(entry.rank)} ${
                    index === 0 ? "md:order-2" : index === 1 ? "md:order-1" : "md:order-3"
                  }`}
                >
                  <CardContent className="flex flex-col items-center p-6">
                    <div className="mb-3">{getRankIcon(entry.rank)}</div>
                    <Avatar className={`mb-3 ${entry.rank === 1 ? "h-20 w-20" : "h-16 w-16"}`}>
                      <AvatarImage src={entry.avatarUrl || undefined} />
                      <AvatarFallback className="text-xl">
                        {entry.name[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-center">{entry.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      Level {entry.level}
                    </Badge>
                    <p className="mt-3 text-2xl font-bold text-primary">
                      {entry.reputationPoints.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">reputation points</p>
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {entry.postsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {entry.helpfulVotes}
                      </span>
                    </div>
                    {entry.badges.length > 0 && (
                      <div className="mt-3 flex flex-wrap justify-center gap-1">
                        {entry.badges.slice(0, 3).map((badge) => (
                          <Badge key={badge} variant="outline" className="text-xs">
                            {badge.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rankings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {rest.map((entry) => (
                    <div
                      key={entry.userId}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 text-center font-medium text-muted-foreground">
                        #{entry.rank}
                      </div>
                      <Avatar>
                        <AvatarImage src={entry.avatarUrl || undefined} />
                        <AvatarFallback>{entry.name[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{entry.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            Lv. {entry.level}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {entry.postsCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {entry.helpfulVotes}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {entry.reputationPoints.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                XP ↔ RP balance
              </CardTitle>
              <CardDescription>How Leaderboard reputation is calculated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Reputation Points (RP) mirror your total XP across JobPilot – roughly 1 RP for every 20 XP earned, so
                every study session, training drill, or job milestone powers your community standing automatically.
              </p>
              <p>
                Hit XP milestones to get bonus RP (+100 at 1.5k XP, +250 at 4k XP, +500 at 6k XP) and jump tiers faster
                without grinding separate actions.
              </p>
              <p className="text-xs text-muted-foreground/80">
                RP unlocks perks like mentor eligibility, badge showcases, and leaderboard visibility inside the hub.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                How to Earn Points
              </CardTitle>
              <CardDescription>Contribute to the community and climb the ranks!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Create a Post</p>
                    <p className="text-sm text-muted-foreground">+5 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Receive a Like</p>
                    <p className="text-sm text-muted-foreground">+2 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Helpful Answer</p>
                    <p className="text-sm text-muted-foreground">+10 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Share Success Story</p>
                    <p className="text-sm text-muted-foreground">+25 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Receive Comment</p>
                    <p className="text-sm text-muted-foreground">+1 point</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">First Post Bonus</p>
                    <p className="text-sm text-muted-foreground">+10 points</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
