"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Pencil, ThumbsUp, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { getInterviewKitRatings, type InterviewKitRatingData } from "@/lib/actions/interview-kit-ratings.action"
import {
  getInterviewKitById,
  toggleInterviewKitRecommendation,
  type InterviewKitBlock,
  type InterviewKitData,
} from "@/lib/actions/interview-kits.action"

export function InterviewKitDetails({ kitId }: { kitId: string }) {
  const router = useRouter()

  const [kit, setKit] = useState<InterviewKitData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecommending, setIsRecommending] = useState(false)

  const [isRatingsLoading, setIsRatingsLoading] = useState(false)
  const [ratings, setRatings] = useState<InterviewKitRatingData[]>([])
  const [ratingsSummary, setRatingsSummary] = useState<{ averageRating: number; ratingCount: number } | null>(null)

  const canRecommend = useMemo(() => {
    if (!kit) return false
    return !kit.isOwner && kit.visibility === "PUBLIC" && !kit.isArchived
  }, [kit])

  const loadKit = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getInterviewKitById(kitId)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Kit not found", variant: "destructive" })
        router.push("/dashboard/community/kits/marketplace")
        return
      }

      const k = res.data
      if (k.visibility !== "PUBLIC" && !k.isOwner) {
        toast({ title: "Not available", description: "This kit is not public.", variant: "destructive" })
        router.push("/dashboard/community/kits/marketplace")
        return
      }

      setKit(k)
    } finally {
      setIsLoading(false)
    }
  }, [kitId, router])

  useEffect(() => {
    loadKit()
  }, [loadKit])

  useEffect(() => {
    if (!kit) return
    ;(async () => {
      setIsRatingsLoading(true)
      try {
        const res = await getInterviewKitRatings(kit.id)
        if (res.error || !res.data) {
          setRatings([])
          setRatingsSummary(null)
          return
        }
        setRatings(res.data.ratings)
        setRatingsSummary(res.data.summary)
      } finally {
        setIsRatingsLoading(false)
      }
    })()
  }, [kit])

  async function handleToggleRecommend() {
    if (!kit) return
    if (!canRecommend) return

    setIsRecommending(true)
    try {
      const res = await toggleInterviewKitRecommendation(kit.id)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to recommend", variant: "destructive" })
        return
      }

      setKit((prev) =>
        prev
          ? {
              ...prev,
              recommendedByMe: res.data!.recommended,
              recommendCount: res.data!.recommendCount,
            }
          : prev
      )
    } finally {
      setIsRecommending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!kit) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/community/kits/marketplace">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold">{kit.title}</h1>
              <Badge variant={kit.visibility === "PUBLIC" ? "default" : "secondary"}>{kit.visibility}</Badge>
              {kit.isArchived && <Badge variant="secondary">Archived</Badge>}
            </div>
            {kit.description && <p className="text-muted-foreground line-clamp-2">{kit.description}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {canRecommend && (
            <Button variant={kit.recommendedByMe ? "default" : "outline"} onClick={handleToggleRecommend} disabled={isRecommending}>
              {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
              Recommend ({kit.recommendCount})
            </Button>
          )}
          {kit.isOwner && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/community/kits/${kit.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="prep">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prep">Prep Pack</TabsTrigger>
          <TabsTrigger value="live">Live Kit</TabsTrigger>
        </TabsList>

        <TabsContent value="prep" className="pt-4">
          <BlocksReadOnly title="Prep Pack" blocks={(kit.prepBlocksJson || []) as any} />
        </TabsContent>
        <TabsContent value="live" className="pt-4">
          <BlocksReadOnly title="Live Kit" blocks={(kit.blocksJson || []) as any} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ratings</span>
            {ratingsSummary ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                {ratingsSummary.averageRating.toFixed(1)} / 5 ({ratingsSummary.ratingCount})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRatingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading ratings…
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No ratings yet.</div>
          ) : (
            <div className="space-y-3">
              {ratings.slice(0, 10).map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{r.author?.name || "User"}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4" />
                      {r.rating} / 5
                    </div>
                  </div>
                  {r.review ? <div className="mt-2 whitespace-pre-wrap text-sm">{r.review}</div> : null}
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BlocksReadOnly({ title, blocks }: { title: string; blocks: InterviewKitBlock[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No content yet.
          </div>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="rounded-lg border p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{b.type}</div>
              <div className="whitespace-pre-wrap text-sm">{b.content}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
