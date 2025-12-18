"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Star, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { markInterviewSessionCompleted, setInterviewSessionKit, type InterviewSessionData } from "@/lib/actions/interviews.action"
import { submitInterviewKitRating } from "@/lib/actions/interview-kit-ratings.action"

function kitIdFromInput(value: string): string | null {
  const v = value.trim()
  if (!v) return null

  const m = v.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
  if (m?.[0]) return m[0]
  return null
}

export function InterviewKitRatingPanel(props: {
  session: InterviewSessionData
  onSessionUpdated: (session: InterviewSessionData) => void
}) {
  const { session, onSessionUpdated } = props

  const currentKitId = typeof session?.metadata?.kitId === "string" ? (session.metadata.kitId as string) : ""

  const [kitInput, setKitInput] = useState(currentKitId)
  const [isSettingKit, setIsSettingKit] = useState(false)

  const [isCompleting, setIsCompleting] = useState(false)

  const [rating, setRating] = useState("5")
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parsedKitId = useMemo(() => kitIdFromInput(kitInput), [kitInput])
  const canRate = session.status === "COMPLETED" && Boolean(parsedKitId)

  async function handleSetKit() {
    const kitId = parsedKitId
    if (!kitId) {
      toast({ title: "Invalid kit", description: "Paste a kit UUID or marketplace URL", variant: "destructive" })
      return
    }

    setIsSettingKit(true)
    try {
      const res = await setInterviewSessionKit(session.id, { kitId })
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to set kit", variant: "destructive" })
        return
      }
      onSessionUpdated(res.data.session)
      toast({ title: "Kit attached", description: "This session is now linked to the kit." })
    } finally {
      setIsSettingKit(false)
    }
  }

  async function handleCompleteSession() {
    if (!confirm("Mark this interview session as completed?")) return

    setIsCompleting(true)
    try {
      const res = await markInterviewSessionCompleted(session.id)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to complete session", variant: "destructive" })
        return
      }
      onSessionUpdated(res.data.session)
      toast({ title: "Session completed" })
    } finally {
      setIsCompleting(false)
    }
  }

  async function handleSubmitRating() {
    const kitId = parsedKitId
    if (!kitId) return

    setIsSubmitting(true)
    try {
      const res = await submitInterviewKitRating({
        kitId,
        sessionId: session.id,
        rating: Number(rating),
        review: review.trim() ? review.trim() : null,
      })

      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }

      toast({ title: "Thanks!", description: "Your rating was saved." })
      setReview("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kit & Rating</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Kit used (paste kit UUID or marketplace URL)</Label>
          <Input value={kitInput} onChange={(e) => setKitInput(e.target.value)} placeholder="e.g. /dashboard/community/kits/marketplace/<kitId>" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSetKit} disabled={isSettingKit || !parsedKitId}>
              {isSettingKit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set kit
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/community/kits/marketplace">Browse kits</Link>
            </Button>
            {parsedKitId ? (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/community/kits/marketplace/${parsedKitId}`}>View kit</Link>
              </Button>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">Current session status: {session.status}</div>
        </div>

        <div className="space-y-2">
          <Button variant="outline" onClick={handleCompleteSession} disabled={isCompleting || session.status === "COMPLETED"}>
            {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Mark session completed
          </Button>
        </div>

        <div className="h-px w-full bg-border" />

        <div className="space-y-3">
          <div className="font-medium">Rate this kit</div>

          {!canRate ? (
            <div className="text-sm text-muted-foreground">
              To rate: set a kit and mark the session completed.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["5", "4", "3", "2", "1"].map((v) => (
                        <SelectItem key={v} value={v}>
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {v}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Review (optional)</Label>
                  <Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} />
                </div>
              </div>

              <Button onClick={handleSubmitRating} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit rating
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
