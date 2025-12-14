// lib/actions/project.action.ts
"use server"

import { z } from "zod"
import { createClient } from "../supabase/server"

const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
  isCurrent: z.boolean().default(false),
})

export async function createProject(values: z.infer<typeof ProjectSchema>) {
  try {
    
    const parsed = ProjectSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        profileId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating project" }
  }
}

export async function getProjects() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("profileId", user.id)
      .order("startDate", { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error fetching projects" }
  }
}

export async function updateProject(id: string, values: Partial<z.infer<typeof ProjectSchema>>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("projects")
      .update(values)
      .eq("id", id)
      .eq("profileId", user.id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating project" }
  }
}

export async function deleteProject(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("profileId", user.id)

    if (error) return { data: null, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting project" }
  }
}