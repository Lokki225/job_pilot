// lib/actions/ai-content.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const AIContentSchema = z.object({
  type: z.string().min(1),
  prompt: z.string().min(1),
  content: z.string().min(1),
  model: z.string().min(1),
  metadata: z.any().optional(),
})

export async function createAIContent(values: z.infer<typeof AIContentSchema>) {
  try {
    
    const parsed = AIContentSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

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
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    let query = supabase
      .from("ai_generated_content")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    if (type) {
      query = query.eq("type", type)
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
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("ai_generated_content")
      .delete()
      .eq("id", id)
      .eq("userId", user.id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting AI content" }
  }
}