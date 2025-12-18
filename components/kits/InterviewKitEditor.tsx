"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Copy,
  ThumbsUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  createInterviewKitSnapshot,
  deleteInterviewKit,
  getMyMentorStatus,
  getInterviewKitById,
  listInterviewKitSnapshots,
  restoreInterviewKitSnapshot,
  toggleInterviewKitRecommendation,
  updateInterviewKit,
  type InterviewKitBlock,
  type InterviewKitData,
  type InterviewKitSnapshotSummary,
  type InterviewKitVisibility,
} from "@/lib/actions/interview-kits.action"

const BLOCK_TYPES = [
  { value: "heading", label: "Heading" },
  { value: "agenda", label: "Agenda" },
  { value: "question", label: "Question" },
  { value: "rubric", label: "Rubric" },
  { value: "checklist", label: "Checklist" },
  { value: "notes", label: "Notes" },
  { value: "custom", label: "Custom" },
]

function makeId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function InterviewKitEditor({ kitId }: { kitId: string }) {
  const router = useRouter()

  const [kit, setKit] = useState<InterviewKitData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isMentor, setIsMentor] = useState(false)
  const [isMentorLoading, setIsMentorLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<InterviewKitVisibility>("PRIVATE")

  const [liveBlocks, setLiveBlocks] = useState<InterviewKitBlock[]>([])
  const [prepBlocks, setPrepBlocks] = useState<InterviewKitBlock[]>([])

  const [snapshots, setSnapshots] = useState<InterviewKitSnapshotSummary[]>([])
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false)

  const [snapshotLabel, setSnapshotLabel] = useState("")
  const [snapshotNote, setSnapshotNote] = useState("")
  const [isSnapshotCreating, setIsSnapshotCreating] = useState(false)

  const [isRecommending, setIsRecommending] = useState(false)

  const isReadOnly = Boolean(kit && !kit.isOwner)
  const canRecommend = Boolean(kit && !kit.isOwner && kit.visibility === "PUBLIC" && !kit.isArchived)

  const hasUnsavedChanges = useMemo(() => {
    if (!kit) return false
    return (
      title !== kit.title ||
      (description || "") !== (kit.description || "") ||
      visibility !== kit.visibility ||
      JSON.stringify(liveBlocks) !== JSON.stringify((kit.blocksJson || []) as any) ||
      JSON.stringify(prepBlocks) !== JSON.stringify((kit.prepBlocksJson || []) as any)
    )
  }, [kit, title, description, visibility, liveBlocks, prepBlocks])

  const loadKit = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getInterviewKitById(kitId)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Kit not found", variant: "destructive" })
        router.push("/dashboard/community/kits")
        return
      }

      setKit(res.data)
      setTitle(res.data.title)
      setDescription(res.data.description || "")
      setVisibility(res.data.visibility)
      setLiveBlocks((res.data.blocksJson || []) as any)
      setPrepBlocks((res.data.prepBlocksJson || []) as any)
    } finally {
      setIsLoading(false)
    }
  }, [kitId, router])

  const loadSnapshots = useCallback(async () => {
    setIsSnapshotsLoading(true)
    try {
      const res = await listInterviewKitSnapshots(kitId)
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }
      setSnapshots(res.data || [])
    } finally {
      setIsSnapshotsLoading(false)
    }
  }, [kitId])

  useEffect(() => {
    loadKit()
    loadSnapshots()
  }, [loadKit, loadSnapshots])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsMentorLoading(true)
      try {
        const res = await getMyMentorStatus()
        if (!mounted) return
        setIsMentor(Boolean(res.data?.isMentor))
      } finally {
        if (mounted) setIsMentorLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please enter a kit title", variant: "destructive" })
      return
    }

    if (isReadOnly) {
      toast({ title: "Read-only", description: "You can’t edit a kit you don’t own.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const res = await updateInterviewKit(kitId, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        visibility,
        blocksJson: liveBlocks,
        prepBlocksJson: prepBlocks,
      })

      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to save", variant: "destructive" })
        return
      }

      setKit(res.data)
      toast({ title: "Saved", description: "Kit updated" })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteKit() {
    if (!confirm("Delete this kit? This cannot be undone.")) return

    if (isReadOnly) {
      toast({ title: "Read-only", description: "You can’t delete a kit you don’t own.", variant: "destructive" })
      return
    }

    setIsDeleting(true)
    try {
      const res = await deleteInterviewKit(kitId)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to delete", variant: "destructive" })
        return
      }
      toast({ title: "Deleted", description: "Kit deleted" })
      router.push("/dashboard/community/kits")
    } finally {
      setIsDeleting(false)
    }
  }

  function addBlock(target: "live" | "prep") {
    const block: InterviewKitBlock = { id: makeId(), type: "question", content: "" }
    if (target === "live") setLiveBlocks((prev) => [...prev, block])
    else setPrepBlocks((prev) => [...prev, block])
  }

  function updateBlock(target: "live" | "prep", blockId: string, patch: Partial<InterviewKitBlock>) {
    const setter = target === "live" ? setLiveBlocks : setPrepBlocks
    setter((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)))
  }

  function deleteBlock(target: "live" | "prep", blockId: string) {
    const setter = target === "live" ? setLiveBlocks : setPrepBlocks
    setter((prev) => prev.filter((b) => b.id !== blockId))
  }

  function moveBlock(target: "live" | "prep", from: number, to: number) {
    const setter = target === "live" ? setLiveBlocks : setPrepBlocks
    setter((prev) => move(prev, from, to))
  }

  async function handleCreateSnapshot() {
    if (isReadOnly) {
      toast({ title: "Read-only", description: "You can’t snapshot a kit you don’t own.", variant: "destructive" })
      return
    }

    setIsSnapshotCreating(true)
    try {
      const res = await createInterviewKitSnapshot(kitId, {
        label: snapshotLabel.trim() || undefined,
        note: snapshotNote.trim() || undefined,
      })
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }
      setSnapshotLabel("")
      setSnapshotNote("")
      toast({ title: "Snapshot created" })
      loadSnapshots()
    } finally {
      setIsSnapshotCreating(false)
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    if (!confirm("Restore this snapshot? This will overwrite the current kit blocks.")) return

    if (isReadOnly) {
      toast({ title: "Read-only", description: "You can’t restore snapshots on a kit you don’t own.", variant: "destructive" })
      return
    }

    const res = await restoreInterviewKitSnapshot(kitId, snapshotId)
    if (res.error || !res.data) {
      toast({ title: "Error", description: res.error || "Failed to restore", variant: "destructive" })
      return
    }

    setKit(res.data)
    setTitle(res.data.title)
    setDescription(res.data.description || "")
    setVisibility(res.data.visibility)
    setLiveBlocks((res.data.blocksJson || []) as any)
    setPrepBlocks((res.data.prepBlocksJson || []) as any)
    toast({ title: "Snapshot restored" })
  }

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

  async function handleDuplicateBlock(target: "live" | "prep", block: InterviewKitBlock) {
    const copy: InterviewKitBlock = {
      ...block,
      id: makeId(),
    }
    if (target === "live") setLiveBlocks((prev) => [...prev, copy])
    else setPrepBlocks((prev) => [...prev, copy])
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
            <Link href="/dashboard/community/kits">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold">{title || kit.title}</h1>
              {hasUnsavedChanges && <Badge variant="outline">Unsaved</Badge>}
              {kit.isArchived && <Badge variant="secondary">Archived</Badge>}
              {isReadOnly && <Badge variant="secondary">Read-only</Badge>}
            </div>
            <p className="text-muted-foreground">Block-based prep + live materials</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadKit()} disabled={isSaving || isDeleting}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          {canRecommend && (
            <Button variant={kit.recommendedByMe ? "default" : "outline"} onClick={handleToggleRecommend} disabled={isRecommending}>
              {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
              Recommend ({kit.recommendCount})
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || isDeleting || isReadOnly}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button variant="destructive" onClick={handleDeleteKit} disabled={isSaving || isDeleting || isReadOnly}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kit Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isReadOnly} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as InterviewKitVisibility)}
              disabled={isReadOnly || isMentorLoading}
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="PUBLIC" disabled={!isMentor}>
                  Public
                </SelectItem>
              </SelectContent>
            </Select>
            {!isReadOnly && !isMentorLoading && !isMentor && (
              <div className="text-xs text-muted-foreground">Only verified mentors can publish kits.</div>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this kit for?"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="live">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Kit</TabsTrigger>
          <TabsTrigger value="prep">Prep Pack</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4 pt-4">
          <BlocksEditor
            title="Live blocks"
            description="Used during the interview (interviewer workspace)."
            blocks={liveBlocks}
            onAdd={() => addBlock("live")}
            onUpdate={(id, patch) => updateBlock("live", id, patch)}
            onDelete={(id) => deleteBlock("live", id)}
            onMove={(from, to) => moveBlock("live", from, to)}
            onDuplicate={(b) => handleDuplicateBlock("live", b)}
            readOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="prep" className="space-y-4 pt-4">
          <BlocksEditor
            title="Prep blocks"
            description="Candidate-facing content before the session."
            blocks={prepBlocks}
            onAdd={() => addBlock("prep")}
            onUpdate={(id, patch) => updateBlock("prep", id, patch)}
            onDelete={(id) => deleteBlock("prep", id)}
            onMove={(from, to) => moveBlock("prep", from, to)}
            onDuplicate={(b) => handleDuplicateBlock("prep", b)}
            readOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="snapshotLabel">Label (optional)</Label>
                  <Input
                    id="snapshotLabel"
                    value={snapshotLabel}
                    onChange={(e) => setSnapshotLabel(e.target.value)}
                    placeholder="e.g. V1, after review, before session"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="snapshotNote">Note (optional)</Label>
                  <Input
                    id="snapshotNote"
                    value={snapshotNote}
                    onChange={(e) => setSnapshotNote(e.target.value)}
                    placeholder="Short note about this snapshot"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              <Button onClick={handleCreateSnapshot} disabled={isSnapshotCreating || isReadOnly}>
                {isSnapshotCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Create snapshot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Snapshots</span>
                <Button variant="outline" size="sm" onClick={loadSnapshots} disabled={isSnapshotsLoading}>
                  {isSnapshotsLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshots.length === 0 ? (
                <div className="text-sm text-muted-foreground">No snapshots yet.</div>
              ) : (
                <div className="space-y-3">
                  {snapshots.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {s.label ? s.label : "Snapshot"}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {new Date(s.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {s.note && <div className="text-sm text-muted-foreground">{s.note}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleRestoreSnapshot(s.id)} disabled={isReadOnly}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BlocksEditor({
  title,
  description,
  blocks,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
  readOnly,
}: {
  title: string
  description: string
  blocks: InterviewKitBlock[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<InterviewKitBlock>) => void
  onDelete: (id: string) => void
  onMove: (from: number, to: number) => void
  onDuplicate: (block: InterviewKitBlock) => void
  readOnly: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {!readOnly && (
            <Button onClick={onAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add block
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{description}</div>

        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No blocks yet. Add your first block.
          </div>
        ) : readOnly ? (
          <div className="space-y-3">
            {blocks.map((b) => (
              <div key={b.id} className="rounded-lg border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">{b.type}</div>
                <div className="whitespace-pre-wrap text-sm">{b.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((b, idx) => (
              <div key={b.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid flex-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={b.type} onValueChange={(v) => onUpdate(b.id, { type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOCK_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea value={b.content} onChange={(e) => onUpdate(b.id, { content: e.target.value })} rows={3} />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 md:flex-col">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onMove(idx, Math.max(0, idx - 1))}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onMove(idx, Math.min(blocks.length - 1, idx + 1))}
                      disabled={idx === blocks.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onDuplicate(b)} title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(b.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
