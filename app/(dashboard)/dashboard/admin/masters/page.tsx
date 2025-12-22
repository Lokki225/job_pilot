"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Save, RefreshCw, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { getMyAccess } from "@/lib/actions/rbac.action"
import {
  deleteInterviewMaster,
  listInterviewMastersForAdmin,
  saveInterviewMaster,
  type AdminInterviewMaster,
} from "@/lib/actions/admin-interview-masters.action"
import { generateMasterPersonaConfig } from "@/lib/actions/admin-ai-generation.action"

interface PersonaAbilities {
  personaSummary: string
  tone: string
  expertise: string[]
  focusTopics: string[]
  dos: string[]
  donts: string[]
  signatureQuestions: string[]
  extraNotes: string | null
}

const defaultAbilities: PersonaAbilities = {
  personaSummary: "",
  tone: "balanced",
  expertise: [],
  focusTopics: [],
  dos: [],
  donts: [],
  signatureQuestions: [],
  extraNotes: null,
}

function arrayToMultiline(value?: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).join("\n")
  }
  if (typeof value === "string") return value
  return ""
}

function multilineToArray(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[*-]\s*/, "").trim())
    .filter((line) => line.length > 0)
}

function numberToInput(value: unknown, fallback: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return value.toString()
  return fallback.toString()
}

function normalizeAbilities(raw: any): PersonaAbilities {
  if (!raw || typeof raw !== "object") return { ...defaultAbilities }
  return {
    personaSummary: typeof raw.personaSummary === "string" ? raw.personaSummary : "",
    tone: typeof raw.tone === "string" && raw.tone.trim() ? raw.tone : "balanced",
    expertise: Array.isArray(raw.expertise) ? raw.expertise.filter((v: any) => typeof v === "string") : [],
    focusTopics: Array.isArray(raw.focusTopics) ? raw.focusTopics.filter((v: any) => typeof v === "string") : [],
    dos: Array.isArray(raw.dos) ? raw.dos.filter((v: any) => typeof v === "string") : [],
    donts: Array.isArray(raw.donts) ? raw.donts.filter((v: any) => typeof v === "string") : [],
    signatureQuestions: Array.isArray(raw.signatureQuestions)
      ? raw.signatureQuestions.filter((v: any) => typeof v === "string")
      : [],
    extraNotes: typeof raw.extraNotes === "string" ? raw.extraNotes : null,
  }
}

function buildAbilitiesObject(form: MasterFormState): PersonaAbilities {
  return {
    personaSummary: form.personaSummary.trim(),
    tone: form.tone.trim() || "balanced",
    expertise: multilineToArray(form.expertise),
    focusTopics: multilineToArray(form.focusTopics),
    dos: multilineToArray(form.dos),
    donts: multilineToArray(form.donts),
    signatureQuestions: multilineToArray(form.signatureQuestions),
    extraNotes: form.extraNotes.trim() ? form.extraNotes.trim() : null,
  }
}

function parseNumberInput(value: string, fallback: number, min: number, max: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, num))
}

interface MasterFormState {
  id?: string
  displayName: string
  slug: string
  tagline: string
  avatarUrl: string
  systemPrompt: string
  personaSummary: string
  tone: string
  expertise: string
  focusTopics: string
  dos: string
  donts: string
  signatureQuestions: string
  extraNotes: string
  abilitiesText: string
  kitContextHint: string
  voiceProvider: string
  voiceModel: string
  voiceRate: string
  voicePitch: string
  voiceVolume: string
  isActive: boolean
  isPublic: boolean
}

const emptyForm = (): MasterFormState => ({
  id: undefined,
  displayName: "",
  slug: "",
  tagline: "",
  avatarUrl: "",
  systemPrompt: "",
  personaSummary: "",
  tone: "balanced",
  expertise: "",
  focusTopics: "",
  dos: "",
  donts: "",
  signatureQuestions: "",
  extraNotes: "",
  abilitiesText: "{\n  \"personaSummary\": \"\",\n  \"tone\": \"balanced\",\n  \"expertise\": [],\n  \"focusTopics\": [],\n  \"dos\": [],\n  \"donts\": [],\n  \"signatureQuestions\": [],\n  \"extraNotes\": null\n}",
  kitContextHint: "",
  voiceProvider: "BROWSER",
  voiceModel: "",
  voiceRate: "1",
  voicePitch: "1",
  voiceVolume: "1",
  isActive: true,
  isPublic: true,
})

