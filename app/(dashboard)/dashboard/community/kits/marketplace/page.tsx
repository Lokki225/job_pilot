"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Search, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  getPublicInterviewKits,
  toggleInterviewKitRecommendation,
  type PublicInterviewKitSummary,
} from "@/lib/actions/interview-kits.action"

export default function KitsMarketplacePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [kits, setKits] = useState<PublicInterviewKitSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingKitId, setPendingKitId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await getPublicInterviewKits({ query })
        if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" })
          return
        }
        setKits(res.data || [])
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/community/kits">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Kits Marketplace</h1>
            <p className="text-muted-foreground">Browse public kits published by mentors</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kits..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/community/kits")}>My kits</Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : kits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No public kits found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kits.map((k) => (
            <Card
              key={k.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => router.push(`/dashboard/community/kits/marketplace/${k.id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="truncate text-lg">{k.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {k.description && <div className="line-clamp-2 text-sm text-muted-foreground">{k.description}</div>}
                <div className="text-xs text-muted-foreground">Updated {new Date(k.updatedAt).toLocaleDateString()}</div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={k.recommendedByMe ? "default" : "outline"}
                    disabled={pendingKitId === k.id}
                    onClick={async (e) => {
                      e.stopPropagation()
                      setPendingKitId(k.id)
                      try {
                        const res = await toggleInterviewKitRecommendation(k.id)
                        if (res.error || !res.data) {
                          toast({ title: "Error", description: res.error || "Failed to recommend", variant: "destructive" })
                          return
                        }
                        setKits((prev) =>
                          prev.map((x) =>
                            x.id === k.id
                              ? { ...x, recommendedByMe: res.data!.recommended, recommendCount: res.data!.recommendCount }
                              : x
                          )
                        )
                      } finally {
                        setPendingKitId(null)
                      }
                    }}
                  >
                    {pendingKitId === k.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="mr-2 h-4 w-4" />
                    )}
                    Recommend ({k.recommendCount})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
