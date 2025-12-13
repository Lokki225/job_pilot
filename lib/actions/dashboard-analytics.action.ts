"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";

// ===========================================================
// TYPES
// ===========================================================

export interface DashboardAnalytics {
  // Overview Stats
  totalApplications: number;
  applicationsThisWeek: number;
  applicationsThisMonth: number;
  
  // Application Status Breakdown
  applicationsByStatus: { status: string; count: number }[];
  
  // Training Stats
  totalTrainingSessions: number;
  trainingSessionsThisWeek: number;
  avgTrainingScore: number;
  highestScore: number;
  
  // Study Stats
  totalLessonsCompleted: number;
  totalStudyTimeMinutes: number;
  chaptersCompleted: number;
  
  // XP & Level
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  weeklyXp: number;
  xpToNextLevel: number;
  
  // Achievements
  achievementsUnlocked: number;
  totalAchievements: number;
  
  // Streak
  currentStreak: number;
  longestStreak: number;
  
  // Weekly Activity (last 7 days)
  weeklyActivity: { day: string; applications: number; training: number; study: number }[];
  
  // Application Trend (last 4 weeks)
  applicationTrend: { week: string; count: number }[];
  
  // Training Score Trend (last 10 sessions)
  trainingScoreTrend: { session: number; score: number; date: string }[];
  
  // Top Skills from Training
  topStrengths: string[];
  areasToImprove: string[];
}

// ===========================================================
// GET DASHBOARD ANALYTICS
// ===========================================================

