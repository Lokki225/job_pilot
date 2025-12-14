"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AppEvent, EVENT_META, shouldShowToast } from "@/lib/types/app-events";

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
  markAsRead: (id: string) => void;
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
  const [userId, setUserId] = useState<string | null>(options.userId || null);

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep max 50
      setUnreadCount((prev) => prev + 1);

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

  // Clear all notifications from local state
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
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
