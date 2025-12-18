"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export type InterviewKitVisibility = "PRIVATE" | "PUBLIC"

export interface InterviewKitBlock {
  id: string
  type: string
  content: string
  meta?: Record<string, any>
}

export interface InterviewKitData {
  id: string
  ownerId: string
  isOwner: boolean
  title: string
  description: string | null
  visibility: InterviewKitVisibility
  blocksJson: InterviewKitBlock[]
  prepBlocksJson: InterviewKitBlock[]
  isArchived: boolean
  recommendCount: number
  recommendedByMe: boolean
  createdAt: string
  updatedAt: string
}

export interface InterviewKitSnapshotSummary {
  id: string
  kitId: string
  createdById: string
  label: string | null
  note: string | null
  createdAt: string
}

export interface PublicInterviewKitSummary {
  id: string
  ownerId: string
  title: string
  description: string | null
  recommendCount: number
  recommendedByMe: boolean
  updatedAt: string
}

const InterviewKitVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"])

const BlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1).max(40),
    content: z.string().default(""),
    meta: z.record(z.string(), z.any()).optional(),
  })
  .strict()

const BlocksSchema = z.array(BlockSchema)

const CreateInterviewKitSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional(),
    visibility: InterviewKitVisibilitySchema.optional(),
    blocksJson: BlocksSchema.optional(),
    prepBlocksJson: BlocksSchema.optional(),
  })
  .strict()

const UpdateInterviewKitSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    visibility: InterviewKitVisibilitySchema.optional(),
    blocksJson: BlocksSchema.optional(),
    prepBlocksJson: BlocksSchema.optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()

const CreateSnapshotSchema = z
  .object({
    label: z.string().trim().max(120).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()

async function getMyMentorFlag(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("community_profiles")
    .select("isMentor")
    .eq("userId", userId)
    .single()

  if (error || !data) return false
  return Boolean((data as any).isMentor)
}

async function assertCanPublish(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isMentor = await getMyMentorFlag(supabase, userId)
  if (!isMentor) {
    return { ok: false, error: "Only verified mentors can publish kits to the marketplace." }
  }

  const { data: kyc, error: kycError } = await supabase
    .from("mentor_kyc_verifications")
    .select("status")
    .eq("userId", userId)
    .maybeSingle()

  if (kycError) {
    return { ok: false, error: "Failed to verify mentor KYC status." }
  }

  if (!kyc || (kyc as any).status !== "APPROVED") {
    return { ok: false, error: "Mentor KYC approval is required to publish kits to the marketplace." }
  }
  return { ok: true }
}

export async function getMyMentorStatus(): Promise<{ data: { isMentor: boolean } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }
    const isMentor = await getMyMentorFlag(supabase, user.id)
    return { data: { isMentor }, error: null }
  } catch (err) {
    console.error("Unexpected error checking mentor status:", err)
    return { data: null, error: "Failed to check mentor status" }
  }
}

export async function getPublicInterviewKits(params?: {
  query?: string
}): Promise<{ data: PublicInterviewKitSummary[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    let q = supabase
      .from("interview_kits")
      .select("id, ownerId, title, description, updatedAt, recommendCount")
      .eq("visibility", "PUBLIC")
      .eq("isArchived", false)
      .order("updatedAt", { ascending: false })
      .limit(50)

    const raw = params?.query?.trim()
    const search = raw ? raw.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim() : ""
    if (search) {
      q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await q
    if (error) return { data: null, error: error.message }

    const kits = (data || []) as any[]
    const kitIds = kits.map((k) => k.id)

    let recommendedIds = new Set<string>()
    if (kitIds.length > 0) {
      const { data: recRows } = await supabase
        .from("interview_kit_recommendations")
        .select("kitId")
        .eq("userId", user.id)
        .in("kitId", kitIds)

      recommendedIds = new Set((recRows || []).map((r: any) => r.kitId))
    }

    const mapped = kits.map((k) => ({
      ...k,
      recommendCount: Number(k.recommendCount || 0),
      recommendedByMe: recommendedIds.has(k.id),
    }))

    return { data: mapped as any, error: null }
  } catch (err) {
    console.error("Unexpected error loading public kits:", err)
    return { data: null, error: "Failed to load marketplace kits" }
  }
}

export async function getMyInterviewKits(): Promise<{ data: InterviewKitData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("interview_kits")
      .select("*")
      .eq("ownerId", user.id)
      .order("updatedAt", { ascending: false })

    if (error) return { data: null, error: error.message }
    const mapped = (data || []).map((k: any) => ({
      ...k,
      isOwner: true,
      recommendCount: Number(k.recommendCount || 0),
      recommendedByMe: false,
    }))
    return { data: mapped as any, error: null }
  } catch (err) {
    console.error("Unexpected error loading kits:", err)
    return { data: null, error: "Failed to load kits" }
  }
}