export async function getDashboardAnalytics(): Promise<{
  data: DashboardAnalytics | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { data: null, error: "Unauthorized" };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel fetch all data
    const [
      applicationsResult,
      trainingResult,
      studyResult,
      xpResult,
      achievementsResult,
      statsResult,
    ] = await Promise.all([
      // Applications
      adminSupabase
        .from("job_applications")
        .select("id, status, createdAt")
        .eq("userId", user.id),
      
      // Training sessions
      adminSupabase
        .from("training_sessions")
        .select("id, overallScore, status, createdAt, completedAt")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false }),
      
      // Study progress
      adminSupabase
        .from("user_study_progress")
        .select("id, status, timeSpentSeconds, lessonId, createdAt")
        .eq("userId", user.id),
      
      // User XP
      adminSupabase
        .from("user_xp")
        .select("totalXp, currentLevel, weeklyXp, xpToNextLevel")
        .eq("userId", user.id)
        .single(),
      
      // Achievements
      adminSupabase
        .from("user_achievements")
        .select("id, unlockedAt")
        .eq("userId", user.id),
      
      // Interview stats (for streaks)
      adminSupabase
        .from("user_interview_stats")
        .select("currentStreakDays, longestStreakDays")
        .eq("userId", user.id)
        .single(),
    ]);

    // Get total achievements count
    const { count: totalAchievementsCount } = await adminSupabase
      .from("achievements")
      .select("*", { count: "exact", head: true });

    const applications = applicationsResult.data || [];
    const trainingSessions = trainingResult.data || [];
    const studyProgress = studyResult.data || [];
    const userXp = xpResult.data;
    const userAchievements = achievementsResult.data || [];
    const interviewStats = statsResult.data;

    // Calculate application stats
    const applicationsThisWeek = applications.filter(
      (a) => new Date(a.createdAt) >= weekAgo
    ).length;
    const applicationsThisMonth = applications.filter(
      (a) => new Date(a.createdAt) >= monthAgo
    ).length;

    // Application status breakdown
    const statusCounts: Record<string, number> = {};
    applications.forEach((a) => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    const applicationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Training stats
    const completedSessions = trainingSessions.filter((s) => s.status === "COMPLETED");
    const trainingSessionsThisWeek = completedSessions.filter(
      (s) => new Date(s.completedAt || s.createdAt) >= weekAgo
    ).length;
    const scores = completedSessions.map((s) => s.overallScore || 0).filter((s) => s > 0);
    const avgTrainingScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Study stats
    const completedLessons = studyProgress.filter((s) => s.status === "COMPLETED");
    const totalStudyTimeMinutes = Math.round(
      studyProgress.reduce((sum, s) => sum + (s.timeSpentSeconds || 0), 0) / 60
    );

    // Get unique chapters completed
    const { data: chaptersData } = await adminSupabase
      .from("user_study_progress")
      .select("lesson:study_lessons(chapterId)")
      .eq("userId", user.id)
      .eq("status", "COMPLETED");
    
    const uniqueChapters = new Set(
      (chaptersData || [])
        .map((c: any) => c.lesson?.chapterId)
        .filter(Boolean)
    );

    // Level title mapping
    const levelTitles: Record<number, string> = {
      1: "Beginner",
      2: "Job Seeker",
      3: "Applicant",
      4: "Interviewer",
      5: "Candidate",
      6: "Contender",
      7: "Professional",
      8: "Expert",
      9: "Master",
      10: "Interview Champion",
    };

    // Weekly activity (last 7 days)
    const weeklyActivity: { day: string; applications: number; training: number; study: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayApps = applications.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;
      
      const dayTraining = completedSessions.filter((s) => {
        const d = new Date(s.completedAt || s.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;
      
      const dayStudy = studyProgress.filter((s) => {
        const d = new Date(s.createdAt);
        return d >= dayStart && d <= dayEnd && s.status === "COMPLETED";
      }).length;

      weeklyActivity.push({
        day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        applications: dayApps,
        training: dayTraining,
        study: dayStudy,
      });
    }

    // Application trend (last 4 weeks)
    const applicationTrend: { week: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const weekApps = applications.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      applicationTrend.push({
        week: `Week ${4 - i}`,
        count: weekApps,
      });
    }

    // Training score trend (last 10 sessions)
    const recentSessions = completedSessions.slice(0, 10).reverse();
    const trainingScoreTrend = recentSessions.map((s, idx) => ({
      session: idx + 1,
      score: s.overallScore || 0,
      date: new Date(s.completedAt || s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

    // Get strengths and weaknesses from recent training
    const { data: recentAnswers } = await adminSupabase
      .from("training_answers")
      .select("strengths, weaknesses")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(20);

    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    (recentAnswers || []).forEach((a: any) => {
      if (Array.isArray(a.strengths)) allStrengths.push(...a.strengths);
      if (Array.isArray(a.weaknesses)) allWeaknesses.push(...a.weaknesses);
    });

    // Count occurrences and get top 5
    const countOccurrences = (arr: string[]) => {
      const counts: Record<string, number> = {};
      arr.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([item]) => item);
    };

    const analytics: DashboardAnalytics = {
      // Overview
      totalApplications: applications.length,
      applicationsThisWeek,
      applicationsThisMonth,
      
      // Status breakdown
      applicationsByStatus,
      
      // Training
      totalTrainingSessions: completedSessions.length,
      trainingSessionsThisWeek,
      avgTrainingScore,
      highestScore,
      
      // Study
      totalLessonsCompleted: completedLessons.length,
      totalStudyTimeMinutes,
      chaptersCompleted: uniqueChapters.size,
      
      // XP & Level
      totalXp: userXp?.totalXp || 0,
      currentLevel: userXp?.currentLevel || 1,
      levelTitle: levelTitles[userXp?.currentLevel || 1] || "Beginner",
      weeklyXp: userXp?.weeklyXp || 0,
      xpToNextLevel: userXp?.xpToNextLevel || 100,
      
      // Achievements
      achievementsUnlocked: userAchievements.filter((a) => a.unlockedAt).length,
      totalAchievements: totalAchievementsCount || 13,
      
      // Streaks
      currentStreak: interviewStats?.currentStreakDays || 0,
      longestStreak: interviewStats?.longestStreakDays || 0,
      
      // Charts data
      weeklyActivity,
      applicationTrend,
      trainingScoreTrend,
      
      // Skills
      topStrengths: countOccurrences(allStrengths),
      areasToImprove: countOccurrences(allWeaknesses),
    };

    return { data: analytics, error: null };
  } catch (err) {
    console.error("Error getting dashboard analytics:", err);
    return { data: null, error: "Failed to load analytics" };
  }
}
