// lib/actions/education.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
})

export async function createEducation(profileId: string, values: z.infer<typeof EducationSchema>) {
  try {
    
    const parsed = EducationSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("educations")
      .insert({
        profileId,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating education" }
  }
}

export async function listEducations(profileId: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("educations")
      .select("*")
      .eq("profileId", profileId)
      .order("startDate", { ascending: false })

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing educations" }
  }
}

export async function updateEducation(id: string, values: z.infer<typeof EducationSchema>) {
  try {
    
    const parsed = EducationSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("educations")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating education" }
  }
}

export async function deleteEducation(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("educations")
      .delete()
      .eq("id", id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting education" }
  }
}