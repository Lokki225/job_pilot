// ===========================================================
// STUDY ROOM TYPES - Text-based MVP (no video)
// ===========================================================

// ----------------------
// Content Section Types
// ----------------------

export interface TextContent {
  title?: string;
  body: string; // Markdown supported
  highlights?: string[];
  examples?: { title: string; content: string }[];
}

export interface InteractiveContent {
  type: 'drag-drop' | 'fill-blank' | 'rate-answer' | 'match' | 'story-builder';
  instructions: string;
  items: InteractiveItem[];
  correctAnswers?: Record<string, string | string[]>;
}

export interface InteractiveItem {
  id: string;
  content: string;
  category?: string;
  order?: number;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passingScore: number;
  showAnswersAfter: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'multi-select';
  question: string;
  options: QuizOption[];
  correctAnswers: string[];
  explanation: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface PracticeContent {
  type: 'write-answer' | 'record-audio' | 'build-story';
  prompt: string;
  guidance: string;
  exampleAnswer?: string;
  aiEvaluationEnabled: boolean;
}

export interface DownloadContent {
  title: string;
  description: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx' | 'template';
  isPremium: boolean;
}

// MVP: Text-based only (no video)
export type ContentSection =
  | { type: 'text'; data: TextContent }
  | { type: 'interactive'; data: InteractiveContent }
  | { type: 'quiz'; data: QuizContent }
  | { type: 'practice'; data: PracticeContent }
  | { type: 'download'; data: DownloadContent };

export interface LessonContent {
  sections: ContentSection[];
}

// ----------------------
// Database Model Types
// ----------------------

export type StudyStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ContentType = 'TEXT' | 'INTERACTIVE' | 'QUIZ' | 'PRACTICE';

export interface StudyChapter {
  id: string;
  careerTrackId?: string | null;
  orderIndex: number;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  icon?: string | null;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyLesson {
  id: string;
  chapterId: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  contentType: ContentType;
  content?: LessonContent | null;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyQuiz {
  id: string;
  lessonId: string;
  title?: string | null;
  passingScore: number;
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyResource {
  id: string;
  lessonId: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileType?: string | null;
  isPremium: boolean;
  downloadCount: number;
  createdAt: Date;
}

export interface UserStudyProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: StudyStatus;
  progressPercentage: number;
  quizScore?: number | null;
  quizAttempts: number;
  timeSpentSeconds: number;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------
// Extended Types (with relations)
// ----------------------

export interface ChapterWithLessons extends StudyChapter {
  lessons: StudyLesson[];
}

export interface ChapterWithProgress extends StudyChapter {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  isUnlocked: boolean;
}

export interface LessonWithProgress extends StudyLesson {
  progress?: UserStudyProgress | null;
  quiz?: StudyQuiz | null;
  resources?: StudyResource[];
}

export interface LessonWithChapter extends StudyLesson {
  chapter: StudyChapter;
}

// ----------------------
// API Response Types
// ----------------------

export interface StudyRoomHomeData {
  chapters: ChapterWithProgress[];
  overallProgress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
    currentStreak: number;
    totalTimeSpent: number; // seconds
  };
  nextLesson?: LessonWithChapter | null;
}

export interface ChapterDetailData {
  chapter: StudyChapter;
  lessons: LessonWithProgress[];
  isUnlocked: boolean;
  previousChapter?: StudyChapter | null;
  nextChapter?: StudyChapter | null;
}

export interface LessonDetailData {
  lesson: LessonWithProgress;
  chapter: StudyChapter;
  previousLesson?: StudyLesson | null;
  nextLesson?: StudyLesson | null;
}

// ----------------------
// Quiz Result Types
// ----------------------

export interface QuizAttempt {
  lessonId: string;
  answers: Record<string, string | string[]>; // questionId -> answer(s)
  startedAt: Date;
  completedAt: Date;
}

export interface QuizResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: QuizWrongAnswer[];
  xpEarned: number;
}

export interface QuizWrongAnswer {
  questionId: string;
  question: string;
  userAnswer: string | string[];
  correctAnswer: string[];
  explanation: string;
}

// ----------------------
// Progress Update Types
// ----------------------

export interface UpdateProgressInput {
  lessonId: string;
  progressPercentage?: number;
  timeSpentSeconds?: number;
  status?: StudyStatus;
}

export interface CompleteQuizInput {
  lessonId: string;
  answers: Record<string, string | string[]>;
}

// ----------------------
// XP & Gamification Types (Study Room specific)
// ----------------------

export interface StudyXPReward {
  action: 'lesson_complete' | 'quiz_pass' | 'chapter_complete' | 'perfect_quiz';
  baseXP: number;
  bonusXP?: number;
  reason?: string;
}

export const STUDY_XP_VALUES: Record<StudyXPReward['action'], number> = {
  lesson_complete: 25,
  quiz_pass: 50,
  chapter_complete: 100,
  perfect_quiz: 75,
};
