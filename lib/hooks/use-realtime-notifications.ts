"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

  // Initialize Supabase client once
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
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
    if (options.userId) {
      setUserId(options.userId);
      return;
    }

    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted && user) {
        setUserId(user.id);
      }
    });

    return () => {
      mounted = false;
    };
  }, [options.userId, supabase.auth]);

  // Handle new notification
  const handleNewNotification = useCallback(
    (notification: RealtimeNotification) => {
      // Add to local state
      setNotifications((prev) => {
        const existing = prev.find((n) => n.id === notification.id);
        
        // If notification already exists, don't process it again
        if (existing) {
          return prev;
        }
        
        const next = [notification, ...prev];

        setUnreadCount((countPrev) => {
          const isUnread = !notification.isRead;
          return isUnread ? countPrev + 1 : countPrev;
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

    let pollInterval: NodeJS.Timeout | null = null;
    let lastNotificationId: string | null = null;
    let lastRealtimeUpdate = Date.now();

    const channel = supabase
      .channel(`notifications_${userId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          lastRealtimeUpdate = Date.now();
          if (payload.new.userId !== userId) return;
          const newNotification: RealtimeNotification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            link: payload.new.link,
            isRead: payload.new.isRead || false,
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
          lastRealtimeUpdate = Date.now();
          if (payload.new.userId !== userId) return;
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
          lastRealtimeUpdate = Date.now();
          const deletedId = payload.old?.id;
          if (payload.old?.userId !== userId) return;
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

    // Fallback polling mechanism (every 10 seconds) in case realtime fails
    // Only polls if realtime hasn't received updates recently
    pollInterval = setInterval(async () => {
      try {
        // Only poll if realtime hasn't updated in the last 8 seconds
        if (Date.now() - lastRealtimeUpdate < 8000) {
          return;
        }
        
        const result = await getNotifications({ limit: 50 });
        if (result.data && result.data.length > 0) {
          const newestNotification = result.data[0];
          
          // Check if we have a new notification that wasn't in our local state
          if (!lastNotificationId || newestNotification.id !== lastNotificationId) {
            const existingIds = new Set(notifications.map((n) => n.id));
            
            result.data.forEach((notif) => {
              if (!existingIds.has(notif.id)) {
                handleNewNotification(notif);
              }
            });
            
            lastNotificationId = newestNotification.id;
          }
        }
      } catch (err) {
        console.error("Error in notification poll:", err);
      }
    }, 10000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, handleNewNotification, notifications]);

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
