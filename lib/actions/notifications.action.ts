// lib/actions/notifications.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const NotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
})

export async function createNotification(values: z.infer<typeof NotificationSchema>) {
  try {
    
    const parsed = NotificationSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        userId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating notification" }
  }
}

export async function listNotifications(onlyUnread: boolean = false) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    if (onlyUnread) {
      query = query.eq("isRead", false)
    }

    const { data, error } = await query

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing notifications" }
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("notifications")
      .update({ isRead: true })
      .eq("id", id)
      .eq("userId", user.id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error marking notification as read" }
  }
}

export async function markAllNotificationsAsRead() {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("notifications")
      .update({ isRead: true })
      .eq("userId", user.id)
      .eq("isRead", false)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error marking all as read" }
  }
}

export async function deleteNotification(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("userId", user.id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting notification" }
  }
}