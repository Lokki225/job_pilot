"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/services/event-dispatcher";
import { AppEvent } from "@/lib/types/app-events";

// ===========================================================
// TYPES
// ===========================================================

export interface CustomStudyPlanData {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  chapters: CustomStudyChapterData[];
}

export interface CustomStudyChapterData {
  id: string;
  planId: string;
  orderIndex: number;
  title: string;
  description: string | null;
  createdAt: string;
  lessons: CustomStudyLessonData[];
}

export interface CustomStudyLessonData {
  id: string;
  chapterId: string;
  orderIndex: number;
  title: string;
  content: string;
  estimatedMinutes: number;
  createdAt: string;
  quiz: CustomStudyQuizData | null;
}

export interface CustomStudyQuizData {
  id: string;
  lessonId: string;
  title: string | null;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false";
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

export interface PublicStudyPlanSummary {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  chapterCount: number;
  lessonCount: number;
  estimatedMinutes: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: {
    name: string;
    avatarUrl: string | null;
  };
}

export interface PublicStudyPlanDetail {
  plan: CustomStudyPlanData;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: {
    name: string;
    avatarUrl: string | null;
  };
}

export interface StudyPlanCommentData {
  id: string;
  planId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  author: {
    name: string;
    avatarUrl: string | null;
  };
}

export interface CustomStudyLessonForStudy {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  estimatedMinutes: number;
  chapter: {
    id: string;
    title: string;
    planId: string;
  };
  plan: {
    id: string;
    title: string;
    icon: string | null;
    coverImageUrl: string | null;
  };
}

// ===========================================================
// GET MY STUDY PLANS
// ===========================================================

export async function getMyStudyPlans(): Promise<{
  data: CustomStudyPlanData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plans, error } = await adminSupabase
      .from("custom_study_plans")
      .select(`
        *,
        chapters:custom_study_chapters(
          *,
          lessons:custom_study_lessons(
            *,
            quiz:custom_study_quizzes(*)
          )
        )
      `)
      .eq("userId", user.id)
      .order("updatedAt", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    // Sort chapters and lessons by orderIndex
    const sortedPlans = (plans || []).map((plan: any) => ({
      ...plan,
      chapters: (plan.chapters || [])
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((chapter: any) => ({
          ...chapter,
          lessons: (chapter.lessons || [])
            .sort((a: any, b: any) => a.orderIndex - b.orderIndex),
        })),
    }));

    return { data: sortedPlans, error: null };
  } catch (err) {
    console.error("Error getting study plans:", err);
    return { data: null, error: "Failed to get study plans" };
  }
}

// ===========================================================
// GET SINGLE STUDY PLAN
// ===========================================================

export async function getStudyPlan(planId: string): Promise<{
  data: CustomStudyPlanData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plan, error } = await adminSupabase
      .from("custom_study_plans")
      .select(`
        *,
        chapters:custom_study_chapters(
          *,
          lessons:custom_study_lessons(
            *,
            quiz:custom_study_quizzes(*)
          )
        )
      `)
      .eq("id", planId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Check ownership or public
    if (plan.userId !== user.id && !plan.isPublic) {
      return { data: null, error: "Not authorized to view this plan" };
    }

    // Sort chapters and lessons
    const sortedPlan = {
      ...plan,
      chapters: (plan.chapters || [])
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((chapter: any) => ({
          ...chapter,
          lessons: (chapter.lessons || [])
            .sort((a: any, b: any) => a.orderIndex - b.orderIndex),
        })),
    };

    return { data: sortedPlan, error: null };
  } catch (err) {
    console.error("Error getting study plan:", err);
    return { data: null, error: "Failed to get study plan" };
  }
}

// ===========================================================
// CREATE STUDY PLAN
// ===========================================================

export async function createStudyPlan(input: {
  title: string;
  description?: string;
  icon?: string;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plan, error } = await adminSupabase
      .from("custom_study_plans")
      .insert({
        userId: user.id,
        title: input.title,
        description: input.description || null,
        icon: input.icon || null,
        coverImageUrl: input.coverImageUrl ?? null,
        isPublic: input.isPublic || false,
      })
      .select("id")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { id: plan.id }, error: null };
  } catch (err) {
    console.error("Error creating study plan:", err);
    return { data: null, error: "Failed to create study plan" };
  }
}

