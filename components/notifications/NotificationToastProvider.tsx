"use client";

import { createContext, useContext, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  useRealtimeNotifications, 
  useNotificationSound,
  type RealtimeNotification 
} from "@/lib/hooks/use-realtime-notifications";
import { EVENT_META, AppEvent, PRIORITY_CONFIG } from "@/lib/types/app-events";
import { markAsRead } from "@/lib/actions/notifications.action";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ToastNotification extends RealtimeNotification {
  isVisible: boolean;
  timeoutId?: NodeJS.Timeout;
}

interface NotificationContextValue {
  showToast: (notification: RealtimeNotification) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  unreadCount: number;
  isConnected: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationToastProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function NotificationToast({
  notification,
  onDismiss,
  onClick,
}: {
  notification: ToastNotification;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const meta = EVENT_META[notification.type as AppEvent];
  const icon = meta?.icon || "🔔";
  const priority = meta?.priority || "medium";
  const priorityConfig = PRIORITY_CONFIG[priority];

  // Priority-based styling
  const priorityStyles = {
    low: "border-gray-200 dark:border-gray-700",
    medium: "border-blue-200 dark:border-blue-800",
    high: "border-purple-300 dark:border-purple-700 shadow-lg",
    urgent: "border-red-300 dark:border-red-700 shadow-xl animate-pulse",
  };

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border-2 
        bg-white dark:bg-gray-900 
        ${priorityStyles[priority]}
        transform transition-all duration-300 ease-out
        ${notification.isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
        max-w-sm w-full
      `}
      onClick={onClick}
    >
      {/* Icon */}
      <span className="text-2xl shrink-0">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
          {notification.title}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        {notification.link && (
          <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
            <ExternalLink className="h-3 w-3" />
            <span>Click to view</span>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Priority indicator */}
      {(priority === "high" || priority === "urgent") && (
        <div
          className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${
            priority === "urgent" ? "bg-red-500" : "bg-purple-500"
          }`}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function NotificationToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const { playNotificationSound } = useNotificationSound();

  // Handle dismissing a toast
  const dismissToast = useCallback((id: string) => {
    // First hide with animation
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          if (t.timeoutId) clearTimeout(t.timeoutId);
          return { ...t, isVisible: false };
        }
        return t;
      })
    );

    // Then remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  // Handle showing a toast
  const showToast = useCallback(
    (notification: RealtimeNotification) => {
      setToasts((prev) => {
        // Check if this notification is already being shown
        if (prev.some((t) => t.id === notification.id)) {
          return prev;
        }

        const meta = EVENT_META[notification.type as AppEvent];
        const priority = meta?.priority || "medium";
        const priorityConfig = PRIORITY_CONFIG[priority];

        // Play sound for urgent notifications
        if (priorityConfig.sound) {
          playNotificationSound();
        }

        // Create toast with visibility animation
        const toast: ToastNotification = {
          ...notification,
          isVisible: false,
        };

        // Limit to 5 toasts max
        const newToasts = [toast, ...prev].slice(0, 5);
        return newToasts;
      });

      // Trigger visibility animation
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === notification.id ? { ...t, isVisible: true } : t))
        );
      }, 50);

      // Auto-dismiss after delay
      setToasts((prev) => {
        const toast = prev.find((t) => t.id === notification.id);
        if (!toast) return prev;

        const meta = EVENT_META[notification.type as AppEvent];
        const priority = meta?.priority || "medium";
        const dismissDelay = priority === "urgent" ? 10000 : priority === "high" ? 7000 : 5000;
        
        const timeoutId = setTimeout(() => {
          dismissToast(notification.id);
        }, dismissDelay);

        return prev.map((t) => (t.id === notification.id ? { ...t, timeoutId } : t));
      });
    },
    [playNotificationSound, dismissToast]
  );

  // Handle dismissing all toasts
  const dismissAll = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => {
        if (t.timeoutId) clearTimeout(t.timeoutId);
      });
      return prev.map((t) => ({ ...t, isVisible: false }));
    });

    setTimeout(() => {
      setToasts([]);
    }, 300);
  }, []);

  // Handle toast click
  const handleToastClick = useCallback(
    async (notification: ToastNotification) => {
      // Mark as read
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Dismiss toast
      dismissToast(notification.id);

      // Navigate if link exists
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [router, dismissToast]
  );

  // Use realtime notifications hook
  const { unreadCount, isConnected } = useRealtimeNotifications({
    onToastNotification: showToast,
  });

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      toasts.forEach((t) => {
        if (t.timeoutId) clearTimeout(t.timeoutId);
      });
    };
  }, [toasts]);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        dismissToast,
        dismissAll,
        unreadCount,
        isConnected,
      }}
    >
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationToast
              notification={toast}
              onDismiss={() => dismissToast(toast.id)}
              onClick={() => handleToastClick(toast)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
