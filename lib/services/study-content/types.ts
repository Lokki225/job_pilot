/**
 * Study Content Service Types
 * Defines all types for content generation, tracks, and validation
 */

// ===========================================================
// CAREER TRACKS
// ===========================================================

export type CareerTrackId = 
  | 'software-engineer'
  | 'data-analyst'
  | 'product-manager'
  | 'ui-ux-designer'
  | 'marketing-specialist'

export interface CareerTrack {
  id: CareerTrackId
  name: string
  description: string
  icon: string
  color: string // Tailwind color class
  targetAudience: string[]
  keySkills: string[]
}

export const CAREER_TRACKS: Record<CareerTrackId, CareerTrack> = {
  'software-engineer': {
    id: 'software-engineer',
    name: 'Software Engineer',
    description: 'Master technical interviews, coding challenges, and system design',
    icon: '💻',
    color: 'blue',
    targetAudience: ['Frontend developers', 'Backend developers', 'Full-stack engineers', 'Mobile developers'],
    keySkills: ['Data structures', 'Algorithms', 'System design', 'Coding interviews', 'Technical communication'],
  },
  'data-analyst': {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Excel in SQL tests, case studies, and data presentation interviews',
    icon: '📊',
    color: 'green',
    targetAudience: ['Data analysts', 'Business analysts', 'BI specialists', 'Reporting analysts'],
    keySkills: ['SQL', 'Excel', 'Data visualization', 'Statistical analysis', 'Business acumen'],
  },
  'product-manager': {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Ace product sense, strategy, and execution interviews',
    icon: '🎯',
    color: 'purple',
    targetAudience: ['Product managers', 'Product owners', 'Program managers', 'Strategy analysts'],
    keySkills: ['Product sense', 'Metrics', 'Prioritization', 'Stakeholder management', 'Technical understanding'],
  },
  'ui-ux-designer': {
    id: 'ui-ux-designer',
    name: 'UI/UX Designer',
    description: 'Shine in portfolio reviews, design challenges, and critique sessions',
    icon: '🎨',
    color: 'pink',
    targetAudience: ['UI designers', 'UX designers', 'Product designers', 'UX researchers'],
    keySkills: ['Design thinking', 'User research', 'Prototyping', 'Visual design', 'Design critique'],
  },
  'marketing-specialist': {
    id: 'marketing-specialist',
    name: 'Marketing Specialist',
    description: 'Dominate marketing case studies, campaign reviews, and strategy discussions',
    icon: '📢',
    color: 'orange',
    targetAudience: ['Digital marketers', 'Growth marketers', 'Content marketers', 'Brand managers'],
    keySkills: ['Campaign strategy', 'Analytics', 'Content creation', 'Growth hacking', 'Brand positioning'],
  },
}

// ===========================================================
// CHAPTER STRUCTURE
// ===========================================================

export interface ChapterBlueprint {
  orderIndex: number
  title: string
  description: string
  icon: string
  estimatedMinutes: number
  isPremium: boolean
  lessons: LessonBlueprint[]
}

export interface LessonBlueprint {
  orderIndex: number
  title: string
  description: string
  estimatedMinutes: number
  contentType: 'TEXT' | 'QUIZ' | 'PRACTICE'
  isPremium: boolean
  learningObjectives: string[]
  keyTerms: string[]
}

// Standard chapter structure (same for all tracks, content differs)
export const CHAPTER_BLUEPRINTS: Omit<ChapterBlueprint, 'lessons'>[] = [
  {
    orderIndex: 1,
    title: 'Interview Fundamentals',
    description: 'Understanding modern interview processes and what to expect',
    icon: '📚',
    estimatedMinutes: 90,
    isPremium: false,
  },
  {
    orderIndex: 2,
    title: 'Resume & Portfolio Optimization',
    description: 'Crafting materials that get you noticed and past ATS',
    icon: '📄',
    estimatedMinutes: 75,
    isPremium: false,
  },
  {
    orderIndex: 3,
    title: 'Technical Interview Mastery',
    description: 'Role-specific technical preparation and practice',
    icon: '🔧',
    estimatedMinutes: 120,
    isPremium: false,
  },
  {
    orderIndex: 4,
    title: 'Behavioral Interview Excellence',
    description: 'Master the STAR method and soft skills assessment',
    icon: '🗣️',
    estimatedMinutes: 90,
    isPremium: false,
  },
  {
    orderIndex: 5,
    title: 'Company Research & Culture Fit',
    description: 'Research strategies and demonstrating cultural alignment',
    icon: '🏢',
    estimatedMinutes: 60,
    isPremium: true,
  },
  {
    orderIndex: 6,
    title: 'Salary Negotiation',
    description: 'Strategies for negotiating compensation packages',
    icon: '💰',
    estimatedMinutes: 75,
    isPremium: true,
  },
  {
    orderIndex: 7,
    title: 'Post-Interview Strategy',
    description: 'Follow-ups, handling offers, and making decisions',
    icon: '🎯',
    estimatedMinutes: 45,
    isPremium: true,
  },
]

// ===========================================================
// CONTENT GENERATION
// ===========================================================

export interface GeneratedLesson {
  title: string
  description: string
  estimatedMinutes: number
  contentType: 'TEXT' | 'QUIZ'
  content: LessonContent
}

export interface LessonContent {
  sections: ContentSection[]
}

export interface ContentSection {
  type: 'text' | 'interactive' | 'download'
  data: TextSectionData | InteractiveSectionData | DownloadSectionData
}

export interface TextSectionData {
  title?: string
  body: string // Markdown
  highlights?: string[]
  examples?: { title: string; content: string }[]
}

export interface InteractiveSectionData {
  type: 'flashcard' | 'fill-blank' | 'matching'
  items: any[]
}

export interface DownloadSectionData {
  title: string
  description: string
  fileName: string
  fileUrl: string
}

// ===========================================================
// QUIZ GENERATION
// ===========================================================

export interface GeneratedQuiz {
  title: string
  description: string
  passingScore: number
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  type: 'multiple-choice' | 'true-false' | 'multi-select'
  question: string
  options: { id: string; text: string }[]
  correctAnswers: string[]
  explanation: string
  points: number
}

// ===========================================================
// DRAFT MANAGEMENT
// ===========================================================

export type DraftStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
export type DraftEntityType = 'CHAPTER' | 'LESSON' | 'QUIZ'

export interface ContentDraft {
  id: string
  entityType: DraftEntityType
  entityId: string | null // null if new
  trackId: CareerTrackId
  status: DraftStatus
  payload: any // GeneratedLesson | GeneratedQuiz | ChapterBlueprint
  prompt: string
  model: string
  generatedAt: Date
  publishedAt: Date | null
  hash: string
}

// ===========================================================
// SERVICE OPTIONS
// ===========================================================

export interface GenerateLessonOptions {
  trackId: CareerTrackId
  chapterTitle: string
  chapterIndex: number
  lessonTitle: string
  lessonIndex: number
  learningObjectives: string[]
  keyTerms: string[]
  previousLessonsSummary?: string
  customInstructions?: string
}

export interface GenerateQuizOptions {
  trackId: CareerTrackId
  chapterTitle: string
  lessonTitles: string[]
  keyTerms: string[]
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GenerateChapterBlueprintOptions {
  trackId: CareerTrackId
  chapterIndex: number
  chapterTitle: string
  lessonCount: number
}