// ===========================================================
// UPDATE STUDY PLAN
// ===========================================================

export async function updateStudyPlan(
  planId: string,
  input: {
    title?: string;
    description?: string;
    icon?: string;
    coverImageUrl?: string | null;
    isPublic?: boolean;
  }
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: existing } = await adminSupabase
      .from("custom_study_plans")
      .select("userId")
      .eq("id", planId)
      .single();

    if (!existing || existing.userId !== user.id) {
      return { data: null, error: "Not authorized to edit this plan" };
    }

    const { error } = await adminSupabase
      .from("custom_study_plans")
      .update({
        title: input.title,
        description: input.description,
        icon: input.icon,
        coverImageUrl: input.coverImageUrl === undefined ? undefined : input.coverImageUrl,
        isPublic: input.isPublic,
      })
      .eq("id", planId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating study plan:", err);
    return { data: null, error: "Failed to update study plan" };
  }
}

// ===========================================================
// DELETE STUDY PLAN
// ===========================================================

export async function deleteStudyPlan(planId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: existing } = await adminSupabase
      .from("custom_study_plans")
      .select("userId")
      .eq("id", planId)
      .single();

    if (!existing || existing.userId !== user.id) {
      return { data: null, error: "Not authorized to delete this plan" };
    }

    const { error } = await adminSupabase
      .from("custom_study_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting study plan:", err);
    return { data: null, error: "Failed to delete study plan" };
  }
}

// ===========================================================
// CREATE CHAPTER
// ===========================================================

export async function createChapter(
  planId: string,
  input: {
    title: string;
    description?: string;
  }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check plan ownership
    const { data: plan } = await adminSupabase
      .from("custom_study_plans")
      .select("userId")
      .eq("id", planId)
      .single();

    if (!plan || plan.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    // Get max orderIndex
    const { data: chapters } = await adminSupabase
      .from("custom_study_chapters")
      .select("orderIndex")
      .eq("planId", planId)
      .order("orderIndex", { ascending: false })
      .limit(1);

    const nextOrder = chapters && chapters.length > 0 ? chapters[0].orderIndex + 1 : 0;

    const { data: chapter, error } = await adminSupabase
      .from("custom_study_chapters")
      .insert({
        planId,
        title: input.title,
        description: input.description || null,
        orderIndex: nextOrder,
      })
      .select("id")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { id: chapter.id }, error: null };
  } catch (err) {
    console.error("Error creating chapter:", err);
    return { data: null, error: "Failed to create chapter" };
  }
}

// ===========================================================
// UPDATE CHAPTER
// ===========================================================

export async function updateChapter(
  chapterId: string,
  input: {
    title?: string;
    description?: string;
    orderIndex?: number;
  }
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership via plan
    const { data: chapter } = await adminSupabase
      .from("custom_study_chapters")
      .select("planId, plan:custom_study_plans(userId)")
      .eq("id", chapterId)
      .single();

    if (!chapter || (chapter.plan as any)?.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_chapters")
      .update({
        title: input.title,
        description: input.description,
        orderIndex: input.orderIndex,
      })
      .eq("id", chapterId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating chapter:", err);
    return { data: null, error: "Failed to update chapter" };
  }
}

// ===========================================================
// DELETE CHAPTER
// ===========================================================

export async function deleteChapter(chapterId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: chapter } = await adminSupabase
      .from("custom_study_chapters")
      .select("planId, plan:custom_study_plans(userId)")
      .eq("id", chapterId)
      .single();

    if (!chapter || (chapter.plan as any)?.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_chapters")
      .delete()
      .eq("id", chapterId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting chapter:", err);
    return { data: null, error: "Failed to delete chapter" };
  }
}

// ===========================================================
// CREATE LESSON
// ===========================================================

export async function createLesson(
  chapterId: string,
  input: {
    title: string;
    content: string;
    estimatedMinutes?: number;
  }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership via chapter -> plan
    const { data: chapter } = await adminSupabase
      .from("custom_study_chapters")
      .select("planId, plan:custom_study_plans(userId)")
      .eq("id", chapterId)
      .single();

    if (!chapter || (chapter.plan as any)?.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    // Get max orderIndex
    const { data: lessons } = await adminSupabase
      .from("custom_study_lessons")
      .select("orderIndex")
      .eq("chapterId", chapterId)
      .order("orderIndex", { ascending: false })
      .limit(1);

    const nextOrder = lessons && lessons.length > 0 ? lessons[0].orderIndex + 1 : 0;

    const { data: lesson, error } = await adminSupabase
      .from("custom_study_lessons")
      .insert({
        chapterId,
        title: input.title,
        content: input.content,
        estimatedMinutes: input.estimatedMinutes || 10,
        orderIndex: nextOrder,
      })
      .select("id")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { id: lesson.id }, error: null };
  } catch (err) {
    console.error("Error creating lesson:", err);
    return { data: null, error: "Failed to create lesson" };
  }
}

