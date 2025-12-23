"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  Loader2,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  BarChart3,
  Brain,
  Sparkles,
  ChevronRight,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getDashboardAnalytics } from "@/lib/actions/dashboard-analytics.action";
import { getProfile } from "@/lib/actions/profile.action";
import { getCurrentUser } from "@/lib/auth";
import { getMyAccess } from "@/lib/actions/rbac.action";

const STATUS_COLORS: Record<string, string> = {
  WISHLIST: "#94a3b8",
  APPLIED: "#3b82f6",
  INTERVIEWING: "#8b5cf6",
  OFFER: "#22c55e",
  REJECTED: "#ef4444",
  ACCEPTED: "#10b981",
};

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const accessRes = await getMyAccess();
      if (accessRes.data?.isAdmin) {
        router.replace("/dashboard/admin");
        return;
      }

      const [analyticsResult, profileResult] = await Promise.all([
        getDashboardAnalytics(),
        getProfile(user.id),
      ]);

      if (analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      }

      if (profileResult.data) {
        setUserName(profileResult.data.firstName || "there");
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Failed to load analytics</p>
          <Button onClick={loadData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const levelProgress = analytics.xpToNextLevel > 0
    ? Math.round(((analytics.totalXp % 500) / 500) * 100)
    : 100;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here's your job search progress at a glance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/jobs")}>
            <Briefcase className="h-4 w-4 mr-2" />
            Browse Jobs
          </Button>
          <Button onClick={() => router.push("/dashboard/training")}>
            <Brain className="h-4 w-4 mr-2" />
            Practice Interview
          </Button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/20 dark:border-primary/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary dark:text-primary/90 font-medium">Applications</p>
                <p className="text-3xl font-bold text-primary dark:text-primary/90">{analytics.totalApplications}</p>
                <p className="text-xs text-primary/80 dark:text-primary/70 mt-1">
                  +{analytics.applicationsThisWeek} this week
                </p>
              </div>
              <div className="p-3 bg-primary rounded-xl">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Training Sessions</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{analytics.totalTrainingSessions}</p>
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  Avg score: {analytics.avgTrainingScore}%
                </p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <Brain className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Lessons Completed</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{analytics.totalLessonsCompleted}</p>
                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                  {analytics.chaptersCompleted} chapters done
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Current Streak</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{analytics.currentStreak} days</p>
                <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                  Best: {analytics.longestStreak} days
                </p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Your activity over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="applications" name="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="training" name="Training" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="study" name="Study" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Training Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Training Score Trend
              </CardTitle>
              <CardDescription>Your performance over recent sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {analytics.trainingScoreTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.trainingScoreTrend}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#scoreGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Brain className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">Complete training sessions to see your progress</p>
                      <Button variant="outline" className="mt-3" onClick={() => router.push("/dashboard/training")}>
                        Start Training
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Application Pipeline
              </CardTitle>
              <CardDescription>Status breakdown of your applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[200px]">
                  {analytics.applicationsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.applicationsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="status"
                        >
                          {analytics.applicationsByStatus.map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">No applications yet</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {analytics.applicationsByStatus.map((item: any) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[item.status] || "#94a3b8" }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {item.status.toLowerCase()}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                  ))}
                  {analytics.applicationsByStatus.length === 0 && (
                    <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/jobs")}>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Find Jobs to Apply
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Quick Actions */}
        <div className="space-y-6">
          {/* XP & Level Card */}
          <Card className="bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Level {analytics.currentLevel}
              </CardTitle>
              <CardDescription>{analytics.levelTitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics.totalXp.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Progress to Level {analytics.currentLevel + 1}</span>
                  <span>{analytics.xpToNextLevel} XP to go</span>
                </div>
                <Progress value={levelProgress} className="h-2" />
              </div>
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <p className="font-bold text-green-600 dark:text-green-400">+{analytics.weeklyXp}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">
                    {analytics.achievementsUnlocked}/{analytics.totalAchievements}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Skills Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.topStrengths.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                    ✓ Strengths
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {analytics.topStrengths.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {analytics.areasToImprove.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    ↗ Areas to Improve
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {analytics.areasToImprove.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {analytics.topStrengths.length === 0 && analytics.areasToImprove.length === 0 && (
                <div className="text-center py-4">
                  <Brain className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Complete training sessions to discover your skills
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => router.push("/dashboard/jobs")}
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  Search Jobs
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => router.push("/dashboard/training")}
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Practice Interview
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => router.push("/dashboard/study")}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  Study Room
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => router.push("/dashboard/community")}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Community
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Application Trend Mini Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Application Trend
              </CardTitle>
              <CardDescription>Last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.applicationTrend}>
                    <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Clock className="h-5 w-5 text-primary dark:text-primary/90" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(analytics.totalStudyTimeMinutes / 60)}h
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Study Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.highestScore}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Best Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.applicationsThisMonth}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Apps This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.achievementsUnlocked}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
