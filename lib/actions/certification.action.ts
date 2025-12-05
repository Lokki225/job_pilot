// lib/actions/certification.action.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const CertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()).optional(),
  credentialUrl: z.string().url().optional(),
})

export async function createCertification(values: z.infer<typeof CertificationSchema>) {
  try {
    
    const parsed = CertificationSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("certifications")
      .insert({
        profileId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating certification" }
  }
}

export async function getCertifications() {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("certifications")
      .select("*")
      .eq("profileId", user.id)
      .order("issueDate", { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error fetching certifications" }
  }
}

export async function updateCertification(id: string, values: Partial<z.infer<typeof CertificationSchema>>) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("certifications")
      .update(values)
      .eq("id", id)
      .eq("profileId", user.id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating certification" }
  }
}

export async function deleteCertification(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("certifications")
      .delete()
      .eq("id", id)
      .eq("profileId", user.id)

    if (error) return { data: null, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting certification" }
  }
}