// lib/actions/skills.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const SkillSchema = z.object({
  name: z.string().min(1),
  level: z.number().min(1).max(5).optional(),
  category: z.string().optional(),
})

export async function createSkill(profileId: string, values: z.infer<typeof SkillSchema>) {
  try {
    
    const parsed = SkillSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("skills")
      .insert({
        profileId,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating skill" }
  }
}

export async function listSkills(profileId: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("profileId", profileId)
      .order("createdAt", { ascending: false })

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing skills" }
  }
}

export async function updateSkill(id: string, values: z.infer<typeof SkillSchema>) {
  try {
    
    const parsed = SkillSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("skills")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating skill" }
  }
}

export async function deleteSkill(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("skills")
      .delete()
      .eq("id", id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting skill" }
  }
}