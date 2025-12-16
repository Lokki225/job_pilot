/**
 * Centralized Application Events System
 * 
 * This file defines all application events that can trigger notifications,
 * along with their metadata for consistent handling across the app.
 */

// ═══════════════════════════════════════════════════════════════════════════
// APP EVENT ENUM - Single source of truth for all notifiable events
// ═══════════════════════════════════════════════════════════════════════════

export enum AppEvent {
  // ─────────────────────────────────────────────────────────────────────────
  // GAMIFICATION / PROGRESS
  // ─────────────────────────────────────────────────────────────────────────
  ACHIEVEMENT_UNLOCKED = "achievement_unlocked",
  LEVEL_UP = "level_up",
  XP_EARNED = "xp_earned",
  STREAK_MILESTONE = "streak_milestone",
  BADGE_EARNED = "badge_earned",
  DAILY_GOAL_COMPLETED = "daily_goal_completed",

  // ─────────────────────────────────────────────────────────────────────────
  // JOB APPLICATIONS
  // ─────────────────────────────────────────────────────────────────────────
  APPLICATION_CREATED = "application_created",
  APPLICATION_STATUS_CHANGED = "application_status_changed",
  APPLICATION_OFFER_RECEIVED = "application_offer_received",
  APPLICATION_ACCEPTED = "application_accepted",
  APPLICATION_REJECTED = "application_rejected",
  APPLICATION_WITHDRAWN = "application_withdrawn",
  INTERVIEW_SCHEDULED = "interview_scheduled",
  INTERVIEW_UPDATED = "interview_updated",
  INTERVIEW_REMINDER_24H = "interview_reminder_24h",
  INTERVIEW_REMINDER_1H = "interview_reminder_1h",
  APPLICATION_DEADLINE_APPROACHING = "application_deadline_approaching",
  APPLICATION_FOLLOW_UP_3D = "application_follow_up_3d",
  APPLICATION_FOLLOW_UP_7D = "application_follow_up_7d",
  APPLICATION_FOLLOW_UP_14D = "application_follow_up_14d",
  JOB_ALERT_NEW_MATCHES = "job_alert_new_matches",

  // ─────────────────────────────────────────────────────────────────────────
  // COVER LETTERS
  // ─────────────────────────────────────────────────────────────────────────
  COVER_LETTER_GENERATED = "cover_letter_generated",
  COVER_LETTER_IMPROVED = "cover_letter_improved",
  COVER_LETTER_SENT = "cover_letter_sent",

  // ─────────────────────────────────────────────────────────────────────────
  // STUDY ROOM
  // ─────────────────────────────────────────────────────────────────────────
  LESSON_COMPLETED = "lesson_completed",
  CHAPTER_COMPLETED = "chapter_completed",
  TRACK_COMPLETED = "track_completed",
  STUDY_PLAN_CREATED = "study_plan_created",
  STUDY_PLAN_PUBLISHED = "study_plan_published",
  STUDY_PLAN_FORKED = "study_plan_forked",
  STUDY_PLAN_LIKED = "study_plan_liked",
  STUDY_PLAN_COMMENT_RECEIVED = "study_plan_comment_received",

  // ─────────────────────────────────────────────────────────────────────────
  // TRAINING ROOM (MOCK INTERVIEWS)
  // ─────────────────────────────────────────────────────────────────────────
  TRAINING_SESSION_STARTED = "training_session_started",
  TRAINING_SESSION_COMPLETED = "training_session_completed",
  TRAINING_SCORE_IMPROVED = "training_score_improved",
  TRAINING_NEW_HIGH_SCORE = "training_new_high_score",

  // ─────────────────────────────────────────────────────────────────────────
  // COMMUNITY
  // ─────────────────────────────────────────────────────────────────────────
  STORY_PUBLISHED = "story_published",
  STORY_LIKED = "story_liked",
  STORY_COMMENTED = "story_commented",
  STORY_SAVED = "story_saved",
  STORY_FEATURED = "story_featured",
  CHAT_MESSAGE_RECEIVED = "chat_message_received",
  CHAT_MENTION = "chat_mention",
  CHAT_REPLY_RECEIVED = "chat_reply_received",
  CHAT_REACTION_RECEIVED = "chat_reaction_received",
  CHAT_ROOM_JOINED = "chat_room_joined",
  CHAT_ROOM_INVITE = "chat_room_invite",
  FOLLOWER_NEW = "follower_new",

