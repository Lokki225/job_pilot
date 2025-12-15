"use server"

import { z } from "zod"
import { adminSupabase, createClient } from "@/lib/supabase/server"
import { ApplicationStatus, JobPlatform } from "@/prisma/generated/client/enums"

const ExportFormatSchema = z.enum(["json", "csv"])

const JobApplicationImportSchema = z
  .object({
    jobTitle: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    location: z.string().optional().nullable(),
    jobType: z.string().optional().nullable(),
    salary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    requirements: z.string().optional().nullable(),
    jobPostUrl: z.string().optional().nullable(),

    status: z.string().optional().nullable(),
    appliedDate: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),

    externalJobId: z.string().optional().nullable(),
    externalSource: z.string().optional().nullable(),
    externalData: z.any().optional().nullable(),

    contactName: z.string().optional().nullable(),
    contactEmail: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),

    interviewDate: z.string().optional().nullable(),
    interviewNotes: z.string().optional().nullable(),

    offerAmount: z.string().optional().nullable(),
    offerDeadline: z.string().optional().nullable(),

    isPasted: z.union([z.boolean(), z.string()]).optional().nullable(),
    isFavorite: z.union([z.boolean(), z.string()]).optional().nullable(),
    reminderDate: z.string().optional().nullable(),
  })
  .strict()

const ImportPayloadSchema = z
  .object({
    format: ExportFormatSchema,
    content: z.string().min(1),
  })
  .strict()

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const v = value.trim().toLowerCase()
    return v === "1" || v === "true" || v === "yes"
  }
  return false
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return d
}

function toStatus(value: unknown): ApplicationStatus {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : ""
  const allowed = Object.values(ApplicationStatus) as string[]
  if (allowed.includes(raw)) return raw as ApplicationStatus
  return ApplicationStatus.WISHLIST
}

function toJobPlatform(value: unknown): JobPlatform | null {
  if (!value) return null
  const raw = typeof value === "string" ? value.trim().toUpperCase() : ""
  const allowed = Object.values(JobPlatform) as string[]
  if (allowed.includes(raw)) return raw as JobPlatform
  return null
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1]
        if (next === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }

    if (ch === ',') {
      out.push(current)
      current = ""
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    current += ch
  }

  out.push(current)
  return out
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []

  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? ""
    }
    rows.push(row)
  }

  return rows
}

const EXPORT_COLUMNS = [
  "jobTitle",
  "company",
  "location",
  "jobType",
  "salary",
  "jobPostUrl",
  "status",
  "appliedDate",
  "source",
  "notes",
  "externalJobId",
  "externalSource",
  "contactName",
  "contactEmail",
  "contactPhone",
  "interviewDate",
  "interviewNotes",
  "offerAmount",
  "offerDeadline",
  "isPasted",
  "isFavorite",
  "reminderDate",
  "createdAt",
  "updatedAt",
] as const