export async function createInterviewKit(input: z.infer<typeof CreateInterviewKitSchema>): Promise<{
  data: InterviewKitData | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const parsed = CreateInterviewKitSchema.safeParse(input)
    if (!parsed.success) return { data: null, error: "Invalid input" }

    if (parsed.data.visibility === "PUBLIC") {
      const can = await assertCanPublish(supabase, user.id)
      if (!can.ok) return { data: null, error: can.error }
    }

    const { data, error } = await supabase
      .from("interview_kits")
      .insert({
        ownerId: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        visibility: parsed.data.visibility ?? "PRIVATE",
        blocksJson: parsed.data.blocksJson ?? [],
        prepBlocksJson: parsed.data.prepBlocksJson ?? [],
        isArchived: false,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return {
      data: ({ ...(data as any), isOwner: true, recommendCount: Number((data as any).recommendCount || 0), recommendedByMe: false } as any) as any,
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error creating kit:", err)
    return { data: null, error: "Failed to create kit" }
  }
}

export async function getInterviewKitById(kitId: string): Promise<{ data: InterviewKitData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase.from("interview_kits").select("*").eq("id", kitId).single()

    if (error) return { data: null, error: error.message }
    const isOwner = Boolean((data as any)?.ownerId && (data as any).ownerId === user.id)
    let recommendedByMe = false
    if (!isOwner) {
      const { data: recRow } = await supabase
        .from("interview_kit_recommendations")
        .select("id")
        .eq("kitId", kitId)
        .eq("userId", user.id)
        .maybeSingle()
      recommendedByMe = Boolean(recRow)
    }

    const mapped = {
      ...(data as any),
      isOwner,
      recommendCount: Number((data as any).recommendCount || 0),
      recommendedByMe,
    }
    return { data: mapped as any, error: null }
  } catch (err) {
    console.error("Unexpected error loading kit:", err)
    return { data: null, error: "Failed to load kit" }
  }
}

export async function updateInterviewKit(
  kitId: string,
  patch: z.infer<typeof UpdateInterviewKitSchema>
): Promise<{ data: InterviewKitData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const parsed = UpdateInterviewKitSchema.safeParse(patch)
    if (!parsed.success) return { data: null, error: "Invalid input" }

    if (Object.keys(parsed.data).length === 0) {
      return { data: null, error: "No updates provided" }
    }

    const { data: kitRow, error: kitRowError } = await supabase
      .from("interview_kits")
      .select("id, ownerId, visibility")
      .eq("id", kitId)
      .single()

    if (kitRowError || !kitRow) {
      return { data: null, error: kitRowError?.message || "Kit not found" }
    }

    const nextVisibility = (parsed.data.visibility ?? (kitRow as any).visibility) as InterviewKitVisibility
    if (nextVisibility === "PUBLIC") {
      const can = await assertCanPublish(supabase, user.id)
      if (!can.ok) return { data: null, error: can.error }
    }

    const { data, error } = await supabase
      .from("interview_kits")
      .update({
        ...parsed.data,
      })
      .eq("id", kitId)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return {
      data: ({
        ...(data as any),
        isOwner: true,
        recommendCount: Number((data as any).recommendCount || 0),
        recommendedByMe: false,
      } as any) as any,
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error updating kit:", err)
    return { data: null, error: "Failed to update kit" }
  }
}

export async function toggleInterviewKitRecommendation(
  kitId: string
): Promise<{ data: { recommended: boolean; recommendCount: number } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const insertRes = await supabase
      .from("interview_kit_recommendations")
      .insert({
        kitId,
        userId: user.id,
      })
      .select("id")
      .single()

    let recommended = true

    if (insertRes.error) {
      const code = (insertRes.error as any).code
      if (code === "23505") {
        const { error: delError } = await supabase
          .from("interview_kit_recommendations")
          .delete()
          .eq("kitId", kitId)
          .eq("userId", user.id)

        if (delError) return { data: null, error: delError.message }
        recommended = false
      } else {
        return { data: null, error: insertRes.error.message }
      }
    }

    const { data: kitRow, error: kitError } = await supabase
      .from("interview_kits")
      .select("recommendCount")
      .eq("id", kitId)
      .single()

    if (kitError) return { data: null, error: kitError.message }

    return {
      data: { recommended, recommendCount: Number((kitRow as any).recommendCount || 0) },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error toggling kit recommendation:", err)
    return { data: null, error: "Failed to update recommendation" }
  }
}

export async function deleteInterviewKit(kitId: string): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: false, error: "Unauthorized" }

    const { error } = await supabase.from("interview_kits").delete().eq("id", kitId)

    if (error) return { data: false, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    console.error("Unexpected error deleting kit:", err)
    return { data: false, error: "Failed to delete kit" }
  }
}

