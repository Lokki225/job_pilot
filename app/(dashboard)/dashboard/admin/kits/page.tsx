"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Loader2, Plus, RefreshCw, Save, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { getMyAccess } from "@/lib/actions/rbac.action"
import {
  createInterviewKitAdmin,
  deleteInterviewKitAdmin,
  getInterviewKitDetailForAdmin,
  listInterviewKitsForAdmin,
  updateInterviewKitAdmin,
  type AdminInterviewKitDetail,
  type AdminInterviewKitRecord,
} from "@/lib/actions/admin-interview-kits.action"
import { generateKitBlocksDraft } from "@/lib/actions/admin-ai-generation.action"
import type { InterviewKitBlock } from "@/lib/actions/interview-kits.action"

type KitForm = {
  id: string
  title: string
  description: string
  visibility: "PRIVATE" | "PUBLIC"
  isArchived: boolean
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
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev }
      blocks.forEach((block) => {
        if (next[block.id] === undefined) {
          next[block.id] = true
        }
      })
      return next
    })
  }, [blocks])

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCollapsed((prev) => !prev)}>
              {collapsed ? "Expand" : "Collapse"}
            </Button>
            {!readOnly && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add block
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {collapsed ? (
          <p className="text-sm text-muted-foreground">Collapsed — expand to edit blocks.</p>
        ) : blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No blocks yet. Use the AI builder or add manually.
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <div key={block.id} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm font-medium"
                  onClick={() => toggle(block.id)}
                >
                  <div className="flex flex-col">
                    <span className="uppercase text-xs text-muted-foreground">{block.type}</span>
                    <span className="line-clamp-1 text-sm">
                      {block.content ? block.content : "Empty content"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{expanded[block.id] === false ? "Show" : "Hide"}</span>
                </button>
                {expanded[block.id] !== false && (
                  <div className="flex flex-col gap-4 p-3 md:flex-row md:items-start md:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={block.type} onValueChange={(v) => onUpdate(block.id, { type: v })} disabled={readOnly}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOCK_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                          value={block.content}
                          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                          rows={4}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-2">
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
                        <Button variant="outline" size="icon" onClick={() => onDuplicate(block)} title="Duplicate">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => onDelete(block.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const emptyForm = (): KitForm => ({
  id: "",
  title: "",
  description: "",
  visibility: "PRIVATE",
  isArchived: false,
})

const BLOCK_TYPES = [
  { value: "heading", label: "Heading" },
  { value: "agenda", label: "Agenda" },
  { value: "question", label: "Question" },
  { value: "rubric", label: "Rubric" },
  { value: "checklist", label: "Checklist" },
  { value: "notes", label: "Notes" },
  { value: "custom", label: "Custom" },
]

function textToArray(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function makeBlockId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function AdminInterviewKitsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [kits, setKits] = useState<AdminInterviewKitRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [form, setForm] = useState<KitForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<AdminInterviewKitDetail | null>(null)
  const [liveBlocks, setLiveBlocks] = useState<InterviewKitBlock[]>([])
  const [prepBlocks, setPrepBlocks] = useState<InterviewKitBlock[]>([])
  const [aiFocusAreas, setAiFocusAreas] = useState("")
  const [aiNotes, setAiNotes] = useState("")
  const [aiQuestionCount, setAiQuestionCount] = useState(3)
  const [aiGenerating, setAiGenerating] = useState<"LIVE" | "PREP" | null>(null)
  const [deleting, setDeleting] = useState(false)

  const hasUnsavedChanges = useMemo(() => {
    if (!form.id) {
      return Boolean(
        form.title.trim() ||
          form.description.trim() ||
          liveBlocks.length > 0 ||
          prepBlocks.length > 0
      )
    }
    if (!detail) return false
    return (
      form.title.trim() !== detail.title ||
      (form.description || "").trim() !== (detail.description || "") ||
      form.visibility !== detail.visibility ||
      form.isArchived !== detail.isArchived ||
      JSON.stringify(liveBlocks) !== JSON.stringify(detail.blocksJson || []) ||
      JSON.stringify(prepBlocks) !== JSON.stringify(detail.prepBlocksJson || [])
    )
  }, [detail, form, liveBlocks, prepBlocks])

  async function load() {
    setIsLoading(true)
    try {
      const [accessRes, kitsRes] = await Promise.all([getMyAccess(), listInterviewKitsForAdmin()])
      const admin = Boolean(accessRes.data?.isAdmin)
      setIsAdmin(admin)
      if (!admin) {
        setKits([])
        return
      }
      if (kitsRes.error) {
        toast({ title: "Error", description: kitsRes.error, variant: "destructive" })
      } else if (kitsRes.data) {
        setKits(kitsRes.data)
        if (kitsRes.data.length > 0) {
          const current = kitsRes.data.find((k) => k.id === selectedId)
          if (!selectedId || !current) {
            handleSelect(kitsRes.data[0])
          }
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDetail(kitId: string) {
    setDetailLoading(true)
    try {
      const res = await getInterviewKitDetailForAdmin(kitId)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to load kit detail", variant: "destructive" })
        return
      }
      setDetail(res.data)
      setLiveBlocks(res.data.blocksJson || [])
      setPrepBlocks(res.data.prepBlocksJson || [])
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSelect(kit: AdminInterviewKitRecord) {
    setSelectedId(kit.id)
    setForm({
      id: kit.id,
      title: kit.title,
      description: kit.description || "",
      visibility: kit.visibility,
      isArchived: kit.isArchived,
    })
    loadDetail(kit.id)
  }

  function resetFormForNew() {
    setSelectedId("")
    setForm(emptyForm())
    setDetail(null)
    setLiveBlocks([])
    setPrepBlocks([])
    setAiFocusAreas("")
    setAiNotes("")
    setAiQuestionCount(3)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        visibility: form.visibility,
        isArchived: form.isArchived,
        blocksJson: liveBlocks,
        prepBlocksJson: prepBlocks,
      }
      const res = form.id
        ? await updateInterviewKitAdmin(form.id, payload)
        : await createInterviewKitAdmin(payload)
      if (res.error || !res.data) {
        toast({ title: "Error", description: res.error || "Failed to save kit", variant: "destructive" })
        return
      }
      toast({ title: form.id ? "Saved" : "Kit created", description: `${res.data.title} ${form.id ? "updated" : "created"}` })
      setDetail(res.data)
      setLiveBlocks(res.data.blocksJson || [])
      setPrepBlocks(res.data.prepBlocksJson || [])
      await load()
      if (res.data.id) {
        setSelectedId(res.data.id)
        setForm({
          id: res.data.id,
          title: res.data.title,
          description: res.data.description || "",
          visibility: res.data.visibility,
          isArchived: res.data.isArchived,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id) return
    if (!confirm("Delete this kit? This cannot be undone.")) return
    setDeleting(true)
    try {
      setSelectedId("")
      resetFormForNew()
      const res = await deleteInterviewKitAdmin(form.id)
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Deleted", description: "Interview kit removed" })
      await load()
    } finally {
      setDeleting(false)
    }
  }

  function addBlock(target: "LIVE" | "PREP") {
    const block: InterviewKitBlock = { id: makeBlockId(), type: "question", content: "" }
    if (target === "LIVE") setLiveBlocks((prev) => [...prev, block])
    else setPrepBlocks((prev) => [...prev, block])
  }

  function updateBlock(target: "LIVE" | "PREP", blockId: string, patch: Partial<InterviewKitBlock>) {
    const setter = target === "LIVE" ? setLiveBlocks : setPrepBlocks
    setter((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)))
  }

  function deleteBlock(target: "LIVE" | "PREP", blockId: string) {
    const setter = target === "LIVE" ? setLiveBlocks : setPrepBlocks
    setter((prev) => prev.filter((b) => b.id !== blockId))
  }

  function moveBlock(target: "LIVE" | "PREP", from: number, to: number) {
    const setter = target === "LIVE" ? setLiveBlocks : setPrepBlocks
    setter((prev) => {
      if (from === to) return prev
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  function duplicateBlock(target: "LIVE" | "PREP", block: InterviewKitBlock) {
    const copy: InterviewKitBlock = { ...block, id: makeBlockId() }
    if (target === "LIVE") setLiveBlocks((prev) => [...prev, copy])
    else setPrepBlocks((prev) => [...prev, copy])
  }

  async function handleGenerateBlocks(target: "LIVE" | "PREP") {
    if (!form.title.trim()) {
      toast({ title: "Title required", description: "Add a kit title before using AI helper.", variant: "destructive" })
      return
    }
    setAiGenerating(target)
    try {
      const res = await generateKitBlocksDraft({
        kitTitle: form.title,
        kitDescription: form.description,
        target,
        focusAreas: textToArray(aiFocusAreas),
        instructions: aiNotes,
        questionCount: aiQuestionCount,
        existingBlocks: target === "LIVE" ? liveBlocks : prepBlocks,
      })
      if (res.error || !res.data) {
        toast({ title: "Generation failed", description: res.error ?? "Unknown error", variant: "destructive" })
        return
      }
      const result = res.data
      if (target === "LIVE") {
        setLiveBlocks((prev) => [...prev, ...result.blocks])
      } else {
        setPrepBlocks((prev) => [...prev, ...result.blocks])
      }
      toast({ title: "Blocks drafted", description: result.summary })
    } finally {
      setAiGenerating(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You do not have admin access.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Interview Kits</h1>
            <p className="text-sm text-muted-foreground">Manage official kits that Masters can reference.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && <Badge variant="outline">Unsaved changes</Badge>}
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Kits</CardTitle>
              <p className="text-sm text-muted-foreground">Pick an existing kit or start a new one.</p>
            </div>
            <Button size="sm" onClick={resetFormForNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Kit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {kits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No kits found.</p>
            ) : (
              kits.map((kit) => {
                const active = selectedId === kit.id
                return (
                  <button
                    key={kit.id}
                    onClick={() => handleSelect(kit)}
                    className={`w-full rounded-lg border p-4 text-left transition hover:border-primary ${
                      active ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{kit.title}</span>
                      <Badge variant={kit.visibility === "PUBLIC" ? "default" : "secondary"}>{kit.visibility}</Badge>
                      {kit.isArchived && <Badge variant="destructive">Archived</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{kit.description || "—"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Updated: {new Date(kit.updatedAt).toLocaleString()}</p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Edit Kit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.id ? (
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm((s) => ({ ...s, visibility: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Archived</Label>
                    <p className="text-xs text-muted-foreground">Archived kits cannot be picked by users.</p>
                  </div>
                  <Switch checked={form.isArchived} onCheckedChange={(checked) => setForm((s) => ({ ...s, isArchived: checked }))} />
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Label className="text-base font-semibold">AI Builder</Label>
                      <p className="text-xs text-muted-foreground">
                        Draft new blocks for this kit using our AI assistant. Add focus areas or notes to steer the output.
                      </p>
                    </div>
                    {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Focus Areas</Label>
                      <Textarea
                        placeholder="Behavioral depth, execution rigor, product sense"
                        value={aiFocusAreas}
                        onChange={(e) => setAiFocusAreas(e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">Comma or newline separated. Example: behavioral, strategy, systems.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Instructions</Label>
                      <Textarea
                        placeholder="Emphasize tight feedback rubrics and quant expectations."
                        value={aiNotes}
                        onChange={(e) => setAiNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Question Count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={aiQuestionCount}
                        onChange={(e) => {
                          const next = Number(e.target.value)
                          if (Number.isNaN(next)) {
                            setAiQuestionCount(1)
                          } else {
                            setAiQuestionCount(Math.min(20, Math.max(1, Math.round(next))))
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">AI will target this many question prompts, each with supporting guidance.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleGenerateBlocks("LIVE")} disabled={aiGenerating !== null}>
                      {aiGenerating === "LIVE" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Drafting Live Blocks...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Draft Live Blocks
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateBlocks("PREP")} disabled={aiGenerating !== null}>
                      {aiGenerating === "PREP" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Draft Prep Blocks...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Draft Prep Blocks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <BlocksEditor
                    title="Live Session Blocks"
                    description="These blocks power the Training Room experience (questions, rubrics, agendas)."
                    blocks={liveBlocks}
                    onAdd={() => addBlock("LIVE")}
                    onUpdate={(id, patch) => updateBlock("LIVE", id, patch)}
                    onDelete={(id) => deleteBlock("LIVE", id)}
                    onMove={(from, to) => moveBlock("LIVE", from, to)}
                    onDuplicate={(block) => duplicateBlock("LIVE", block)}
                    readOnly={detailLoading}
                  />
                  <BlocksEditor
                    title="Prep Materials Blocks"
                    description="Optional prep content presented before sessions (checklists, notes, practice prompts)."
                    blocks={prepBlocks}
                    onAdd={() => addBlock("PREP")}
                    onUpdate={(id, patch) => updateBlock("PREP", id, patch)}
                    onDelete={(id) => deleteBlock("PREP", id)}
                    onMove={(from, to) => moveBlock("PREP", from, to)}
                    onDuplicate={(block) => duplicateBlock("PREP", block)}
                    readOnly={detailLoading}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {form.id && (
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={saving || detailLoading || !hasUnsavedChanges}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {form.id ? "Save Changes" : "Create Kit"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Select a kit from the left, or click “New Kit” to start drafting one.</p>
                <Button onClick={resetFormForNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Kit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
