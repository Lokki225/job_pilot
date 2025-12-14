/**
 * Notification System - Central Export
 * 
 * This file provides a unified interface for the notification system.
 * Import from here for all notification-related functionality.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export {
  AppEvent,
  EVENT_META,
  EVENT_CATEGORIES,
  PRIORITY_CONFIG,
  DELIVERY_CHANNELS,
  type EventMeta,
  type EventCategory,
  type EventPriority,
  type DeliveryChannel,
  getEventsByCategory,
  getHighPriorityEvents,
  getEmailEvents,
  getEventIcon,
  shouldShowToast,
} from "@/lib/types/app-events";

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DISPATCHER (Server-side)
// ═══════════════════════════════════════════════════════════════════════════

export {
  emitEvent,
  emitEvents,
  emitEventForCurrentUser,
  notifyAchievement,
  notifyLevelUp,
  notifyInterviewReminder,
  notifyApplicationUpdate,
  notifyStoryLiked,
  notifyStreakMilestone,
  notifyWelcome,
  notifyChatMention,
  notifyStudyPlanComment,
  type EmitEventInput,
  type EmitEventResult,
  type BatchEmitInput,
  type UserNotificationPreferences,
} from "@/lib/services/event-dispatcher";

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION ACTIONS (Server-side)
// ═══════════════════════════════════════════════════════════════════════════

export {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  hasRecentReminder,
} from "@/lib/actions/notifications.action";

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCE ACTIONS (Server-side)
// ═══════════════════════════════════════════════════════════════════════════

export {
  getNotificationPreferences,
  updateNotificationPreferences,
  toggleCategoryMute,
  toggleEventMute,
  setQuietHours,
  setEmailDigestFrequency,
  getNotificationCategories,
  resetNotificationPreferences,
  type NotificationPreferencesData,
  type UpdatePreferencesInput,
} from "@/lib/actions/notification-preferences.action";
