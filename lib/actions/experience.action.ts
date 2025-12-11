// lib/actions/experience.ts
"use server"

import { z } from "zod"
import { createClient } from "../supabase/server"

const ExperienceSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
})

export async function createExperience(profileId: string, values: z.infer<typeof ExperienceSchema>) {
  try {
    const parsed = ExperienceSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("experiences")
      .insert({
        profileId,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating experience" }
  }
}

export async function listExperiences(profileId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("profileId", profileId)
      .order("startDate", { ascending: false })

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing experiences" }
  }
}

export async function updateExperience(id: string, values: z.infer<typeof ExperienceSchema>) {
  try {
    const supabase = await createClient();
    const parsed = ExperienceSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("experiences")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating experience" }
  }
}

export async function deleteExperience(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("experiences")
      .delete()
      .eq("id", id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting experience" }
  }
}