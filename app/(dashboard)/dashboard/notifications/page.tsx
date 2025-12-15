"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/actions/notifications.action";
import { toast } from "@/components/ui/use-toast";
import { useRealtimeNotifications } from "@/lib/hooks/use-realtime-notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  achievement_unlock: "🏆",
  level_up: "⭐",
  xp_earned: "✨",
  story_liked: "❤️",
  interview_reminder: "📅",
  application_update: "📋",
  streak_milestone: "🔥",
  system: "🔔",
};

const TYPE_COLORS: Record<string, string> = {
  achievement_unlock: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  level_up: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  story_liked: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
  interview_reminder: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  application_update: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  streak_milestone: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  system: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadLocal,
    markAllAsRead: markAllAsReadLocal,
    removeNotification,
  } = useRealtimeNotifications();

  async function handleMarkAsRead(id: string) {
    await markAsRead(id);
    markAsReadLocal(id);
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead();
    markAllAsReadLocal();
    toast({ title: "Done", description: "All notifications marked as read" });
  }

  async function handleDelete(id: string) {
    await deleteNotification(id);
    removeNotification(id);
    toast({
      title: "Deleted",
      description: "Notification removed",
    });
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function getRelativeTime(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading notifications...
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {filter === "unread"
                ? "You're all caught up!"
                : "Notifications about achievements, interviews, and more will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.isRead
                  ? TYPE_COLORS[notification.type] || TYPE_COLORS.system
                  : "bg-white dark:bg-gray-800"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <span className="text-2xl shrink-0">
                    {TYPE_ICONS[notification.type] || "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-semibold ${
                          !notification.isRead
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {getRelativeTime(notification.createdAt)}
                      </p>
                      {notification.link && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          View details
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-red-500"
                    aria-label={`Delete notification "${notification.title}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
