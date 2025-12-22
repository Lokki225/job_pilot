"use server"

import { requireAtLeastRole } from "@/lib/auth/rbac"
import { aiService } from "@/lib/services/ai"
import type { InterviewKitBlock } from "@/lib/actions/interview-kits.action"

const LIVE_ALLOWED_BLOCK_TYPES = ["heading", "agenda", "question", "rubric", "checklist", "notes", "custom"]
const PREP_ALLOWED_BLOCK_TYPES = ["heading", "agenda", "checklist", "notes", "custom"]

interface GenerateMasterPersonaInput {
  personaSummary: string
  tone?: string
  expertise?: string[]
  focusTopics?: string[]
  dos?: string[]
  donts?: string[]
  signatureQuestions?: string[]
  extraNotes?: string
  kitContext?: string | null
}

interface GenerateKitBlocksInput {
  kitTitle: string
  target: "LIVE" | "PREP"
  kitDescription?: string
  focusAreas?: string[]
  instructions?: string
  existingBlocks?: InterviewKitBlock[]
  questionCount?: number
}

interface GeneratedKitBlocksResult {
  summary: string
  blocks: InterviewKitBlock[]
}

function normalizeBlockType(rawType: unknown): string {
  if (typeof rawType !== "string" || !rawType.trim()) return "custom"
  return rawType.trim().toLowerCase()
}

function sanitizeBlocks(rawBlocks: any[], allowedTypes: string[]): InterviewKitBlock[] {
  if (!Array.isArray(rawBlocks)) return []
  return rawBlocks.reduce<InterviewKitBlock[]>((acc, block) => {
    if (!block || typeof block !== "object") return acc
    const normalized = normalizeBlockType(block.type)
    if (!allowedTypes.includes(normalized)) return acc
    const type = normalized
    const content = typeof block.content === "string" ? block.content.trim() : ""
    if (!content) return acc
    const meta = block.meta && typeof block.meta === "object" ? block.meta : undefined
    const id =
      typeof block.id === "string" && block.id.trim().length
        ? block.id
        : crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
    acc.push({ id, type, content, meta })
    return acc
  }, [])
}

export async function generateKitBlocksDraft(
  input: GenerateKitBlocksInput
): Promise<{ data: GeneratedKitBlocksResult | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")

    if (!aiService.isConfigured()) {
      return { data: null, error: "AI provider is not configured. Add an API key in environment variables." }
    }

    const title = input.kitTitle?.trim()
    if (!title) {
      return { data: null, error: "Kit title is required for generation." }
    }

    const instructions = input.instructions?.trim() || "Create thoughtful interviewer guidance that feels actionable."
    const questionCount = Math.min(20, Math.max(1, Number.isFinite(input.questionCount ?? 0) ? Number(input.questionCount) : 3))
    const focusList = (input.focusAreas || []).filter((f) => typeof f === "string" && f.trim().length > 0)
    const existingPreview = (input.existingBlocks || [])
      .slice(0, 6)
      .map((block) => `- ${block.type}: ${block.content.slice(0, 140)}`)
      .join("\n")

    const systemMessage = `You are JobPilot's AI kit architect. You help admins build structured interview kits made of modular content blocks.`
    const stageLabel = input.target === "LIVE" ? "LIVE SESSION" : "PREP"
    const stageGuidance =
      input.target === "LIVE"
        ? `Always include at least ${questionCount} QUESTION blocks. Keep all questions private to the interviewer until they are asked. Each question should be followed by at least one supporting block (rubric, checklist, or notes) that helps the interviewer evaluate the answer.`
        : `Do NOT include any question or rubric blocks. Focus on prep resources the candidate can see before the session (agendas, checklists, reference notes, mindset guidance).`
    const allowedTypes = input.target === "LIVE" ? LIVE_ALLOWED_BLOCK_TYPES : PREP_ALLOWED_BLOCK_TYPES
    const allowedTypeText = allowedTypes.join(" | ")

    const userPrompt = `Design ${stageLabel} blocks for the following kit.

      Kit Title: ${title}
      Kit Description: ${input.kitDescription || "N/A"}
      Focus Areas: ${focusList.length ? focusList.join(", ") : "General leadership, execution, and behavioral depth"}
      Question Count Target: ${questionCount}

      Admin Instructions:
      ${instructions}

      Existing Blocks (for context, avoid duplication):
      ${existingPreview || "None yet."}

      Return JSON with:
      {
        "summary": "Short description of recommended structure",
        "blocks": [
          { "type": "${allowedTypeText}", "content": "text body", "meta": { "questionType": "BEHAVIORAL" } }
        ]
      }

      ${stageGuidance}
      Keep content concise but specific.`

    const response = await aiService.chat({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.65,
      maxTokens: 1400,
      responseFormat: "json",
    })

    const payload = extractJsonPayload(response.content)
    if (!payload || !Array.isArray(payload.blocks)) {
      return { data: null, error: "AI response missing blocks. Please try again." }
    }

    const blocks = sanitizeBlocks(payload.blocks, allowedTypes)
    if (blocks.length === 0) {
      return { data: null, error: "AI returned no valid blocks. Try adjusting instructions." }
    }

    return {
      data: {
        summary: typeof payload.summary === "string" ? payload.summary.trim() : "Draft kit structure",
        blocks,
      },
      error: null,
    }
  } catch (err) {
    console.error("Error generating kit blocks:", err)
    return { data: null, error: "Failed to generate kit blocks. Please try again." }
  }
}