export async function exportJobApplications(format: z.infer<typeof ExportFormatSchema>): Promise<{
  data:
    | {
        filename: string
        mime: string
        content: string
      }
    | null
  error: string | null
}> {
  try {
    const parsed = ExportFormatSchema.safeParse(format)
    if (!parsed.success) return { data: null, error: "Invalid format" }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const { data: rows, error } = await adminSupabase
      .from("job_applications")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    if (error) return { data: null, error: error.message }

    const dateTag = new Date().toISOString().slice(0, 10)

    if (parsed.data === "json") {
      const content = JSON.stringify({ applications: rows || [] }, null, 2)
      return {
        data: {
          filename: `job-applications-${dateTag}.json`,
          mime: "application/json",
          content,
        },
        error: null,
      }
    }

    const header = EXPORT_COLUMNS.join(",")
    const lines = (rows || []).map((r: any) => {
      const values = EXPORT_COLUMNS.map((col) => escapeCsv(r[col]))
      return values.join(",")
    })

    return {
      data: {
        filename: `job-applications-${dateTag}.csv`,
        mime: "text/csv",
        content: [header, ...lines].join("\n"),
      },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error exporting job applications:", err)
    return { data: null, error: "Failed to export applications" }
  }
}

export async function importJobApplications(payload: z.infer<typeof ImportPayloadSchema>): Promise<{
  data: { inserted: number } | null
  error: string | null
}> {
  try {
    const parsed = ImportPayloadSchema.safeParse(payload)
    if (!parsed.success) return { data: null, error: "Invalid payload" }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    let rawRows: any[] = []

    if (parsed.data.format === "json") {
      const obj = JSON.parse(parsed.data.content)
      rawRows = Array.isArray(obj) ? obj : Array.isArray(obj?.applications) ? obj.applications : []
    } else {
      rawRows = parseCsv(parsed.data.content)
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { data: null, error: "No rows to import" }
    }

    if (rawRows.length > 1000) {
      return { data: null, error: "Too many rows (max 1000)" }
    }

    const validated: any[] = []

    for (const row of rawRows) {
      const candidate = {
        jobTitle: row.jobTitle ?? row["jobTitle"],
        company: row.company ?? row["company"],
        location: row.location ?? row["location"],
        jobType: row.jobType ?? row["jobType"],
        salary: row.salary ?? row["salary"],
        description: row.description ?? row["description"],
        requirements: row.requirements ?? row["requirements"],
        jobPostUrl: row.jobPostUrl ?? row["jobPostUrl"],

        status: row.status ?? row["status"],
        appliedDate: row.appliedDate ?? row["appliedDate"],
        source: row.source ?? row["source"],
        notes: row.notes ?? row["notes"],

        externalJobId: row.externalJobId ?? row["externalJobId"],
        externalSource: row.externalSource ?? row["externalSource"],
        externalData: row.externalData ?? row["externalData"],

        contactName: row.contactName ?? row["contactName"],
        contactEmail: row.contactEmail ?? row["contactEmail"],
        contactPhone: row.contactPhone ?? row["contactPhone"],

        interviewDate: row.interviewDate ?? row["interviewDate"],
        interviewNotes: row.interviewNotes ?? row["interviewNotes"],

        offerAmount: row.offerAmount ?? row["offerAmount"],
        offerDeadline: row.offerDeadline ?? row["offerDeadline"],

        isPasted: row.isPasted ?? row["isPasted"],
        isFavorite: row.isFavorite ?? row["isFavorite"],
        reminderDate: row.reminderDate ?? row["reminderDate"],
      }

      const v = JobApplicationImportSchema.safeParse(candidate)
      if (!v.success) {
        return { data: null, error: "Invalid row data" }
      }

      validated.push(v.data)
    }

    const insertData = validated.map((r) => {
      return {
        userId: user.id,
        jobTitle: r.jobTitle,
        company: r.company,
        location: r.location || null,
        jobType: r.jobType || null,
        salary: r.salary || null,
        description: r.description || null,
        requirements: r.requirements || null,
        jobPostUrl: r.jobPostUrl || null,
        status: toStatus(r.status),
        appliedDate: toDateOrNull(r.appliedDate),
        source: toJobPlatform(r.source),
        notes: r.notes || null,
        externalJobId: r.externalJobId || null,
        externalSource: r.externalSource || null,
        externalData: r.externalData || null,
        contactName: r.contactName || null,
        contactEmail: r.contactEmail || null,
        contactPhone: r.contactPhone || null,
        interviewDate: toDateOrNull(r.interviewDate),
        interviewNotes: r.interviewNotes || null,
        offerAmount: r.offerAmount || null,
        offerDeadline: toDateOrNull(r.offerDeadline),
        isPasted: toBool(r.isPasted),
        isFavorite: toBool(r.isFavorite),
        reminderDate: toDateOrNull(r.reminderDate),
      }
    })

    const { error } = await adminSupabase.from("job_applications").insert(insertData)
    if (error) return { data: null, error: error.message }

    return { data: { inserted: insertData.length }, error: null }
  } catch (err) {
    console.error("Unexpected error importing job applications:", err)
    return { data: null, error: "Failed to import applications" }
  }
}