// ===========================================================
// UPDATE LESSON
// ===========================================================

export async function updateLesson(
  lessonId: string,
  input: {
    title?: string;
    content?: string;
    estimatedMinutes?: number;
    orderIndex?: number;
  }
): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership via lesson -> chapter -> plan
    const { data: lesson } = await adminSupabase
      .from("custom_study_lessons")
      .select("chapterId, chapter:custom_study_chapters(planId, plan:custom_study_plans(userId))")
      .eq("id", lessonId)
      .single();

    const planUserId = (lesson?.chapter as any)?.plan?.userId;
    if (!lesson || planUserId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_lessons")
      .update({
        title: input.title,
        content: input.content,
        estimatedMinutes: input.estimatedMinutes,
        orderIndex: input.orderIndex,
      })
      .eq("id", lessonId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error updating lesson:", err);
    return { data: null, error: "Failed to update lesson" };
  }
}

// ===========================================================
// DELETE LESSON
// ===========================================================

export async function deleteLesson(lessonId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: lesson } = await adminSupabase
      .from("custom_study_lessons")
      .select("chapterId, chapter:custom_study_chapters(planId, plan:custom_study_plans(userId))")
      .eq("id", lessonId)
      .single();

    const planUserId = (lesson?.chapter as any)?.plan?.userId;
    if (!lesson || planUserId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting lesson:", err);
    return { data: null, error: "Failed to delete lesson" };
  }
}

// ===========================================================
// SAVE/UPDATE QUIZ
// ===========================================================

export async function saveQuiz(
  lessonId: string,
  input: {
    title?: string;
    passingScore?: number;
    questions: QuizQuestion[];
  }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: lesson } = await adminSupabase
      .from("custom_study_lessons")
      .select("chapterId, chapter:custom_study_chapters(planId, plan:custom_study_plans(userId))")
      .eq("id", lessonId)
      .single();

    const planUserId = (lesson?.chapter as any)?.plan?.userId;
    if (!lesson || planUserId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    // Check if quiz exists
    const { data: existingQuiz } = await adminSupabase
      .from("custom_study_quizzes")
      .select("id")
      .eq("lessonId", lessonId)
      .maybeSingle();

    if (existingQuiz) {
      // Update
      const { error } = await adminSupabase
        .from("custom_study_quizzes")
        .update({
          title: input.title,
          passingScore: typeof input.passingScore === "number" ? input.passingScore : 70,
          questions: input.questions,
        })
        .eq("id", existingQuiz.id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: { id: existingQuiz.id }, error: null };
    } else {
      // Create
      const { data: quiz, error } = await adminSupabase
        .from("custom_study_quizzes")
        .insert({
          lessonId,
          title: input.title,
          passingScore: typeof input.passingScore === "number" ? input.passingScore : 70,
          questions: input.questions,
        })
        .select("id")
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: { id: quiz.id }, error: null };
    }
  } catch (err) {
    console.error("Error saving quiz:", err);
    return { data: null, error: "Failed to save quiz" };
  }
}

// ===========================================================
// DELETE QUIZ
// ===========================================================

