// app/api/parse-resume/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { Resend } from 'resend' // For sending emails if needed
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const { resumeId } = await request.json()

    // 1. Get the resume record
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single()

    if (resumeError) throw resumeError

    // 2. Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes-files')
      .createSignedUrl(resume.fileUrl, 3600) // 1 hour URL

    if (downloadError) throw downloadError

    // 3. Parse the resume (using a parsing service)
    const parsedData = await parseResume(fileData.signedUrl)

    console.log("ParsedData: ", parsedData);
    

    // 4. Update user profile with parsed data
    // await updateUserProfile(resume.userId, parsedData)

    // 5. Update resume record with parsed data
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ 
        parsedData,
        isParsed: true
      })
      .eq('id', resumeId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: parsedData })
  } catch (error: any) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse resume' },
      { status: 500 }
    )
  }
}

// Helper function to parse resume (implementation depends on your parsing service)
async function parseResume(fileUrl: string) {
  // Implementation depends on your parsing service
  // Example using Affinda API:
  const response = await fetch('https://api.affinda.com/v3/resumes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AFFINDA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: fileUrl })
  })

  if (!response.ok) {
    throw new Error('Failed to parse resume')
  }

  return response.json()
}

// Update user profile with parsed data
async function updateUserProfile(userId: string, parsedData: any) {
  
  // Extract relevant data from parsed resume
  const profileUpdates = {
    firstName: parsedData.firstName,
    lastName: parsedData.lastName,
    phone: parsedData.phone,
    location: parsedData.location,
    // ... other fields
  }

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('userId', userId)

  if (error) throw error

  // Handle skills, experiences, etc.
//   await updateRelatedData(userId, parsedData)
}