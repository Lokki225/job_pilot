"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Loader2, Medal, Trophy, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboard, getUserXP } from "@/lib/services/gamification.service";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
}

interface UserXPData {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  weeklyXp: number;
  progressPercent: number;
}

export default function LeaderboardPage() {
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userXP, setUserXP] = useState<UserXPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weekly");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [weeklyResult, monthlyResult, allTimeResult, userResult] = await Promise.all([
        getLeaderboard("weekly", 10),
        getLeaderboard("monthly", 10),
        getLeaderboard("all", 10),
        getUserXP(),
      ]);

      if (weeklyResult.data) setWeeklyLeaderboard(weeklyResult.data);
      if (monthlyResult.data) setMonthlyLeaderboard(monthlyResult.data);
      if (allTimeResult.data) setAllTimeLeaderboard(allTimeResult.data);
      if (userResult.data) setUserXP(userResult.data);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-gray-500 w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    if (rank === 1) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    if (rank === 2) return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    if (rank === 3) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  };

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (entries.length === 0) {
      return (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No data yet. Start practicing to appear on the leaderboard!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${getRankBg(entry.rank, entry.isCurrentUser)}`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(entry.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-medium truncate ${entry.isCurrentUser ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                  {entry.displayName}
                  {entry.isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                </p>
                <Badge variant="secondary" className="text-xs">
                  Lvl {entry.level}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-purple-600 dark:text-purple-400">{entry.xp.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">XP</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/community/hub">
            <Users className="h-4 w-4 mr-2" />
            Community Hub
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See how you rank against other job seekers
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="weekly">This Week</TabsTrigger>
                    <TabsTrigger value="monthly">This Month</TabsTrigger>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {activeTab === "weekly" && renderLeaderboard(weeklyLeaderboard)}
                {activeTab === "monthly" && renderLeaderboard(monthlyLeaderboard)}
                {activeTab === "all" && renderLeaderboard(allTimeLeaderboard)}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Your Stats */}
          <div className="space-y-6">
            {userXP && (
              <Card className="bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {userXP.totalXp.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{userXP.currentLevel}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Level</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{userXP.weeklyXp}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                      {userXP.levelTitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Earn XP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Complete a lesson</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">+25 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pass a quiz</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">+50 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Training session</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">+30 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Score 90+ in training</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">+100 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Share success story</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">+200 XP</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