export async function deleteQuiz(lessonId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check ownership
    const { data: lesson } = await adminSupabase
      .from("custom_study_lessons")
      .select("chapterId, chapter:custom_study_chapters(planId, plan:custom_study_plans(userId))")
      .eq("id", lessonId)
      .single();

    const planUserId = (lesson?.chapter as any)?.plan?.userId;
    if (!lesson || planUserId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_quizzes")
      .delete()
      .eq("lessonId", lessonId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting quiz:", err);
    return { data: null, error: "Failed to delete quiz" };
  }
}

export async function getPublicStudyPlans(): Promise<{
  data: PublicStudyPlanSummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plans, error: plansError } = await adminSupabase
      .from("custom_study_plans")
      .select("id,userId,title,description,icon,coverImageUrl,createdAt,updatedAt")
      .eq("isPublic", true)
      .order("updatedAt", { ascending: false })
      .limit(50);

    if (plansError) {
      return { data: null, error: plansError.message };
    }

    const planList = plans || [];
    const planIds = planList.map((p: any) => p.id);
    if (planIds.length === 0) {
      return { data: [], error: null };
    }

    const userIds = Array.from(new Set(planList.map((p: any) => p.userId)));
    const { data: profileRows } = await adminSupabase
      .from("profiles")
      .select("userId,firstName,lastName,avatarUrl")
      .in("userId", userIds);

    const profileMap = new Map<string, { name: string; avatarUrl: string | null }>();
    (profileRows || []).forEach((r: any) => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "User";
      profileMap.set(r.userId, { name, avatarUrl: r.avatarUrl || null });
    });

    const { data: chapters } = await adminSupabase
      .from("custom_study_chapters")
      .select("id,planId")
      .in("planId", planIds);

    const chapterPlanMap = new Map<string, string>();
    const chapterCountMap = new Map<string, number>();
    (chapters || []).forEach((c: any) => {
      chapterPlanMap.set(c.id, c.planId);
      chapterCountMap.set(c.planId, (chapterCountMap.get(c.planId) || 0) + 1);
    });

    const lessonCountMap = new Map<string, number>();
    const estimatedMinutesMap = new Map<string, number>();
    const chapterIds = (chapters || []).map((c: any) => c.id);
    if (chapterIds.length > 0) {
      const { data: lessons } = await adminSupabase
        .from("custom_study_lessons")
        .select("chapterId,estimatedMinutes")
        .in("chapterId", chapterIds);

      (lessons || []).forEach((l: any) => {
        const planId = chapterPlanMap.get(l.chapterId);
        if (!planId) return;
        lessonCountMap.set(planId, (lessonCountMap.get(planId) || 0) + 1);
        estimatedMinutesMap.set(planId, (estimatedMinutesMap.get(planId) || 0) + (l.estimatedMinutes || 0));
      });
    }

    const { data: likeRows } = await adminSupabase
      .from("custom_study_plan_likes")
      .select("planId,userId")
      .in("planId", planIds);

    const likeCountMap = new Map<string, number>();
    const likedByMeSet = new Set<string>();
    (likeRows || []).forEach((l: any) => {
      likeCountMap.set(l.planId, (likeCountMap.get(l.planId) || 0) + 1);
      if (l.userId === user.id) {
        likedByMeSet.add(l.planId);
      }
    });

    const { data: commentRows } = await adminSupabase
      .from("custom_study_plan_comments")
      .select("planId")
      .in("planId", planIds);

    const commentCountMap = new Map<string, number>();
    (commentRows || []).forEach((c: any) => {
      commentCountMap.set(c.planId, (commentCountMap.get(c.planId) || 0) + 1);
    });

    const result: PublicStudyPlanSummary[] = planList.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      title: p.title,
      description: p.description || null,
      icon: p.icon || null,
      coverImageUrl: p.coverImageUrl || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      chapterCount: chapterCountMap.get(p.id) || 0,
      lessonCount: lessonCountMap.get(p.id) || 0,
      estimatedMinutes: estimatedMinutesMap.get(p.id) || 0,
      likeCount: likeCountMap.get(p.id) || 0,
      commentCount: commentCountMap.get(p.id) || 0,
      likedByMe: likedByMeSet.has(p.id),
      author: profileMap.get(p.userId) || { name: "User", avatarUrl: null },
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting public study plans:", err);
    return { data: null, error: "Failed to load community plans" };
  }
}

