"use server"

import { adminSupabase } from "@/lib/supabase/server"
import { requireAtLeastRole } from "@/lib/auth/rbac"
import type { InterviewKitVisibility } from "@/lib/actions/interview-kits.action"

export interface AdminInterviewMaster {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  avatarUrl: string | null
  systemPrompt: string
  abilitiesJson: Record<string, any>
  defaultKitId: string | null
  isActive: boolean
  isPublic: boolean
  updatedAt: string
}

export interface AdminInterviewKitOption {
  id: string
  title: string
  visibility: InterviewKitVisibility
  isArchived: boolean
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function listInterviewMastersForAdmin(): Promise<{ data: AdminInterviewMaster[] | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    const { data, error } = await adminSupabase
      .from("interview_masters")
      .select("id, slug, displayName, tagline, avatarUrl, systemPrompt, abilitiesJson, defaultKitId, isActive, isPublic, updatedAt")
      .order("updatedAt", { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data || []) as AdminInterviewMaster[], error: null }
  } catch (err) {
    console.error("Error listing interview masters:", err)
    return { data: null, error: "Failed to load interview masters" }
  }
}

export async function listInterviewKitOptionsForAdmin(): Promise<{ data: AdminInterviewKitOption[] | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    const { data, error } = await adminSupabase
      .from("interview_kits")
      .select("id, title, visibility, isArchived")
      .order("title", { ascending: true })
      .limit(200)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data || []) as AdminInterviewKitOption[], error: null }
  } catch (err) {
    console.error("Error listing kits for admin:", err)
    return { data: null, error: "Failed to load kits" }
  }
}

export interface SaveInterviewMasterInput {
  id?: string
  slug?: string
  displayName: string
  tagline?: string | null
  avatarUrl?: string | null
  systemPrompt: string
  abilitiesJson?: string | Record<string, any>
  defaultKitId?: string | null
  isActive?: boolean
  isPublic?: boolean
}

export async function saveInterviewMaster(input: SaveInterviewMasterInput): Promise<{ data: AdminInterviewMaster | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")

    const safeSlug = slugify(input.slug || input.displayName || "")
    if (!safeSlug) {
      return { data: null, error: "Slug or display name is required" }
    }

    const abilities =
      typeof input.abilitiesJson === "string"
        ? parseAbilitiesJson(input.abilitiesJson)
        : input.abilitiesJson || {}

    if (!input.systemPrompt || input.systemPrompt.trim().length === 0) {
      return { data: null, error: "System prompt is required" }
    }

    const payload = {
      slug: safeSlug,
      displayName: input.displayName.trim(),
      tagline: input.tagline?.trim() || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      systemPrompt: input.systemPrompt.trim(),
      abilitiesJson: abilities,
      defaultKitId: input.defaultKitId || null,
      isActive: input.isActive ?? true,
      isPublic: input.isPublic ?? true,
    }

    const query = input.id
      ? adminSupabase.from("interview_masters").update(payload).eq("id", input.id)
      : adminSupabase.from("interview_masters").insert(payload)

    const { data, error } = await query
      .select("id, slug, displayName, tagline, avatarUrl, systemPrompt, abilitiesJson, defaultKitId, isActive, isPublic, updatedAt")
      .single()

    if (error) {
      console.error("Error saving interview master:", error)
      return { data: null, error: error.message }
    }

    return { data: data as AdminInterviewMaster, error: null }
  } catch (err) {
    console.error("Unexpected error saving interview master:", err)
    return { data: null, error: "Failed to save interview master" }
  }
}

export async function deleteInterviewMaster(masterId: string): Promise<{ data: { success: true } | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    if (!masterId) return { data: null, error: "Master id is required" }

    const { error } = await adminSupabase.from("interview_masters").delete().eq("id", masterId)
    if (error) {
      console.error("Error deleting interview master:", error)
      return { data: null, error: error.message }
    }

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error("Unexpected error deleting interview master:", err)
    return { data: null, error: "Failed to delete interview master" }
  }
}

function parseAbilitiesJson(raw: string): Record<string, any> {
  const trimmed = raw.trim()
  if (!trimmed) return {}
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, any>
    }
  } catch (err) {
    console.error("Invalid abilities JSON:", err)
  }
  return {}
}
