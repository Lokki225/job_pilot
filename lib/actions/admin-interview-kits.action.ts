"use server"

import { adminSupabase } from "@/lib/supabase/server"
import { requireAtLeastRole } from "@/lib/auth/rbac"
import type { InterviewKitBlock, InterviewKitVisibility } from "@/lib/actions/interview-kits.action"

export interface AdminInterviewKitRecord {
  id: string
  title: string
  description: string | null
  visibility: InterviewKitVisibility
  isArchived: boolean
  recommendCount: number
  updatedAt: string
  ownerId: string
}

export interface AdminInterviewKitDetail extends AdminInterviewKitRecord {
  blocksJson: InterviewKitBlock[]
  prepBlocksJson: InterviewKitBlock[]
}

function mapKitRow(row: any): AdminInterviewKitRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility as InterviewKitVisibility,
    isArchived: Boolean(row.isArchived),
    recommendCount: Number(row.recommendCount || 0),
    updatedAt: row.updatedAt,
    ownerId: row.ownerId,
  }
}

export async function listInterviewKitsForAdmin(): Promise<{ data: AdminInterviewKitRecord[] | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    const { data, error } = await adminSupabase
      .from("interview_kits")
      .select("id, title, description, visibility, isArchived, recommendCount, updatedAt, ownerId")
      .order("updatedAt", { ascending: false })
      .limit(200)

    if (error) {
      return { data: null, error: error.message }
    }

    const mapped = (data || []).map(mapKitRow)

    return { data: mapped, error: null }
  } catch (err) {
    console.error("Error listing interview kits (admin):", err)
    return { data: null, error: "Failed to load interview kits" }
  }
}

export async function getInterviewKitDetailForAdmin(
  kitId: string
): Promise<{ data: AdminInterviewKitDetail | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    if (!kitId) return { data: null, error: "Kit id is required" }

    const { data, error } = await adminSupabase
      .from("interview_kits")
      .select("id, title, description, visibility, isArchived, recommendCount, updatedAt, ownerId, blocksJson, prepBlocksJson")
      .eq("id", kitId)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }
    if (!data) return { data: null, error: "Kit not found" }

    const base = mapKitRow(data)

    return {
      data: {
        ...base,
        blocksJson: (data.blocksJson as InterviewKitBlock[]) || [],
        prepBlocksJson: (data.prepBlocksJson as InterviewKitBlock[]) || [],
      },
      error: null,
    }
  } catch (err) {
    console.error("Error fetching interview kit detail (admin):", err)
    return { data: null, error: "Failed to load interview kit" }
  }
}

export interface UpdateInterviewKitAdminInput {
  title?: string
  description?: string | null
  visibility?: InterviewKitVisibility
  isArchived?: boolean
  blocksJson?: InterviewKitBlock[]
  prepBlocksJson?: InterviewKitBlock[]
}

export async function updateInterviewKitAdmin(
  kitId: string,
  input: UpdateInterviewKitAdminInput
): Promise<{ data: AdminInterviewKitDetail | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")
    if (!kitId) return { data: null, error: "Kit id is required" }

    const patch: Record<string, any> = {}
    if (typeof input.title === "string") {
      const trimmed = input.title.trim()
      if (!trimmed) return { data: null, error: "Title cannot be empty" }
      patch.title = trimmed
    }
    if (input.description !== undefined) {
      patch.description = input.description?.trim() || null
    }
    if (input.visibility) {
      patch.visibility = input.visibility
    }
    if (typeof input.isArchived === "boolean") {
      patch.isArchived = input.isArchived
    }
    if (input.blocksJson) {
      patch.blocksJson = input.blocksJson
    }
    if (input.prepBlocksJson) {
      patch.prepBlocksJson = input.prepBlocksJson
    }

    if (Object.keys(patch).length === 0) {
      return { data: null, error: "No changes provided" }
    }

    const { data, error } = await adminSupabase
      .from("interview_kits")
      .update(patch)
      .eq("id", kitId)
      .select("id, title, description, visibility, isArchived, recommendCount, updatedAt, ownerId, blocksJson, prepBlocksJson")
      .single()

    if (error) {
      console.error("Error updating interview kit (admin):", error)
      return { data: null, error: error.message }
    }

    const base = mapKitRow(data)

    return {
      data: {
        ...base,
        blocksJson: (data.blocksJson as InterviewKitBlock[]) || [],
        prepBlocksJson: (data.prepBlocksJson as InterviewKitBlock[]) || [],
      },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error updating kit (admin):", err)
    return { data: null, error: "Failed to update interview kit" }
  }
}
