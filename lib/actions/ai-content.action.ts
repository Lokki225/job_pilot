// lib/actions/ai-content.ts
"use server"

import { z } from "zod"
import { createClient } from "../supabase/server"
import { checkRateLimit } from "../utils/rate-limit"

const AIContentSchema = z.object({
  type: z.string().trim().min(1).max(64),
  prompt: z.string().trim().min(1).max(4000),
  content: z.string().trim().min(1).max(20000),
  model: z.string().trim().min(1).max(128),
  metadata: z.any().optional(),
})

export async function createAIContent(values: z.infer<typeof AIContentSchema>) {
  try {
    
    const parsed = AIContentSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const rate = checkRateLimit(`ai-content:create:${user.id}`, 30, 60_000)
    if (!rate.allowed) return { data: null, error: "Too many requests" }

    const { data, error } = await supabase
      .from("ai_generated_content")
      .insert({
        userId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating AI content" }
  }
}

export async function listAIContent(type?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const safeType = type?.trim().slice(0, 64)

    let query = supabase
      .from("ai_generated_content")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    if (safeType) {
      query = query.eq("type", safeType)
    }

    const { data, error } = await query

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing AI content" }
  }
}

export async function deleteAIContent(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const safeId = typeof id === 'string' ? id.trim().slice(0, 128) : ''
    if (!safeId) return { data: null, error: 'Invalid id' }

    const rate = checkRateLimit(`ai-content:delete:${user.id}`, 60, 60_000)
    if (!rate.allowed) return { data: null, error: "Too many requests" }

    const { error } = await supabase
      .from("ai_generated_content")
      .delete()
      .eq("id", safeId)
      .eq("userId", user.id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting AI content" }
  }
}