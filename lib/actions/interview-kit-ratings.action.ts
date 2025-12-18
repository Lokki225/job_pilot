"use server"

import { z } from "zod"
import { adminSupabase, createClient } from "@/lib/supabase/server"

function nameFromProfileRow(row: any): string {
  const first = typeof row?.firstName === "string" ? row.firstName : ""
  const last = typeof row?.lastName === "string" ? row.lastName : ""
  const full = [first, last].filter(Boolean).join(" ").trim()
  return full || "User"
}

export interface InterviewKitRatingData {
  id: string
  kitId: string
  sessionId: string
  raterId: string
  rating: number
  review: string | null
  createdAt: string
  updatedAt: string
  author: {
    name: string
    avatarUrl: string | null
  } | null
}

export interface InterviewKitRatingsSummary {
  averageRating: number
  ratingCount: number
}

const SubmitRatingSchema = z
  .object({
    kitId: z.string().uuid(),
    sessionId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(4000).optional().nullable(),
  })
  .strict()

export async function getInterviewKitRatings(kitId: string): Promise<{
  data:
    | {
        summary: InterviewKitRatingsSummary
        ratings: InterviewKitRatingData[]
      }
    | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data: rows, error } = await supabase
      .from("interview_kit_ratings")
      .select("id, kitId, sessionId, raterId, rating, review, createdAt, updatedAt")
      .eq("kitId", kitId)
      .order("createdAt", { ascending: false })
      .limit(50)

    if (error) return { data: null, error: error.message }

    const ratings = (rows || []) as any[]
    const ratingCount = ratings.length
    const averageRating = ratingCount > 0 ? ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / ratingCount : 0

    const raterIds = Array.from(new Set(ratings.map((r) => r.raterId).filter(Boolean)))
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .in("userId", raterIds.length > 0 ? raterIds : ["00000000-0000-0000-0000-000000000000"])

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]))

    const mapped = ratings.map((r) => {
      const p = profileMap.get(r.raterId)
      return {
        ...r,
        rating: Number(r.rating || 0),
        author: p
          ? {
              name: nameFromProfileRow(p),
              avatarUrl: (p.avatarUrl as string | null) ?? null,
            }
          : null,
      } as InterviewKitRatingData
    })

    return {
      data: {
        summary: { averageRating, ratingCount },
        ratings: mapped,
      },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error loading kit ratings:", err)
    return { data: null, error: "Failed to load ratings" }
  }
}

export async function submitInterviewKitRating(input: z.infer<typeof SubmitRatingSchema>): Promise<{
  data: { rating: InterviewKitRatingData; summary: InterviewKitRatingsSummary } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const parsed = SubmitRatingSchema.safeParse(input)
    if (!parsed.success) return { data: null, error: "Invalid input" }

    const { data: row, error } = await supabase
      .from("interview_kit_ratings")
      .upsert(
        {
          kitId: parsed.data.kitId,
          sessionId: parsed.data.sessionId,
          raterId: user.id,
          rating: parsed.data.rating,
          review: parsed.data.review?.trim() ? parsed.data.review.trim() : null,
        },
        { onConflict: "kitId,sessionId,raterId" }
      )
      .select("id, kitId, sessionId, raterId, rating, review, createdAt, updatedAt")
      .single()

    if (error || !row) return { data: null, error: error?.message || "Failed to submit rating" }

    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId, firstName, lastName, avatarUrl")
      .eq("userId", user.id)
      .maybeSingle()

    const author = profiles
      ? {
          name: nameFromProfileRow(profiles),
          avatarUrl: (profiles as any)?.avatarUrl ?? null,
        }
      : null

    const rating: InterviewKitRatingData = {
      ...(row as any),
      rating: Number((row as any).rating || 0),
      author,
    }

    const summaryRes = await getInterviewKitRatings(parsed.data.kitId)
    if (summaryRes.error || !summaryRes.data) {
      return {
        data: {
          rating,
          summary: { averageRating: 0, ratingCount: 0 },
        },
        error: null,
      }
    }

    return {
      data: {
        rating,
        summary: summaryRes.data.summary,
      },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error submitting rating:", err)
    return { data: null, error: "Failed to submit rating" }
  }
}