  // ─────────────────────────────────────────────────────────────────────────
  // MENTORSHIP
  // ─────────────────────────────────────────────────────────────────────────
  MENTORSHIP_REQUEST_RECEIVED = "mentorship_request_received",
  MENTORSHIP_REQUEST_ACCEPTED = "mentorship_request_accepted",
  MENTORSHIP_REQUEST_DECLINED = "mentorship_request_declined",

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM / ACCOUNT
  // ─────────────────────────────────────────────────────────────────────────
  CALENDAR_REMINDER_DUE = "calendar_reminder_due",
  WELCOME = "welcome",
  PROFILE_INCOMPLETE = "profile_incomplete",
  PROFILE_COMPLETED = "profile_completed",
  RESUME_UPLOADED = "resume_uploaded",
  RESUME_PARSED = "resume_parsed",
  WEEKLY_SUMMARY = "weekly_summary",
  MONTHLY_REPORT = "monthly_report",
  SYSTEM_ANNOUNCEMENT = "system_announcement",
  FEATURE_UPDATE = "feature_update",
  ACCOUNT_SECURITY = "account_security",
  SUBSCRIPTION_EXPIRING = "subscription_expiring",
  SUBSCRIPTION_RENEWED = "subscription_renewed",
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT CATEGORIES - For grouping and filtering
// ═══════════════════════════════════════════════════════════════════════════

export type EventCategory =
  | "gamification"
  | "jobs"
  | "cover_letters"
  | "study"
  | "training"
  | "community"
  | "system";

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; icon: string; description: string }> = {
  gamification: {
    label: "Achievements & Progress",
    icon: "🏆",
    description: "Level ups, achievements, streaks, and milestones",
  },
  jobs: {
    label: "Job Applications",
    icon: "💼",
    description: "Application updates, interviews, and offers",
  },
  cover_letters: {
    label: "Cover Letters",
    icon: "📝",
    description: "Cover letter generation and sending",
  },
  study: {
    label: "Study Room",
    icon: "📚",
    description: "Lessons, chapters, and study plans",
  },
  training: {
    label: "Training Room",
    icon: "🎯",
    description: "Mock interviews and practice sessions",
  },
  community: {
    label: "Community",
    icon: "👥",
    description: "Stories, chat, and social interactions",
  },
  system: {
    label: "System",
    icon: "⚙️",
    description: "Account, security, and announcements",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT PRIORITY - For sorting and display
// ═══════════════════════════════════════════════════════════════════════════

export type EventPriority = "low" | "medium" | "high" | "urgent";

export const PRIORITY_CONFIG: Record<EventPriority, { weight: number; showToast: boolean; sound: boolean }> = {
  low: { weight: 1, showToast: false, sound: false },
  medium: { weight: 2, showToast: false, sound: false },
  high: { weight: 3, showToast: true, sound: false },
  urgent: { weight: 4, showToast: true, sound: true },
};

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY CHANNELS - How notifications can be delivered
// ═══════════════════════════════════════════════════════════════════════════

export type DeliveryChannel = "in_app" | "email" | "push" | "sms";

export const DELIVERY_CHANNELS: Record<DeliveryChannel, { label: string; icon: string }> = {
  in_app: { label: "In-App", icon: "🔔" },
  email: { label: "Email", icon: "📧" },
  push: { label: "Push Notification", icon: "📱" },
  sms: { label: "SMS", icon: "💬" },
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT METADATA - Complete configuration for each event
// ═══════════════════════════════════════════════════════════════════════════

export interface EventMeta {
  icon: string;
  defaultTitle: string;
  category: EventCategory;
  priority: EventPriority;
  defaultChannels: DeliveryChannel[];
  description: string;
  actionLabel?: string;
  actionUrl?: string;
}

export const EVENT_META: Record<AppEvent, EventMeta> = {
  // ─────────────────────────────────────────────────────────────────────────
  // GAMIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.ACHIEVEMENT_UNLOCKED]: {
    icon: "🏆",
    defaultTitle: "Achievement Unlocked!",
    category: "gamification",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "You earned a new achievement",
    actionLabel: "View Achievements",
    actionUrl: "/dashboard/community/leaderboard",
  },
  [AppEvent.LEVEL_UP]: {
    icon: "⭐",
    defaultTitle: "Level Up!",
    category: "gamification",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "You reached a new level",
    actionLabel: "View Profile",
    actionUrl: "/dashboard",
  },
  [AppEvent.XP_EARNED]: {
    icon: "✨",
    defaultTitle: "XP Earned",
    category: "gamification",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "You earned experience points",
  },
  [AppEvent.STREAK_MILESTONE]: {
    icon: "🔥",
    defaultTitle: "Streak Milestone!",
    category: "gamification",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "You reached a practice streak milestone",
    actionLabel: "Keep Going",
    actionUrl: "/dashboard",
  },
  [AppEvent.BADGE_EARNED]: {
    icon: "🎖️",
    defaultTitle: "New Badge Earned!",
    category: "gamification",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You earned a new badge",
    actionLabel: "View Badges",
    actionUrl: "/dashboard/community/leaderboard",
  },
  [AppEvent.DAILY_GOAL_COMPLETED]: {
    icon: "✅",
    defaultTitle: "Daily Goal Complete!",
    category: "gamification",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You completed your daily goal",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JOB APPLICATIONS
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.APPLICATION_CREATED]: {
    icon: "📋",
    defaultTitle: "Application Added",
    category: "jobs",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "New job application tracked",
    actionLabel: "View Application",
  },
  [AppEvent.APPLICATION_STATUS_CHANGED]: {
    icon: "📊",
    defaultTitle: "Application Updated",
    category: "jobs",
    priority: "medium",
    defaultChannels: ["in_app", "email"],
    description: "Your application status changed",
    actionLabel: "View Details",
  },
  [AppEvent.APPLICATION_OFFER_RECEIVED]: {
    icon: "🎉",
    defaultTitle: "Congratulations! You Got an Offer!",
    category: "jobs",
    priority: "urgent",
    defaultChannels: ["in_app", "email", "push"],
    description: "You received a job offer",
    actionLabel: "View Offer",
  },
  [AppEvent.APPLICATION_ACCEPTED]: {
    icon: "🥳",
    defaultTitle: "Offer Accepted!",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "You accepted a job offer",
    actionLabel: "Celebrate",
  },
  [AppEvent.APPLICATION_REJECTED]: {
    icon: "😔",
    defaultTitle: "Application Update",
    category: "jobs",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Application status updated",
    actionLabel: "Keep Going",
    actionUrl: "/dashboard/jobs/search",
  },
  [AppEvent.APPLICATION_WITHDRAWN]: {
    icon: "🚫",
    defaultTitle: "Application Withdrawn",
    category: "jobs",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "You withdrew your application",
  },
  [AppEvent.INTERVIEW_SCHEDULED]: {
    icon: "📅",
    defaultTitle: "Interview Scheduled!",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app", "email", "push"],
    description: "You have an upcoming interview",
    actionLabel: "Prepare Now",
    actionUrl: "/dashboard/training",
  },
  [AppEvent.INTERVIEW_UPDATED]: {
    icon: "📅",
    defaultTitle: "Interview Updated",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Your interview details changed",
    actionLabel: "View Details",
  },
  [AppEvent.INTERVIEW_REMINDER_24H]: {
    icon: "⏰",
    defaultTitle: "Interview Tomorrow!",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app", "email", "push"],
    description: "Your interview is in 24 hours",
    actionLabel: "Practice Now",
    actionUrl: "/dashboard/training",
  },
  [AppEvent.INTERVIEW_REMINDER_1H]: {
    icon: "🚨",
    defaultTitle: "Interview in 1 Hour!",
    category: "jobs",
    priority: "urgent",
    defaultChannels: ["in_app", "push"],
    description: "Your interview starts soon",
    actionLabel: "Final Prep",
    actionUrl: "/dashboard/training",
  },
  [AppEvent.APPLICATION_DEADLINE_APPROACHING]: {
    icon: "⚠️",
    defaultTitle: "Deadline Approaching",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Application deadline is near",
    actionLabel: "Apply Now",
  },
  [AppEvent.APPLICATION_FOLLOW_UP_3D]: {
    icon: "📨",
    defaultTitle: "Follow-up Reminder (Day 3)",
    category: "jobs",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Reminder to follow up after applying",
    actionLabel: "View Application",
  },
  [AppEvent.APPLICATION_FOLLOW_UP_7D]: {
    icon: "📨",
    defaultTitle: "Follow-up Reminder (Day 7)",
    category: "jobs",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Reminder to follow up after applying",
    actionLabel: "View Application",
  },
  [AppEvent.APPLICATION_FOLLOW_UP_14D]: {
    icon: "📨",
    defaultTitle: "Follow-up Reminder (Day 14)",
    category: "jobs",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "Reminder to follow up after applying",
    actionLabel: "View Application",
  },
  [AppEvent.JOB_ALERT_NEW_MATCHES]: {
    icon: "🔔",
    defaultTitle: "New Job Matches",
    category: "jobs",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "New jobs matched one of your saved searches",
    actionLabel: "View Jobs",
    actionUrl: "/dashboard/jobs",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COVER LETTERS
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.COVER_LETTER_GENERATED]: {
    icon: "✍️",
    defaultTitle: "Cover Letter Ready",
    category: "cover_letters",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your cover letter has been generated",
    actionLabel: "Review & Edit",
  },
  [AppEvent.COVER_LETTER_IMPROVED]: {
    icon: "✨",
    defaultTitle: "Cover Letter Improved",
    category: "cover_letters",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "AI improved your cover letter",
    actionLabel: "View Changes",
  },
  [AppEvent.COVER_LETTER_SENT]: {
    icon: "📤",
    defaultTitle: "Application Sent!",
    category: "cover_letters",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your application was sent successfully",
    actionLabel: "Track Application",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STUDY ROOM
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.LESSON_COMPLETED]: {
    icon: "📖",
    defaultTitle: "Lesson Complete!",
    category: "study",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "You completed a lesson",
    actionLabel: "Next Lesson",
  },
  [AppEvent.CHAPTER_COMPLETED]: {
    icon: "📚",
    defaultTitle: "Chapter Complete!",
    category: "study",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You completed a chapter",
    actionLabel: "Continue Learning",
    actionUrl: "/dashboard/study",
  },
  [AppEvent.TRACK_COMPLETED]: {
    icon: "🎓",
    defaultTitle: "Track Completed!",
    category: "study",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "You completed an entire learning track",
    actionLabel: "View Certificate",
  },
  [AppEvent.STUDY_PLAN_CREATED]: {
    icon: "📝",
    defaultTitle: "Study Plan Created",
    category: "study",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Your study plan is ready",
    actionLabel: "Start Learning",
    actionUrl: "/dashboard/study/my-plans",
  },
  [AppEvent.STUDY_PLAN_PUBLISHED]: {
    icon: "🌐",
    defaultTitle: "Plan Published!",
    category: "study",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your study plan is now public",
    actionLabel: "View Plan",
  },
  [AppEvent.STUDY_PLAN_FORKED]: {
    icon: "🍴",
    defaultTitle: "Someone Forked Your Plan!",
    category: "study",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Another user forked your study plan",
    actionLabel: "View Plan",
  },
  [AppEvent.STUDY_PLAN_LIKED]: {
    icon: "❤️",
    defaultTitle: "Your Plan Got a Like!",
    category: "study",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Someone liked your study plan",
  },
  [AppEvent.STUDY_PLAN_COMMENT_RECEIVED]: {
    icon: "💬",
    defaultTitle: "New Comment on Your Plan",
    category: "study",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Someone commented on your study plan",
    actionLabel: "View Comment",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRAINING ROOM
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.TRAINING_SESSION_STARTED]: {
    icon: "🎬",
    defaultTitle: "Training Started",
    category: "training",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Mock interview session started",
  },
  [AppEvent.TRAINING_SESSION_COMPLETED]: {
    icon: "🎯",
    defaultTitle: "Training Complete!",
    category: "training",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You completed a mock interview",
    actionLabel: "View Results",
  },
  [AppEvent.TRAINING_SCORE_IMPROVED]: {
    icon: "📈",
    defaultTitle: "Score Improved!",
    category: "training",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your interview score improved",
    actionLabel: "View Progress",
    actionUrl: "/dashboard/training/history",
  },
  [AppEvent.TRAINING_NEW_HIGH_SCORE]: {
    icon: "🏅",
    defaultTitle: "New High Score!",
    category: "training",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "You set a new personal best",
    actionLabel: "Celebrate",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMMUNITY
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.STORY_PUBLISHED]: {
    icon: "📢",
    defaultTitle: "Story Published!",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your success story is now live",
    actionLabel: "View Story",
    actionUrl: "/dashboard/community",
  },
  [AppEvent.STORY_LIKED]: {
    icon: "❤️",
    defaultTitle: "Someone Liked Your Story!",
    category: "community",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Your story received a like",
    actionLabel: "View Story",
  },
  [AppEvent.STORY_COMMENTED]: {
    icon: "💬",
    defaultTitle: "New Comment on Your Story",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Someone commented on your story",
    actionLabel: "View Comment",
  },
  [AppEvent.STORY_SAVED]: {
    icon: "🔖",
    defaultTitle: "Story Saved!",
    category: "community",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Someone saved your story",
  },
  [AppEvent.STORY_FEATURED]: {
    icon: "⭐",
    defaultTitle: "Your Story is Featured!",
    category: "community",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Your story was featured on the homepage",
    actionLabel: "View Story",
  },
  [AppEvent.CHAT_MESSAGE_RECEIVED]: {
    icon: "💬",
    defaultTitle: "New Message",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You received a new chat message",
    actionLabel: "View Chat",
  },
  [AppEvent.CHAT_MENTION]: {
    icon: "📣",
    defaultTitle: "You Were Mentioned",
    category: "community",
    priority: "high",
    defaultChannels: ["in_app", "push"],
    description: "Someone mentioned you in a chat",
    actionLabel: "View Message",
  },
  [AppEvent.CHAT_REPLY_RECEIVED]: {
    icon: "↩️",
    defaultTitle: "New Reply",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Someone replied to your message",
    actionLabel: "View Reply",
  },
  [AppEvent.CHAT_REACTION_RECEIVED]: {
    icon: "😊",
    defaultTitle: "New Reaction",
    category: "community",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "Someone reacted to your message",
  },
  [AppEvent.CHAT_ROOM_JOINED]: {
    icon: "👋",
    defaultTitle: "Welcome to the Room!",
    category: "community",
    priority: "low",
    defaultChannels: ["in_app"],
    description: "You joined a chat room",
  },
  [AppEvent.CHAT_ROOM_INVITE]: {
    icon: "📨",
    defaultTitle: "Chat Room Invitation",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "You were invited to a chat room",
    actionLabel: "Join Room",
  },
  [AppEvent.FOLLOWER_NEW]: {
    icon: "👤",
    defaultTitle: "New Follower!",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Someone started following you",
    actionLabel: "View Profile",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MENTORSHIP
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.MENTORSHIP_REQUEST_RECEIVED]: {
    icon: "🤝",
    defaultTitle: "New Mentorship Request",
    category: "community",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Someone wants you to be their mentor",
    actionLabel: "Review Request",
    actionUrl: "/dashboard/community/hub/mentorship",
  },
  [AppEvent.MENTORSHIP_REQUEST_ACCEPTED]: {
    icon: "✅",
    defaultTitle: "Mentorship Request Accepted!",
    category: "community",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Your mentorship request was accepted",
    actionLabel: "View Mentorship",
    actionUrl: "/dashboard/community/hub/mentorship",
  },
  [AppEvent.MENTORSHIP_REQUEST_DECLINED]: {
    icon: "😔",
    defaultTitle: "Mentorship Request Declined",
    category: "community",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your mentorship request was declined",
    actionLabel: "Find Other Mentors",
    actionUrl: "/dashboard/community/hub/mentorship",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  [AppEvent.WELCOME]: {
    icon: "👋",
    defaultTitle: "Welcome to Job Pilot!",
    category: "system",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Get started with your job search journey",
    actionLabel: "Complete Profile",
    actionUrl: "/dashboard/onboarding/welcome",
  },
  [AppEvent.PROFILE_INCOMPLETE]: {
    icon: "📋",
    defaultTitle: "Complete Your Profile",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Add more details to improve your applications",
    actionLabel: "Complete Now",
    actionUrl: "/dashboard/profile",
  },
  [AppEvent.PROFILE_COMPLETED]: {
    icon: "✅",
    defaultTitle: "Profile Complete!",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your profile is now complete",
    actionLabel: "View Profile",
    actionUrl: "/dashboard/profile",
  },
  [AppEvent.RESUME_UPLOADED]: {
    icon: "📄",
    defaultTitle: "Resume Uploaded",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Your resume was uploaded successfully",
    actionLabel: "View Resume",
    actionUrl: "/dashboard/profile",
  },
  [AppEvent.RESUME_PARSED]: {
    icon: "🔍",
    defaultTitle: "Resume Analyzed",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "AI extracted your skills and experience",
    actionLabel: "Review Details",
    actionUrl: "/dashboard/profile",
  },
  [AppEvent.WEEKLY_SUMMARY]: {
    icon: "📊",
    defaultTitle: "Your Weekly Summary",
    category: "system",
    priority: "low",
    defaultChannels: ["in_app", "email"],
    description: "Review your progress this week",
    actionLabel: "View Summary",
    actionUrl: "/dashboard",
  },
  [AppEvent.MONTHLY_REPORT]: {
    icon: "📈",
    defaultTitle: "Monthly Progress Report",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app", "email"],
    description: "Your monthly job search insights",
    actionLabel: "View Report",
    actionUrl: "/dashboard",
  },
  [AppEvent.SYSTEM_ANNOUNCEMENT]: {
    icon: "📢",
    defaultTitle: "Announcement",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Important system announcement",
  },
  [AppEvent.FEATURE_UPDATE]: {
    icon: "🚀",
    defaultTitle: "New Feature Available!",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app"],
    description: "Check out what's new",
    actionLabel: "Learn More",
  },
  [AppEvent.ACCOUNT_SECURITY]: {
    icon: "🔐",
    defaultTitle: "Security Alert",
    category: "system",
    priority: "urgent",
    defaultChannels: ["in_app", "email", "push"],
    description: "Important security notification",
    actionLabel: "Review",
    actionUrl: "/dashboard/settings",
  },
  [AppEvent.SUBSCRIPTION_EXPIRING]: {
    icon: "⏳",
    defaultTitle: "Subscription Expiring Soon",
    category: "system",
    priority: "high",
    defaultChannels: ["in_app", "email"],
    description: "Your subscription is about to expire",
    actionLabel: "Renew Now",
    actionUrl: "/dashboard/settings",
  },
  [AppEvent.SUBSCRIPTION_RENEWED]: {
    icon: "✅",
    defaultTitle: "Subscription Renewed",
    category: "system",
    priority: "medium",
    defaultChannels: ["in_app", "email"],
    description: "Your subscription was renewed successfully",
  },
  [AppEvent.CALENDAR_REMINDER_DUE]: {
    icon: "📅",
    defaultTitle: "Calendar Reminder",
    category: "system",
    priority: "high",
    defaultChannels: ["in_app"],
    description: "A calendar reminder is due",
    actionLabel: "Open Calendar",
    actionUrl: "/dashboard/calendar",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all events for a specific category
 */
export function getEventsByCategory(category: EventCategory): AppEvent[] {
  return Object.entries(EVENT_META)
    .filter(([_, meta]) => meta.category === category)
    .map(([event]) => event as AppEvent);
}

/**
 * Get all high-priority events (for toast notifications)
 */
export function getHighPriorityEvents(): AppEvent[] {
  return Object.entries(EVENT_META)
    .filter(([_, meta]) => meta.priority === "high" || meta.priority === "urgent")
    .map(([event]) => event as AppEvent);
}

/**
 * Get events that should trigger email notifications by default
 */
export function getEmailEvents(): AppEvent[] {
  return Object.entries(EVENT_META)
    .filter(([_, meta]) => meta.defaultChannels.includes("email"))
    .map(([event]) => event as AppEvent);
}

/**
 * Get the icon for an event type (for backward compatibility)
 */
export function getEventIcon(eventType: string): string {
  const event = eventType as AppEvent;
  return EVENT_META[event]?.icon || "🔔";
}

/**
 * Check if an event should show a toast notification
 */
export function shouldShowToast(event: AppEvent): boolean {
  const meta = EVENT_META[event];
  return PRIORITY_CONFIG[meta.priority].showToast;
}
