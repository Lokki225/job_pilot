"use server"

import { z } from "zod"
import { adminSupabase, createClient } from "@/lib/supabase/server"

const CreateSavedJobSearchSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    filters: z.record(z.string(), z.any()),
    isEnabled: z.boolean().optional(),
    frequency: z.string().trim().min(1).max(20).optional(),
    notifyOnMatch: z.boolean().optional(),
  })
  .strict()

export async function getSavedJobSearches(): Promise<{
  data: any[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from("saved_job_searches")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data || [], error: null }
  } catch (err) {
    console.error("Unexpected error getting saved searches:", err)
    return { data: null, error: "Failed to load saved searches" }
  }
}

export async function createSavedJobSearch(input: z.infer<typeof CreateSavedJobSearchSchema>): Promise<{
  data: any | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const parsed = CreateSavedJobSearchSchema.safeParse(input)
    if (!parsed.success) {
      return { data: null, error: "Invalid input" }
    }

    const now = new Date().toISOString()

    const { data, error } = await adminSupabase
      .from("saved_job_searches")
      .insert({
        userId: user.id,
        name: parsed.data.name,
        filters: parsed.data.filters,
        isEnabled: parsed.data.isEnabled ?? true,
        frequency: parsed.data.frequency ?? "daily",
        notifyOnMatch: parsed.data.notifyOnMatch ?? true,
        lastSeenJobKeys: [],
        createdAt: now,
        updatedAt: now,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error creating saved search:", err)
    return { data: null, error: "Failed to create saved search" }
  }
}

export async function deleteSavedJobSearch(searchId: string): Promise<{
  data: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: false, error: "Unauthorized" }
    }

    const { error } = await adminSupabase
      .from("saved_job_searches")
      .delete()
      .eq("id", searchId)
      .eq("userId", user.id)

    if (error) return { data: false, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    console.error("Unexpected error deleting saved search:", err)
    return { data: false, error: "Failed to delete saved search" }
  }
}

export async function updateSavedJobSearch(searchId: string, patch: Record<string, any>): Promise<{
  data: any | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from("saved_job_searches")
      .update({
        ...patch,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", searchId)
      .eq("userId", user.id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error updating saved search:", err)
    return { data: null, error: "Failed to update saved search" }
  }
}
