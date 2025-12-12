"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from '@/lib/supabase/server'

// ===========================================================
// SCHEMAS
// ===========================================================

const JobPreferenceSchema = z.object({
  jobTitles: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  
  minSalary: z.number().optional().nullable(),
  maxSalary: z.number().optional().nullable(),
  currency: z.string().default("USD"),
  
  experienceLevel: z.string().optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  
  workTypes: z.array(z.string()).default([]),
  remoteOptions: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  
  industries: z.array(z.string()).default([]),
  companySize: z.array(z.string()).default([]),
  excludeCompanies: z.array(z.string()).default([]),
  
  autoSearch: z.boolean().default(false),
  notifyOnMatch: z.boolean().default(true),
  searchFrequency: z.string().default("daily"),
})

const JobPreferenceUpdateSchema = JobPreferenceSchema.partial()

// ===========================================================
// GET JOB PREFERENCES
// ===========================================================

export async function getJobPreferences() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from('job_search_preferences')
      .select('*')
      .eq('userId', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error getting preferences:', err)
    return { data: null, error: "Failed to get preferences" }
  }
}

// ===========================================================
// UPSERT JOB PREFERENCES
// ===========================================================

export async function upsertJobPreferences(values: z.infer<typeof JobPreferenceSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const parsed = JobPreferenceSchema.safeParse(values)
    if (!parsed.success) {
      console.error("Preferences validation errors:", parsed.error.issues)
      return { 
        data: null, 
        error: `Invalid input: ${parsed.error.issues.map(e => e.message).join(", ")}` 
      }
    }

    const { data, error } = await adminSupabase
      .from('job_search_preferences')
      .upsert({
        userId: user.id,
        ...parsed.data
      }, {
        onConflict: 'userId'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error upserting preferences:', err)
    return { data: null, error: "Failed to save preferences" }
  }
}

// ===========================================================
// UPDATE SEARCH SETTINGS
// ===========================================================

export async function updateSearchSettings(settings: {
  autoSearch?: boolean
  notifyOnMatch?: boolean
  searchFrequency?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from('job_search_preferences')
      .update(settings)
      .eq('userId', user.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error updating settings:', err)
    return { data: null, error: "Failed to update settings" }
  }
}

// ===========================================================
// ADD EXCLUDED COMPANY
// ===========================================================

export async function addExcludedCompany(company: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    // Get current preferences
    const { data: current } = await adminSupabase
      .from('job_search_preferences')
      .select('excludeCompanies')
      .eq('userId', user.id)
      .single()

    const excludeCompanies = current?.excludeCompanies || []
    if (!excludeCompanies.includes(company)) {
      excludeCompanies.push(company)
    }

    const { data, error } = await adminSupabase
      .from('job_search_preferences')
      .update({ excludeCompanies })
      .eq('userId', user.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error adding excluded company:', err)
    return { data: null, error: "Failed to add excluded company" }
  }
}

// ===========================================================
// REMOVE EXCLUDED COMPANY
// ===========================================================

export async function removeExcludedCompany(company: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    // Get current preferences
    const { data: current } = await adminSupabase
      .from('job_search_preferences')
      .select('excludeCompanies')
      .eq('userId', user.id)
      .single()

    const excludeCompanies = (current?.excludeCompanies || []).filter(
      (c: string) => c !== company
    )

    const { data, error } = await adminSupabase
      .from('job_search_preferences')
      .update({ excludeCompanies })
      .eq('userId', user.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error removing excluded company:', err)
    return { data: null, error: "Failed to remove excluded company" }
  }
}