export default function AdminInterviewMastersPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [masters, setMasters] = useState<AdminInterviewMaster[]>([])
  const [form, setForm] = useState<MasterFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const selectedMaster = useMemo(() => masters.find((m) => m.id === form.id), [masters, form.id])

  async function loadAll() {
    setIsLoading(true)
    try {
      const [accessRes, mastersRes] = await Promise.all([getMyAccess(), listInterviewMastersForAdmin()])

      const admin = Boolean(accessRes.data?.isAdmin)
      setIsAdmin(admin)
      if (!admin) {
        setMasters([])
        return
      }

      if (mastersRes.error) {
        toast({ title: "Error", description: mastersRes.error, variant: "destructive" })
      } else if (mastersRes.data) {
        setMasters(mastersRes.data)
      }

    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function handleEdit(master?: AdminInterviewMaster) {
    if (!master) {
      setForm(emptyForm())
      return
    }

    const abilities = normalizeAbilities(master.abilitiesJson)
    const voiceSettings = (master.voiceSettingsJson || {}) as Record<string, unknown>
    setForm({
      id: master.id,
      displayName: master.displayName,
      slug: master.slug,
      tagline: master.tagline || "",
      avatarUrl: master.avatarUrl || "",
      systemPrompt: master.systemPrompt,
      personaSummary: abilities.personaSummary,
      tone: abilities.tone,
      expertise: arrayToMultiline(abilities.expertise),
      focusTopics: arrayToMultiline(abilities.focusTopics),
      dos: arrayToMultiline(abilities.dos),
      donts: arrayToMultiline(abilities.donts),
      signatureQuestions: arrayToMultiline(abilities.signatureQuestions),
      extraNotes: abilities.extraNotes || "",
      abilitiesText: JSON.stringify(master.abilitiesJson ?? abilities, null, 2),
      kitContextHint: "",
      voiceProvider: master.voiceProvider || "BROWSER",
      voiceModel: master.voiceModel || "",
      voiceRate: numberToInput(voiceSettings.rate, 1),
      voicePitch: numberToInput(voiceSettings.pitch, 1),
      voiceVolume: numberToInput(voiceSettings.volume, 1),
      isActive: master.isActive,
      isPublic: master.isPublic,
    })
  }

  async function handleSave() {
    if (!form.displayName.trim()) {
      toast({ title: "Display name required", variant: "destructive" })
      return
    }
    if (!form.systemPrompt.trim()) {
      toast({ title: "System prompt required", variant: "destructive" })
      return
    }
    const abilitiesPayload = buildAbilitiesObject(form)
    setSaving(true)
    try {
      const res = await saveInterviewMaster({
        id: form.id,
        displayName: form.displayName.trim(),
        slug: form.slug.trim() || form.displayName.trim(),
        tagline: form.tagline.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
        systemPrompt: form.systemPrompt,
        abilitiesJson: abilitiesPayload,
        voiceProvider: form.voiceProvider || "BROWSER",
        voiceModel: form.voiceModel.trim() || null,
        voiceSettings: {
          rate: parseNumberInput(form.voiceRate, 1, 0.5, 1.5),
          pitch: parseNumberInput(form.voicePitch, 1, 0.5, 1.5),
          volume: parseNumberInput(form.voiceVolume, 1, 0, 1),
        },
        isActive: form.isActive,
        isPublic: form.isPublic,
      })
      if (res.error) {
        toast({ title: "Error saving master", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Saved", description: `${res.data?.displayName} updated` })
      setForm((prev) => ({
        ...prev,
        abilitiesText: JSON.stringify(abilitiesPayload, null, 2),
        voiceProvider: res.data?.voiceProvider || prev.voiceProvider,
        voiceModel: res.data?.voiceModel || prev.voiceModel,
        voiceRate: numberToInput(res.data?.voiceSettingsJson?.rate, 1),
        voicePitch: numberToInput(res.data?.voiceSettingsJson?.pitch, 1),
        voiceVolume: numberToInput(res.data?.voiceSettingsJson?.volume, 1),
      }))
      await loadAll()
      handleEdit()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this interview master? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await deleteInterviewMaster(id)
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Deleted", description: "Interview master removed" })
      await loadAll()
      if (form.id === id) handleEdit()
    } finally {
      setDeletingId(null)
    }
  }

  function syncJsonFromFields() {
    const abilitiesPayload = buildAbilitiesObject(form)
    setForm((prev) => ({
      ...prev,
      abilitiesText: JSON.stringify(abilitiesPayload, null, 2),
    }))
    toast({ title: "Abilities JSON updated" })
  }

  function syncFieldsFromJson() {
    try {
      const parsed = JSON.parse(form.abilitiesText)
      const abilities = normalizeAbilities(parsed)
      setForm((prev) => ({
        ...prev,
        personaSummary: abilities.personaSummary,
        tone: abilities.tone,
        expertise: arrayToMultiline(abilities.expertise),
        focusTopics: arrayToMultiline(abilities.focusTopics),
        dos: arrayToMultiline(abilities.dos),
        donts: arrayToMultiline(abilities.donts),
        signatureQuestions: arrayToMultiline(abilities.signatureQuestions),
        extraNotes: abilities.extraNotes || "",
      }))
      toast({ title: "Fields synced from JSON" })
    } catch (err) {
      console.error("Failed to parse abilities JSON", err)
      toast({ title: "Invalid JSON", description: "Fix the JSON before syncing.", variant: "destructive" })
    }
  }

  async function handleGeneratePersona() {
    if (!form.personaSummary.trim()) {
      toast({ title: "Persona summary required", description: "Add a summary before generating.", variant: "destructive" })
      return
    }
    setGenerating(true)
    try {
      const res = await generateMasterPersonaConfig({
        personaSummary: form.personaSummary,
        tone: form.tone,
        expertise: multilineToArray(form.expertise),
        focusTopics: multilineToArray(form.focusTopics),
        dos: multilineToArray(form.dos),
        donts: multilineToArray(form.donts),
        signatureQuestions: multilineToArray(form.signatureQuestions),
        extraNotes: form.extraNotes || undefined,
        kitContext: form.kitContextHint || null,
      })
      if (res.error || !res.data) {
        toast({ title: "Generation failed", description: res.error ?? "Unknown error", variant: "destructive" })
        return
      }
      const result = res.data
      const abilities = normalizeAbilities(result.abilities)
      setForm((prev) => ({
        ...prev,
        systemPrompt: result.systemPrompt,
        personaSummary: abilities.personaSummary,
        tone: abilities.tone,
        expertise: arrayToMultiline(abilities.expertise),
        focusTopics: arrayToMultiline(abilities.focusTopics),
        dos: arrayToMultiline(abilities.dos),
        donts: arrayToMultiline(abilities.donts),
        signatureQuestions: arrayToMultiline(abilities.signatureQuestions),
        extraNotes: abilities.extraNotes || "",
        abilitiesText: JSON.stringify(result.abilities, null, 2),
      }))
      toast({ title: "Persona generated" })
    } finally {
      setGenerating(false)
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
            <h1 className="text-2xl font-bold">Interview Masters</h1>
            <p className="text-sm text-muted-foreground">Configure AI personas used in Training Room.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => handleEdit()}>
            <Plus className="mr-2 h-4 w-4" />
            New Master
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Existing Masters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {masters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No masters yet. Create one to get started.</p>
            ) : (
              masters.map((master) => (
                <div
                  key={master.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="text-left text-base font-semibold text-primary hover:underline"
                        onClick={() => handleEdit(master)}
                      >
                        {master.displayName}
                      </button>
                      {master.isActive ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                      {!master.isPublic && <Badge variant="outline">Private</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{master.tagline || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(master)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(master.id)}
                      disabled={deletingId === master.id}
                    >
                      {deletingId === master.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{form.id ? "Edit Master" : "Create Master"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.displayName} onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} placeholder="autofilled-from-name" />
              <p className="text-xs text-muted-foreground">Used internally to identify this persona.</p>
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => setForm((s) => ({ ...s, tagline: e.target.value }))} placeholder="ex: Ex-Google L6 Manager" />
            </div>

            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input value={form.avatarUrl} onChange={(e) => setForm((s) => ({ ...s, avatarUrl: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Label className="text-base font-semibold">Voice & Speech</Label>
                  <p className="text-xs text-muted-foreground">Choose the text-to-speech provider and fine-tune the delivery.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Voice Provider</Label>
                  <Select value={form.voiceProvider} onValueChange={(value) => setForm((s) => ({ ...s, voiceProvider: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BROWSER">Browser Default</SelectItem>
                      <SelectItem value="ELEVENLABS">ElevenLabs</SelectItem>
                      <SelectItem value="AZURE">Azure Neural</SelectItem>
                      <SelectItem value="GOOGLE">Google WaveNet</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Voice Model / ID</Label>
                  <Input
                    value={form.voiceModel}
                    onChange={(e) => setForm((s) => ({ ...s, voiceModel: e.target.value }))}
                    placeholder="e.g. Rachel v2"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Rate (0.5 - 1.5)</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={form.voiceRate}
                    onChange={(e) => setForm((s) => ({ ...s, voiceRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pitch (0.5 - 1.5)</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={form.voicePitch}
                    onChange={(e) => setForm((s) => ({ ...s, voicePitch: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (0 - 1)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.voiceVolume}
                    onChange={(e) => setForm((s) => ({ ...s, voiceVolume: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Label className="text-base font-semibold">Persona Blueprint</Label>
                  <p className="text-xs text-muted-foreground">
                    Describe tone, expertise, rules, and signature behaviors before generating prompts.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGeneratePersona} disabled={generating}>
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Persona
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Persona Summary</Label>
                <Textarea
                  value={form.personaSummary}
                  onChange={(e) => setForm((s) => ({ ...s, personaSummary: e.target.value }))}
                  rows={3}
                  placeholder="Ex: Principal FAANG PM known for crisp prioritization and behavioral rigor."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expertise Areas (one per line)</Label>
                  <Textarea
                    value={form.expertise}
                    onChange={(e) => setForm((s) => ({ ...s, expertise: e.target.value }))}
                    rows={3}
                    placeholder="Product strategy\nGrowth experimentation\nMentoring"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Focus Topics (one per line)</Label>
                  <Textarea
                    value={form.focusTopics}
                    onChange={(e) => setForm((s) => ({ ...s, focusTopics: e.target.value }))}
                    rows={3}
                    placeholder="Behavioral depth\nLeadership principles\nExecution metrics"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Do / Rules (one per line)</Label>
                  <Textarea
                    value={form.dos}
                    onChange={(e) => setForm((s) => ({ ...s, dos: e.target.value }))}
                    rows={3}
                    placeholder="Push for STAR details\nAsk for measurable outcomes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Don't / Guardrails (one per line)</Label>
                  <Textarea
                    value={form.donts}
                    onChange={(e) => setForm((s) => ({ ...s, donts: e.target.value }))}
                    rows={3}
                    placeholder="Avoid giving answers\nNever break confidentiality"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Signature Question Styles</Label>
                  <Textarea
                    value={form.signatureQuestions}
                    onChange={(e) => setForm((s) => ({ ...s, signatureQuestions: e.target.value }))}
                    rows={3}
                    placeholder="Socratic follow-ups\nTrade-off challenges"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extra Notes</Label>
                  <Textarea
                    value={form.extraNotes}
                    onChange={(e) => setForm((s) => ({ ...s, extraNotes: e.target.value }))}
                    rows={3}
                    placeholder="Ex: Prefers referencing Amazon LPs, avoids humor mid-interview."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((s) => ({ ...s, systemPrompt: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Abilities JSON</Label>
              <Textarea
                value={form.abilitiesText}
                onChange={(e) => setForm((s) => ({ ...s, abilitiesText: e.target.value }))}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                We store persona metadata alongside prompts for analytics and kit prep. Keep keys predictable.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={syncJsonFromFields}>
                  Sync JSON from Fields
                </Button>
                <Button variant="outline" size="sm" onClick={syncFieldsFromJson}>
                  Load Fields from JSON
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive masters cannot be selected by users.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((s) => ({ ...s, isActive: checked }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Public</Label>
                <p className="text-xs text-muted-foreground">Non-public masters are hidden from picker unless linked to a kit.</p>
              </div>
              <Switch checked={form.isPublic} onCheckedChange={(checked) => setForm((s) => ({ ...s, isPublic: checked }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedMaster && (
                <Button variant="outline" onClick={() => handleEdit()}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Master
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
