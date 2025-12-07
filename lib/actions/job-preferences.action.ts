"use server"

import { adminSupabase } from '../supabase/server'

type JobPreference = {
  id?: string
  userId: string
  jobTitles: string[]
  locations: string[]
  minSalary: number
  maxSalary: number
  experienceLevel: string
  workTypes: string[]
  remoteOptions: string[]
  skills: string[]
  createdAt?: string
  updatedAt?: string
}

export async function createJobPreference(preference: Omit<JobPreference, 'id' | 'createdAt' | 'updatedAt'>) {
  
  const { data, error } = await adminSupabase
    .from('job_search_preferences')
    .insert([{
      userId: preference.userId,
      jobTitles: preference.jobTitles,
      locations: preference.locations,
      minSalary: preference.minSalary,
      maxSalary: preference.maxSalary,
      experienceLevel: preference.experienceLevel,
      workTypes: preference.workTypes,
      remoteOptions: preference.remoteOptions,
      skills: preference.skills
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating job preference:', error.message)
    throw new Error(`Failed to create job preference: ${error.message}`)
  }

  return data
}

export async function getJobPreference(userId: string) {
  
  
  const { data, error } = await adminSupabase
    .from('job_search_preferences')
    .select('*')
    .eq('userId', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching job preference:', error)
    throw new Error('Failed to fetch job preference')
  }

  return data ? {
    id: data.id,
    userId: data.user_id,
    jobTitles: data.job_titles || [],
    locations: data.locations || [],
    minSalary: data.min_salary || 0,
    maxSalary: data.max_salary || 0,
    experienceLevel: data.experience_level || 'Mid-Level',
    workTypes: data.work_types || [],
    remoteOptions: data.remote_options || [],
    skills: data.skills || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } : null
}

export async function updateJobPreference(
  id: string, 
  updates: Partial<Omit<JobPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  
  
  const { error } = await adminSupabase
    .from('job_search_preferences')
    .update({
      jobTitles: updates.jobTitles,
      locations: updates.locations,
      minSalary: updates.minSalary,
      maxSalary: updates.maxSalary,
      experienceLevel: updates.experienceLevel,
      workTypes: updates.workTypes,
      remoteOptions: updates.remoteOptions,
      skills: updates.skills,
      updatedAt: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating job preference:', error)
    throw new Error('Failed to update job preference')
  }

  return { success: true }
}

export async function deleteJobPreference(id: string) {
  
  
  const { error } = await adminSupabase
    .from('job_search_preferences')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting job preference:', error)
    throw new Error('Failed to delete job preference')
  }

  return { success: true }
}

export async function upsertJobPreference(preference: Omit<JobPreference, 'id' | 'createdAt' | 'updatedAt'>) {
  
  
  const { data: existing } = await adminSupabase
    .from('job_search_preferences')
    .select('id')
    .eq('userId', preference.userId)
    .single()

  if (existing) {
    return updateJobPreference(existing.id, preference)
  } else {
    return createJobPreference(preference)
  }
}