interface GeneratedPersonaResult {
  systemPrompt: string
  abilities: Record<string, any>
}

function extractJsonPayload(content: string): any | null {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch (err) {
    console.error("Failed to parse AI persona JSON:", err)
    return null
  }
}

export async function generateMasterPersonaConfig(
  input: GenerateMasterPersonaInput
): Promise<{ data: GeneratedPersonaResult | null; error: string | null }> {
  try {
    await requireAtLeastRole("ADMIN")

    if (!aiService.isConfigured()) {
      return { data: null, error: "AI provider is not configured. Add an API key in environment variables." }
    }

    const summary = input.personaSummary?.trim()
    if (!summary) {
      return { data: null, error: "Persona summary is required for generation." }
    }

    const tone = input.tone || "balanced"
    const expertise = (input.expertise || []).join(", ") || "general interview coaching across industries"
    const focuses = (input.focusTopics || []).join(", ") || "behavioral, execution depth, leadership"
    const kitContextLine = input.kitContext?.trim()
      ? `Reference Kit Context:\n${input.kitContext.trim()}`
      : ""

    const systemMessage = `You are JobPilot's AI persona architect. You help admins craft precise interviewer personas for an AI interview simulator. Always return clean JSON.`
    const userPrompt = `Create an interviewer persona blueprint for the training AI.

        Persona Summary:
        ${summary}

        Tone: ${tone}
        Expertise Areas: ${expertise}
        Focus Topics: ${focuses}
        Do rules: ${(input.dos || []).join("; ") || "Encourage, challenge, insist on specific examples"}
        Don't rules: ${(input.donts || []).join("; ") || "Don't be rude, don't leak proprietary data"}
        Signature Question Styles: ${(input.signatureQuestions || []).join("; ") || "Socratic probing, STAR follow-ups"}
        Additional Notes: ${input.extraNotes || "Keep it motivational yet demanding."}
        ${kitContextLine}

        Return JSON with:
        {
        "systemPrompt": "...persona instructions...",
        "personaSummary": "...",
        "tone": "...",
        "expertise": ["..."],
        "focusTopics": ["..."],
        "dos": ["..."],
        "donts": ["..."],
        "signatureQuestions": ["..."],
        "extraNotes": "...optional..."
    }`

    const response = await aiService.chat({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.55,
      maxTokens: 1100,
      responseFormat: "json",
    })

    const payload = extractJsonPayload(response.content)
    if (!payload || typeof payload.systemPrompt !== "string") {
      return { data: null, error: "AI response missing systemPrompt. Please try again." }
    }

    const abilities = {
      personaSummary: payload.personaSummary || summary,
      tone: payload.tone || tone,
      expertise: Array.isArray(payload.expertise) ? payload.expertise : input.expertise || [],
      focusTopics: Array.isArray(payload.focusTopics) ? payload.focusTopics : input.focusTopics || [],
      dos: Array.isArray(payload.dos) ? payload.dos : input.dos || [],
      donts: Array.isArray(payload.donts) ? payload.donts : input.donts || [],
      signatureQuestions: Array.isArray(payload.signatureQuestions)
        ? payload.signatureQuestions
        : input.signatureQuestions || [],
      extraNotes: payload.extraNotes || input.extraNotes || null,
    }

    return {
      data: {
        systemPrompt: payload.systemPrompt.trim(),
        abilities,
      },
      error: null,
    }
  } catch (err) {
    console.error("Error generating master persona:", err)
    return { data: null, error: "Failed to generate persona. Please try again." }
  }
}
