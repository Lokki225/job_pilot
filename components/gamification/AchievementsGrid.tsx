"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getUserAchievements } from "@/lib/services/achievements.service";

interface AchievementWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  isSecret: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  requirementValue: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  STUDY: "Study Room",
  TRAINING: "Training Room",
  COMMUNITY: "Community",
  MILESTONE: "Milestones",
};

export function AchievementsGrid({ compact = false }: { compact?: boolean }) {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    try {
      const result = await getUserAchievements();
      if (result.data) {
        setAchievements(result.data);
      }
    } catch (err) {
      console.error("Error loading achievements:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No achievements available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalPoints = achievements
    .filter((a) => a.isUnlocked)
    .reduce((sum, a) => sum + a.points, 0);

  // Group by category
  const grouped = achievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, AchievementWithProgress[]>);

  if (compact) {
    // Show only unlocked achievements in a row
    const unlocked = achievements.filter((a) => a.isUnlocked).slice(0, 5);
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {unlocked.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-full border border-yellow-200 dark:border-yellow-800"
            title={`${a.title}: ${a.description}`}
          >
            <span>{a.icon}</span>
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">{a.title}</span>
          </div>
        ))}
        {achievements.filter((a) => a.isUnlocked).length > 5 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{achievements.filter((a) => a.isUnlocked).length - 5} more
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Achievements</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unlockedCount} of {achievements.length} unlocked • {totalPoints} points earned
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          🏆 {unlockedCount}/{achievements.length}
        </Badge>
      </div>

      {/* Categories */}
      {Object.entries(grouped).map(([category, categoryAchievements]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementWithProgress }) {
  const progressPercent =
    achievement.requirementValue > 0
      ? Math.min(100, Math.round((achievement.progress / achievement.requirementValue) * 100))
      : 0;

  const isSecret = achievement.isSecret && !achievement.isUnlocked;

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        achievement.isUnlocked
          ? "bg-linear-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800"
          : "bg-gray-50 dark:bg-gray-800/50"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`text-2xl ${
              achievement.isUnlocked ? "" : "grayscale opacity-50"
            }`}
          >
            {isSecret ? "❓" : achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h5
                className={`font-medium truncate ${
                  achievement.isUnlocked
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isSecret ? "Secret Achievement" : achievement.title}
              </h5>
              {achievement.isUnlocked && (
                <Badge className="bg-yellow-500 text-white border-0 text-xs">
                  +{achievement.points}
                </Badge>
              )}
            </div>
            <p
              className={`text-xs mt-0.5 ${
                achievement.isUnlocked
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {isSecret ? "Keep playing to discover!" : achievement.description}
            </p>

            {!achievement.isUnlocked && !isSecret && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>
                    {achievement.progress}/{achievement.requirementValue}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            {achievement.isUnlocked && achievement.unlockedAt && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Unlocked{" "}
                {new Date(achievement.unlockedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {!achievement.isUnlocked && (
            <Lock className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
