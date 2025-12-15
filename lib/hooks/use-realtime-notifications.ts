"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AppEvent, EVENT_META, shouldShowToast } from "@/lib/types/app-events";
import { getNotifications, getUnreadCount } from "@/lib/actions/notifications.action";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UseRealtimeNotificationsOptions {
  userId?: string;
  onNewNotification?: (notification: RealtimeNotification) => void;
  onToastNotification?: (notification: RealtimeNotification) => void;
}

export interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(options.userId || null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!userId || hasLoadedInitial) return;

    let cancelled = false;
    setIsLoading(true);
    Promise.all([getNotifications({ limit: 50 }), getUnreadCount()])
      .then(([notificationsResult, unreadResult]) => {
        if (cancelled) return;
        if (notificationsResult.data) {
          setNotifications(notificationsResult.data as RealtimeNotification[]);
        }
        if (typeof unreadResult.data === "number") {
          setUnreadCount(unreadResult.data);
        }
        setHasLoadedInitial(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error loading initial notifications:", err);
        setHasLoadedInitial(true);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, hasLoadedInitial]);

  // Get current user if not provided
  useEffect(() => {
    if (!options.userId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id);
        }
      });
    }
  }, [options.userId, supabase.auth]);

  // Handle new notification
  const handleNewNotification = useCallback(
    (notification: RealtimeNotification) => {
      // Add to local state
      setNotifications((prev) => {
        const existing = prev.find((n) => n.id === notification.id);
        const next = [notification, ...prev.filter((n) => n.id !== notification.id)];

        setUnreadCount((countPrev) => {
          const wasUnread = existing ? !existing.isRead : false;
          const isUnread = !notification.isRead;

          let delta = 0;
          if (!existing) {
            delta = isUnread ? 1 : 0;
          } else if (wasUnread && !isUnread) {
            delta = -1;
          } else if (!wasUnread && isUnread) {
            delta = 1;
          }

          return Math.max(0, countPrev + delta);
        });

        return next.slice(0, 50);
      });

      // Call callback
      options.onNewNotification?.(notification);

      // Check if should show toast
      const eventType = notification.type as AppEvent;
      if (shouldShowToast(eventType)) {
        options.onToastNotification?.(notification);
      }
    },
    [options]
  );

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const newNotification: RealtimeNotification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            link: payload.new.link,
            isRead: payload.new.isRead,
            createdAt: payload.new.createdAt,
          };
          handleNewNotification(newNotification);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          // Update local state when notification is marked as read
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? { ...n, isRead: payload.new.isRead }
                : n
            )
          );
          
          // Update unread count
          if (payload.new.isRead && !payload.old?.isRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          if (!payload.new.isRead && payload.old?.isRead) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          if (payload.old && payload.old.isRead === false) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, handleNewNotification]);

  // Mark notification as read (local state only - actual update via server action)
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const toRemove = prev.find((n) => n.id === id);
      if (toRemove && !toRemove.isRead) {
        setUnreadCount((countPrev) => Math.max(0, countPrev - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  // Clear all notifications from local state
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION SOUND HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useNotificationSound() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudio = () => {
      if (!audioContext) {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
      }
      document.removeEventListener("click", initAudio);
    };

    document.addEventListener("click", initAudio);
    return () => document.removeEventListener("click", initAudio);
  }, [audioContext]);

  const playNotificationSound = useCallback(() => {
    if (!audioContext) return;

    // Create a simple notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, [audioContext]);

  return { playNotificationSound };
}