export async function getPublicStudyPlan(planId: string): Promise<{
  data: PublicStudyPlanDetail | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plan, error } = await adminSupabase
      .from("custom_study_plans")
      .select(
        `
        *,
        chapters:custom_study_chapters(
          *,
          lessons:custom_study_lessons(
            *,
            quiz:custom_study_quizzes(*)
          )
        )
      `
      )
      .eq("id", planId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!plan) {
      return { data: null, error: "Plan not found" };
    }

    if (!plan.isPublic && plan.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const sortedPlan: CustomStudyPlanData = {
      ...plan,
      chapters: (plan.chapters || [])
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((chapter: any) => ({
          ...chapter,
          lessons: (chapter.lessons || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
        })),
    };

    const { data: profileRows } = await adminSupabase
      .from("profiles")
      .select("userId,firstName,lastName,avatarUrl")
      .eq("userId", plan.userId)
      .maybeSingle();

    const authorName = profileRows
      ? [profileRows.firstName, profileRows.lastName].filter(Boolean).join(" ") || "User"
      : "User";
    const author = { name: authorName, avatarUrl: (profileRows as any)?.avatarUrl || null };

    const { data: likeRows } = await adminSupabase
      .from("custom_study_plan_likes")
      .select("userId")
      .eq("planId", planId);

    const likeCount = (likeRows || []).length;
    const likedByMe = (likeRows || []).some((l: any) => l.userId === user.id);

    const { data: commentRows } = await adminSupabase
      .from("custom_study_plan_comments")
      .select("id")
      .eq("planId", planId);

    const commentCount = (commentRows || []).length;

    return {
      data: {
        plan: sortedPlan,
        likeCount,
        commentCount,
        likedByMe,
        author,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting public plan:", err);
    return { data: null, error: "Failed to load plan" };
  }
}

export async function toggleStudyPlanLike(planId: string): Promise<{
  data: { liked: boolean } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plan } = await adminSupabase
      .from("custom_study_plans")
      .select("id,isPublic,userId,title")
      .eq("id", planId)
      .maybeSingle();

    if (!plan || !plan.isPublic) {
      return { data: null, error: "Plan not found" };
    }

    const { data: existing } = await adminSupabase
      .from("custom_study_plan_likes")
      .select("id")
      .eq("planId", planId)
      .eq("userId", user.id)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await adminSupabase
        .from("custom_study_plan_likes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: { liked: false }, error: null };
    }

    const { error } = await adminSupabase
      .from("custom_study_plan_likes")
      .insert({ planId, userId: user.id });
    if (error) {
      return { data: null, error: error.message };
    }

    if (plan?.userId && plan.userId !== user.id) {
      const title = plan.title || "your study plan";
      await emitEvent({
        event: AppEvent.STUDY_PLAN_LIKED,
        userId: plan.userId,
        message: `Someone liked your study plan "${title}"`,
        link: `/dashboard/study/community-plans/${planId}`,
        metadata: {
          planId,
          planTitle: title,
          likedByUserId: user.id,
        },
      });
    }

    return { data: { liked: true }, error: null };
  } catch (err) {
    console.error("Error toggling plan like:", err);
    return { data: null, error: "Failed to update like" };
  }
}

