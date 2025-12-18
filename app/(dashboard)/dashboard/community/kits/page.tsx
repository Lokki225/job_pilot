"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Trash2, EyeOff, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { deleteInterviewKit, getMyInterviewKits, type InterviewKitData } from "@/lib/actions/interview-kits.action"

export default function KitsListPage() {
  const router = useRouter()
  const [kits, setKits] = useState<InterviewKitData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadKits() {
    setIsLoading(true)
    try {
      const res = await getMyInterviewKits()
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }
      setKits(res.data || [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKits()
  }, [])

  async function handleDelete(kitId: string) {
    if (!confirm("Delete this kit?")) return
    const res = await deleteInterviewKit(kitId)
    if (res.error || !res.data) {
      toast({ title: "Error", description: res.error || "Failed to delete", variant: "destructive" })
      return
    }
    setKits((prev) => prev.filter((k) => k.id !== kitId))
    toast({ title: "Deleted", description: "Kit deleted" })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Kits</h1>
          <p className="text-muted-foreground">Create prep packs + live interviewer kits (block-based)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/community/kits/marketplace">Marketplace</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/community/kits/new">
              <Plus className="mr-2 h-4 w-4" />
              New kit
            </Link>
          </Button>
        </div>
      </div>

      {kits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold">No kits yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first kit to reuse during peer interviews.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/community/kits/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create kit
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kits.map((k) => (
            <Card
              key={k.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => router.push(`/dashboard/community/kits/${k.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="min-w-0 flex-1 truncate text-lg">{k.title}</CardTitle>
                  <Badge variant={k.visibility === "PUBLIC" ? "default" : "secondary"}>
                    {k.visibility === "PUBLIC" ? (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Public
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        Private
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {k.description && <div className="line-clamp-2 text-sm text-muted-foreground">{k.description}</div>}
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(k.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(k.id)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
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