export async function listInterviewKitSnapshots(
  kitId: string
): Promise<{ data: InterviewKitSnapshotSummary[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("interview_kit_snapshots")
      .select("id, kitId, createdById, label, note, createdAt")
      .eq("kitId", kitId)
      .order("createdAt", { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: (data || []) as any, error: null }
  } catch (err) {
    console.error("Unexpected error loading snapshots:", err)
    return { data: null, error: "Failed to load snapshots" }
  }
}

export async function createInterviewKitSnapshot(
  kitId: string,
  input: z.infer<typeof CreateSnapshotSchema>
): Promise<{ data: InterviewKitSnapshotSummary | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const parsed = CreateSnapshotSchema.safeParse(input)
    if (!parsed.success) return { data: null, error: "Invalid input" }

    const { data: kit, error: kitError } = await supabase
      .from("interview_kits")
      .select("id, ownerId, blocksJson, prepBlocksJson")
      .eq("id", kitId)
      .single()

    if (kitError || !kit) return { data: null, error: kitError?.message || "Kit not found" }
    if (kit.ownerId !== user.id) return { data: null, error: "Not authorized" }

    const { data, error } = await supabase
      .from("interview_kit_snapshots")
      .insert({
        kitId,
        createdById: user.id,
        label: parsed.data.label || null,
        note: parsed.data.note || null,
        blocksJson: (kit as any).blocksJson ?? [],
        prepBlocksJson: (kit as any).prepBlocksJson ?? [],
      })
      .select("id, kitId, createdById, label, note, createdAt")
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as any, error: null }
  } catch (err) {
    console.error("Unexpected error creating snapshot:", err)
    return { data: null, error: "Failed to create snapshot" }
  }
}

export async function restoreInterviewKitSnapshot(
  kitId: string,
  snapshotId: string
): Promise<{ data: InterviewKitData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data: kit, error: kitError } = await supabase
      .from("interview_kits")
      .select("id, ownerId")
      .eq("id", kitId)
      .single()

    if (kitError || !kit) return { data: null, error: kitError?.message || "Kit not found" }
    if (kit.ownerId !== user.id) return { data: null, error: "Not authorized" }

    const { data: snapshot, error: snapError } = await supabase
      .from("interview_kit_snapshots")
      .select("id, kitId, blocksJson, prepBlocksJson")
      .eq("id", snapshotId)
      .eq("kitId", kitId)
      .single()

    if (snapError || !snapshot) return { data: null, error: snapError?.message || "Snapshot not found" }

    const { data, error } = await supabase
      .from("interview_kits")
      .update({
        blocksJson: (snapshot as any).blocksJson ?? [],
        prepBlocksJson: (snapshot as any).prepBlocksJson ?? [],
      })
      .eq("id", kitId)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as any, error: null }
  } catch (err) {
    console.error("Unexpected error restoring snapshot:", err)
    return { data: null, error: "Failed to restore snapshot" }
  }
}