export async function getStudyPlanComments(planId: string): Promise<{
  data: StudyPlanCommentData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: plan } = await adminSupabase
      .from("custom_study_plans")
      .select("id,userId,isPublic")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return { data: null, error: "Plan not found" };
    }

    if (!plan.isPublic && plan.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { data: rows, error } = await adminSupabase
      .from("custom_study_plan_comments")
      .select("id,planId,userId,content,createdAt,updatedAt")
      .eq("planId", planId)
      .order("createdAt", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const ids = Array.from(new Set((rows || []).map((r: any) => r.userId)));
    const { data: profileRows } = await adminSupabase
      .from("profiles")
      .select("userId,firstName,lastName,avatarUrl")
      .in("userId", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map<string, { name: string; avatarUrl: string | null }>();
    (profileRows || []).forEach((r: any) => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "User";
      profileMap.set(r.userId, { name, avatarUrl: r.avatarUrl || null });
    });

    const result: StudyPlanCommentData[] = (rows || []).map((r: any) => ({
      id: r.id,
      planId: r.planId,
      userId: r.userId,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      isMine: r.userId === user.id,
      author: profileMap.get(r.userId) || { name: "User", avatarUrl: null },
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error("Error getting plan comments:", err);
    return { data: null, error: "Failed to load comments" };
  }
}

export async function addStudyPlanComment(planId: string, content: string): Promise<{
  data: StudyPlanCommentData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { data: null, error: "Comment cannot be empty" };
    }

    const { data: plan } = await adminSupabase
      .from("custom_study_plans")
      .select("id,isPublic,userId,title")
      .eq("id", planId)
      .maybeSingle();

    if (!plan || !plan.isPublic) {
      return { data: null, error: "Plan not found" };
    }

    const { data: row, error } = await adminSupabase
      .from("custom_study_plan_comments")
      .insert({ planId, userId: user.id, content: trimmed })
      .select("id,planId,userId,content,createdAt,updatedAt")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Get user profile for author info
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("firstName,lastName,avatarUrl")
      .eq("userId", user.id)
      .maybeSingle();

    const authorName = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User"
      : "User";

    if (plan?.userId && plan.userId !== user.id) {
      const title = plan.title || "your study plan";
      const preview = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
      await emitEvent({
        event: AppEvent.STUDY_PLAN_COMMENT_RECEIVED,
        userId: plan.userId,
        message: `${authorName} commented on "${title}": "${preview}"`,
        link: `/dashboard/study/community-plans/${planId}`,
        metadata: {
          planId,
          planTitle: title,
          commentId: row.id,
          commenterUserId: user.id,
        },
      });
    }

    return {
      data: {
        id: row.id,
        planId: row.planId,
        userId: row.userId,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isMine: true,
        author: {
          name: authorName,
          avatarUrl: profile?.avatarUrl || null,
        },
      },
      error: null,
    };
  } catch (err) {
    console.error("Error adding comment:", err);
    return { data: null, error: "Failed to add comment" };
  }
}

export async function deleteStudyPlanComment(commentId: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: existing } = await adminSupabase
      .from("custom_study_plan_comments")
      .select("id,userId")
      .eq("id", commentId)
      .maybeSingle();

    if (!existing) {
      return { data: null, error: "Comment not found" };
    }

    if (existing.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    const { error } = await adminSupabase
      .from("custom_study_plan_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting comment:", err);
    return { data: null, error: "Failed to delete comment" };
  }
}

export async function getCustomStudyLessonForStudy(lessonId: string): Promise<{
  data: CustomStudyLessonForStudy | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data: lesson, error } = await adminSupabase
      .from("custom_study_lessons")
      .select(
        `
        id,chapterId,title,content,estimatedMinutes,
        chapter:custom_study_chapters(
          id,title,planId,
          plan:custom_study_plans(id,title,icon,coverImageUrl,isPublic,userId)
        )
      `
      )
      .eq("id", lessonId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!lesson) {
      return { data: null, error: "Lesson not found" };
    }

    const plan = (lesson.chapter as any)?.plan;
    if (!plan) {
      return { data: null, error: "Lesson not found" };
    }

    if (!plan.isPublic && plan.userId !== user.id) {
      return { data: null, error: "Not authorized" };
    }

    return {
      data: {
        id: lesson.id,
        chapterId: lesson.chapterId,
        title: lesson.title,
        content: lesson.content,
        estimatedMinutes: lesson.estimatedMinutes,
        chapter: {
          id: (lesson.chapter as any).id,
          title: (lesson.chapter as any).title,
          planId: (lesson.chapter as any).planId,
        },
        plan: {
          id: plan.id,
          title: plan.title,
          icon: plan.icon || null,
          coverImageUrl: plan.coverImageUrl || null,
        },
      },
      error: null,
    };
  } catch (err) {
    console.error("Error loading custom lesson:", err);
    return { data: null, error: "Failed to load lesson" };
  }
}
