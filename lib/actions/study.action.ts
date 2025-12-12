"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import type {
  StudyRoomHomeData,
  ChapterDetailData,
  LessonDetailData,
  ChapterWithProgress,
  LessonWithProgress,
  UpdateProgressInput,
  CompleteQuizInput,
  QuizResult,
  StudyStatus,
  STUDY_XP_VALUES,
} from "@/lib/types/study.types";

// ===========================================================
// GET ALL CHAPTERS WITH USER PROGRESS
// ===========================================================
export async function getChaptersWithProgress(): Promise<{
  data: StudyRoomHomeData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Get all chapters
    const { data: chapters, error: chaptersError } = await adminSupabase
      .from("study_chapters")
      .select("*")
      .order("orderIndex");

    if (chaptersError) return { data: null, error: chaptersError.message };

    // Get all lessons
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from("study_lessons")
      .select("id, chapterId")
      .order("orderIndex");

    if (lessonsError) return { data: null, error: lessonsError.message };

    // Get user's progress
    const { data: progress } = await adminSupabase
      .from("user_study_progress")
      .select("lessonId, status, progressPercentage, timeSpentSeconds")
      .eq("userId", user.id);

    // Calculate progress per chapter
    const chaptersWithProgress: ChapterWithProgress[] = (chapters || []).map((chapter, index) => {
      const chapterLessons = lessons?.filter(l => l.chapterId === chapter.id) || [];
      const completedLessons = chapterLessons.filter(l =>
        progress?.find(p => p.lessonId === l.id && p.status === "COMPLETED")
      );

      // Chapter is unlocked if it's the first one OR previous chapter is complete
      let isUnlocked = index === 0;
      if (index > 0 && chapters) {
        const prevChapter = chapters[index - 1];
        const prevChapterLessons = lessons?.filter(l => l.chapterId === prevChapter.id) || [];
        const prevCompleted = prevChapterLessons.filter(l =>
          progress?.find(p => p.lessonId === l.id && p.status === "COMPLETED")
        );
        isUnlocked = prevCompleted.length === prevChapterLessons.length && prevChapterLessons.length > 0;
      }

      return {
        ...chapter,
        totalLessons: chapterLessons.length,
        completedLessons: completedLessons.length,
        progressPercentage: chapterLessons.length > 0
          ? Math.round((completedLessons.length / chapterLessons.length) * 100)
          : 0,
        isUnlocked,
      };
    });

    // Calculate overall progress
    const totalLessons = lessons?.length || 0;
    const completedLessons = progress?.filter(p => p.status === "COMPLETED").length || 0;
    const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0) || 0;

    // Get current streak (simplified - would need daily tracking table for accurate streak)
    const currentStreak = 0; // TODO: Implement streak tracking

    // Find next lesson to continue
    let nextLesson = null;
    for (const chapter of chaptersWithProgress) {
      if (!chapter.isUnlocked) continue;
      
      const chapterLessons = lessons?.filter(l => l.chapterId === chapter.id) || [];
      for (const lesson of chapterLessons) {
        const lessonProgress = progress?.find(p => p.lessonId === lesson.id);
        if (!lessonProgress || lessonProgress.status !== "COMPLETED") {
          // Get full lesson data
          const { data: fullLesson } = await adminSupabase
            .from("study_lessons")
            .select("*")
            .eq("id", lesson.id)
            .single();

          if (fullLesson) {
            nextLesson = {
              ...fullLesson,
              chapter,
            };
          }
          break;
        }
      }
      if (nextLesson) break;
    }

    return {
      data: {
        chapters: chaptersWithProgress,
        overallProgress: {
          totalLessons,
          completedLessons,
          percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          currentStreak,
          totalTimeSpent,
        },
        nextLesson,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting chapters with progress:", err);
    return { data: null, error: "Failed to load study room data" };
  }
}

