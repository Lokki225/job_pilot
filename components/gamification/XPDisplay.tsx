"use client";

import { useEffect, useState } from "react";
import { Trophy, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUserXP } from "@/lib/services/gamification.service";

interface XPData {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  xpToNextLevel: number;
  weeklyXp: number;
  progressPercent: number;
}

export function XPDisplay({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<XPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadXP();
  }, []);

  async function loadXP() {
    try {
      const result = await getUserXP();
      if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error("Error loading XP:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || !data) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-200 dark:border-purple-800">
        <Zap className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Lvl {data.currentLevel}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {data.totalXp} XP
        </span>
      </div>
    );
  }

  return (
    <Card className="bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-purple-500 to-blue-500 rounded-xl">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Level {data.currentLevel}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{data.levelTitle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.totalXp}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total XP</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress to Level {data.currentLevel + 1}</span>
            <span className="font-medium text-gray-900 dark:text-white">{data.progressPercent}%</span>
          </div>
          <Progress value={data.progressPercent} className="h-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {data.xpToNextLevel} XP to next level
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">This week</span>
          </div>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">+{data.weeklyXp} XP</span>
        </div>
      </CardContent>
    </Card>
  );
}