// ===========================================================
// GET CHAPTER DETAIL WITH LESSONS
// ===========================================================
export async function getChapterDetail(chapterId: string): Promise<{
  data: ChapterDetailData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Get chapter
    const { data: chapter, error: chapterError } = await adminSupabase
      .from("study_chapters")
      .select("*")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) return { data: null, error: "Chapter not found" };

    // Get lessons for this chapter
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from("study_lessons")
      .select("*, quiz:study_quizzes(*)")
      .eq("chapterId", chapterId)
      .order("orderIndex");

    if (lessonsError) return { data: null, error: lessonsError.message };

    // Get user's progress for these lessons
    const lessonIds = lessons?.map(l => l.id) || [];
    const { data: progress } = await adminSupabase
      .from("user_study_progress")
      .select("*")
      .eq("userId", user.id)
      .in("lessonId", lessonIds);

    // Combine lessons with progress
    const lessonsWithProgress: LessonWithProgress[] = (lessons || []).map(lesson => ({
      ...lesson,
      progress: progress?.find(p => p.lessonId === lesson.id) || null,
    }));

    // Get adjacent chapters
    const { data: allChapters } = await adminSupabase
      .from("study_chapters")
      .select("*")
      .order("orderIndex");

    const currentIndex = allChapters?.findIndex(c => c.id === chapterId) ?? -1;
    const previousChapter = currentIndex > 0 ? allChapters?.[currentIndex - 1] : null;
    const nextChapter = currentIndex < (allChapters?.length || 0) - 1 ? allChapters?.[currentIndex + 1] : null;

    // Check if chapter is unlocked
    let isUnlocked = currentIndex === 0;
    if (currentIndex > 0 && previousChapter) {
      const { data: prevLessons } = await adminSupabase
        .from("study_lessons")
        .select("id")
        .eq("chapterId", previousChapter.id);

      const prevLessonIds = prevLessons?.map(l => l.id) || [];
      const { data: prevProgress } = await adminSupabase
        .from("user_study_progress")
        .select("lessonId, status")
        .eq("userId", user.id)
        .in("lessonId", prevLessonIds);

      const prevCompleted = prevProgress?.filter(p => p.status === "COMPLETED").length || 0;
      isUnlocked = prevCompleted === prevLessonIds.length && prevLessonIds.length > 0;
    }

    return {
      data: {
        chapter,
        lessons: lessonsWithProgress,
        isUnlocked,
        previousChapter,
        nextChapter,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting chapter detail:", err);
    return { data: null, error: "Failed to load chapter" };
  }
}

// ===========================================================
// GET LESSON DETAIL
// ===========================================================
export async function getLessonDetail(lessonId: string): Promise<{
  data: LessonDetailData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Get lesson with quiz and resources
    const { data: lesson, error: lessonError } = await adminSupabase
      .from("study_lessons")
      .select("*, quiz:study_quizzes(*), resources:study_resources(*)")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) return { data: null, error: "Lesson not found" };

    // Get user's progress
    const { data: progress } = await adminSupabase
      .from("user_study_progress")
      .select("*")
      .eq("userId", user.id)
      .eq("lessonId", lessonId)
      .single();

    // Get chapter
    const { data: chapter } = await adminSupabase
      .from("study_chapters")
      .select("*")
      .eq("id", lesson.chapterId)
      .single();

    if (!chapter) return { data: null, error: "Chapter not found" };

    // Get adjacent lessons
    const { data: chapterLessons } = await adminSupabase
      .from("study_lessons")
      .select("*")
      .eq("chapterId", lesson.chapterId)
      .order("orderIndex");

    const currentIndex = chapterLessons?.findIndex(l => l.id === lessonId) ?? -1;
    const previousLesson = currentIndex > 0 ? chapterLessons?.[currentIndex - 1] : null;
    const nextLesson = currentIndex < (chapterLessons?.length || 0) - 1 ? chapterLessons?.[currentIndex + 1] : null;

    return {
      data: {
        lesson: {
          ...lesson,
          progress: progress || null,
        },
        chapter,
        previousLesson,
        nextLesson,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting lesson detail:", err);
    return { data: null, error: "Failed to load lesson" };
  }
}

// ===========================================================
// UPDATE LESSON PROGRESS
// ===========================================================
export async function updateLessonProgress(input: UpdateProgressInput): Promise<{
  data: { success: boolean } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { lessonId, progressPercentage, timeSpentSeconds, status } = input;

    // Check if progress record exists
    const { data: existing } = await adminSupabase
      .from("user_study_progress")
      .select("id, timeSpentSeconds")
      .eq("userId", user.id)
      .eq("lessonId", lessonId)
      .single();

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (progressPercentage !== undefined) updates.progressPercentage = progressPercentage;
    if (status !== undefined) updates.status = status;
    if (status === "COMPLETED") updates.completedAt = new Date().toISOString();
    if (timeSpentSeconds !== undefined) {
      updates.timeSpentSeconds = (existing?.timeSpentSeconds || 0) + timeSpentSeconds;
    }

    if (existing) {
      // Update existing
      const { error } = await adminSupabase
        .from("user_study_progress")
        .update(updates)
        .eq("id", existing.id);

      if (error) return { data: null, error: error.message };
    } else {
      // Create new
      const { error } = await adminSupabase
        .from("user_study_progress")
        .insert({
          userId: user.id,
          lessonId,
          status: status || "IN_PROGRESS",
          progressPercentage: progressPercentage || 0,
          timeSpentSeconds: timeSpentSeconds || 0,
        });

      if (error) return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating lesson progress:", err);
    return { data: null, error: "Failed to update progress" };
  }
}

// ===========================================================
// COMPLETE LESSON
// ===========================================================
export async function completeLesson(lessonId: string): Promise<{
  data: { xpEarned: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Update progress to completed
    const { error: progressError } = await updateLessonProgress({
      lessonId,
      status: "COMPLETED",
      progressPercentage: 100,
    });

    if (progressError) return { data: null, error: progressError };

    // Award XP
    const xpEarned = 25; // STUDY_XP_VALUES.lesson_complete

    // TODO: Add XP transaction when gamification is implemented
    // await addXPTransaction(user.id, xpEarned, "lesson_complete", lessonId);

    return { data: { xpEarned }, error: null };
  } catch (err) {
    console.error("Error completing lesson:", err);
    return { data: null, error: "Failed to complete lesson" };
  }
}

// ===========================================================
// SUBMIT QUIZ
// ===========================================================
export async function submitQuiz(input: CompleteQuizInput): Promise<{
  data: QuizResult | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { lessonId, answers } = input;

    // Get quiz for this lesson
    const { data: quiz, error: quizError } = await adminSupabase
      .from("study_quizzes")
      .select("*")
      .eq("lessonId", lessonId)
      .single();

    if (quizError || !quiz) return { data: null, error: "Quiz not found" };

    const questions = quiz.questions as any[];
    let correctCount = 0;
    const wrongAnswers: QuizResult["wrongAnswers"] = [];

    // Grade the quiz
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = Array.isArray(userAnswer)
        ? userAnswer.sort().join(",") === question.correctAnswers.sort().join(",")
        : userAnswer === question.correctAnswers[0];

      if (isCorrect) {
        correctCount++;
      } else {
        wrongAnswers.push({
          questionId: question.id,
          question: question.question,
          userAnswer: userAnswer || "",
          correctAnswer: question.correctAnswers,
          explanation: question.explanation,
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Update progress
    const { data: existingProgress } = await adminSupabase
      .from("user_study_progress")
      .select("quizAttempts")
      .eq("userId", user.id)
      .eq("lessonId", lessonId)
      .single();

    const quizAttempts = (existingProgress?.quizAttempts || 0) + 1;

    await adminSupabase
      .from("user_study_progress")
      .upsert({
        userId: user.id,
        lessonId,
        status: passed ? "COMPLETED" : "IN_PROGRESS",
        progressPercentage: passed ? 100 : 50,
        quizScore: score,
        quizAttempts,
        completedAt: passed ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      }, { onConflict: "userId,lessonId" });

    // Calculate XP
    let xpEarned = passed ? 50 : 10; // Base XP
    if (passed && score === 100) xpEarned += 75; // Perfect score bonus

    const result: QuizResult = {
      passed,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers,
      xpEarned,
    };

    return { data: result, error: null };
  } catch (err) {
    console.error("Error submitting quiz:", err);
    return { data: null, error: "Failed to submit quiz" };
  }
}

// ===========================================================
// GET USER STUDY STATS
// ===========================================================
export async function getUserStudyStats(): Promise<{
  data: {
    totalLessons: number;
    completedLessons: number;
    totalChapters: number;
    completedChapters: number;
    totalTimeSpent: number;
    quizzesPassed: number;
    averageQuizScore: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Get all lessons and chapters count
    const { count: totalLessons } = await adminSupabase
      .from("study_lessons")
      .select("*", { count: "exact", head: true });

    const { count: totalChapters } = await adminSupabase
      .from("study_chapters")
      .select("*", { count: "exact", head: true });

    // Get user's progress
    const { data: progress } = await adminSupabase
      .from("user_study_progress")
      .select("*")
      .eq("userId", user.id);

    const completedLessons = progress?.filter(p => p.status === "COMPLETED").length || 0;
    const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0) || 0;
    
    const quizProgress = progress?.filter(p => p.quizScore !== null) || [];
    const quizzesPassed = quizProgress.filter(p => p.quizScore >= 70).length;
    const averageQuizScore = quizProgress.length > 0
      ? Math.round(quizProgress.reduce((sum, p) => sum + p.quizScore, 0) / quizProgress.length)
      : 0;

    // Calculate completed chapters
    const { data: chapters } = await adminSupabase
      .from("study_chapters")
      .select("id");

    let completedChapters = 0;
    for (const chapter of chapters || []) {
      const { data: chapterLessons } = await adminSupabase
        .from("study_lessons")
        .select("id")
        .eq("chapterId", chapter.id);

      const lessonIds = chapterLessons?.map(l => l.id) || [];
      const completedInChapter = progress?.filter(
        p => lessonIds.includes(p.lessonId) && p.status === "COMPLETED"
      ).length || 0;

      if (completedInChapter === lessonIds.length && lessonIds.length > 0) {
        completedChapters++;
      }
    }

    return {
      data: {
        totalLessons: totalLessons || 0,
        completedLessons,
        totalChapters: totalChapters || 0,
        completedChapters,
        totalTimeSpent,
        quizzesPassed,
        averageQuizScore,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting user study stats:", err);
    return { data: null, error: "Failed to load stats" };
  }
}
