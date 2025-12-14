// app/api/parse-resume/route.ts
import { adminSupabase } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCompletionScore } from '@/lib/utils'
import { aiService } from '@/lib/services/ai'
import { cvExtractorService } from '@/lib/services/cv-extractor'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ParseResumeBodySchema = z.object({
  resumeId: z.string().trim().min(1).max(128),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(`api:parse-resume:${user.id}`, 10, 60 * 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const parsedBody = ParseResumeBodySchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { resumeId } = parsedBody.data

    console.log('[parse-resume] Resume ID:', resumeId)

    // 1️⃣ Fetch resume record
    const { data: resume, error: resumeError } = await adminSupabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('userId', user.id)
      .single()

    if (resumeError || !resume) {
      console.error('[parse-resume] Error fetching resume record:', resumeError)
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    console.log('[parse-resume] Resume record:', resume)

    // 2️⃣ Get public URL from Supabase storage
    const { data: { publicUrl } } = adminSupabase.storage
      .from('resumes-files')
      .getPublicUrl(resume.fileUrl)

    // Remove the base URL if it's duplicated
    const baseUrl = "https://rcfjqypstnkfnxqeszkj.supabase.co/storage/v1/object/public/resumes-files/";
    let finalUrl = publicUrl;

    // If the publicUrl already contains the baseUrl, remove the duplicate
    if (publicUrl.startsWith(baseUrl + baseUrl)) {
      finalUrl = publicUrl.replace(baseUrl, '');
    }

    if (!finalUrl) {
      console.error('[parse-resume] Failed to generate public URL')
      return NextResponse.json(
        { error: 'Failed to generate public URL' },
        { status: 500 }
      )
    }

    console.log('[parse-resume] Using fileUrl for CV extraction:', finalUrl)

    // 3️⃣ Extract text from CV using local CV extractor (PDF + OCR merge)
    let extractedText: string
    try {
      console.log('[parse-resume] Checking CV extractor availability...')
      const isAvailable = await cvExtractorService.isAvailable()
      
      if (!isAvailable) {
        console.warn('[parse-resume] CV extractor service not available, falling back to direct AI parsing')
        // Fallback: try to fetch and parse directly
        const fileResponse = await fetch(finalUrl)
        const fileBlob = await fileResponse.blob()
        const buffer = Buffer.from(await fileBlob.arrayBuffer())
        
        // Use AI to extract what it can from the file
        extractedText = `Resume file: ${resume.fileName}\nNote: CV extractor service unavailable, using fallback parsing.`
      } else {
        console.log('[parse-resume] Fetching file for CV extraction...')
        const fileResponse = await fetch(finalUrl)
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`)
        }
        
        const fileBlob = await fileResponse.blob()
        const buffer = Buffer.from(await fileBlob.arrayBuffer())
        
        console.log('[parse-resume] Extracting text with CV extractor (PDF + OCR merge)...')
        const extractionResult = await cvExtractorService.extractTextFromBuffer(
          buffer,
          resume.fileName,
          { mode: 'auto', preprocess: true }
        )
        
        extractedText = extractionResult.full_text
        console.log('[parse-resume] CV extraction complete:', {
          mode: extractionResult.mode_used,
          pages: extractionResult.num_pages,
          chars: extractionResult.stats.total_chars,
          warnings: extractionResult.warnings
        })
        
        // Log warnings if any
        if (extractionResult.warnings.length > 0) {
          console.warn('[parse-resume] CV extraction warnings:', extractionResult.warnings)
        }
      }
    } catch (err: any) {
      console.error('[parse-resume] Error extracting CV text:', err)
      return NextResponse.json(
        { 
          error: 'Failed to extract CV text',
          details: err.message
        },
        { status: 500 }
      )
    }

    // 4️⃣ Use AI to transform extracted text into structured profile data
    let parsedData: any
    try {
      console.log('[parse-resume] Using AI to parse extracted CV text...')
      parsedData = await aiService.parseResumeData({ extractedText })
      console.log('[parse-resume] AI parsed data:', parsedData)
    } catch (aiError: any) {
      console.error('[parse-resume] AI parsing failed:', aiError)
      return NextResponse.json(
        { 
          error: 'Failed to parse CV data with AI',
          details: aiError.message
        },
        { status: 500 }
      )
    }

    // 5️⃣ Update resume record with both raw extracted text and parsed data
    const { error: updateError } = await adminSupabase
      .from('resumes')
      .update({ 
        parsedData: {
          raw: { extractedText },
          structured: parsedData
        }
      })
      .eq('id', resumeId)

    if (updateError) {
      console.error('[parse-resume] Error updating resume record:', updateError)
      return NextResponse.json(
        { error: `Error updating resume record: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    // ----------------------------
    // 6️⃣ Update user profile with AI-parsed data
    // ----------------------------
    try {
      await updateUserProfileWithAIParsedData(resume.userId, parsedData, finalUrl)
    } catch (profileError: any) {
      console.error('Error updating user profile:', profileError)
      throw new Error('Failed to update user profile: ' + profileError.message)
    }    

    return NextResponse.json({ success: true, data: parsedData })
  } catch (error: any) {
    console.error('[parse-resume] Unexpected route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse resume' },
      { status: 500 }
    )
  }
}

// Note: Affinda integration replaced with local CV extractor service
// The CV extractor uses PyMuPDF for PDF text extraction + Tesseract OCR
// with intelligent merging to maximize text coverage from any CV format

// ----------------------------
// Helper: Update user profile with AI-parsed data
// ----------------------------
async function updateUserProfileWithAIParsedData(userId: string, parsedData: any, resumeUrl: string) {
  try {
    // AI-parsed data has structure: { profile: {...}, skills: [...], experiences: [...], etc. }
    const profileData = parsedData.profile || {}
    
    // 1. Try to get the existing profile or create a new one if it doesn't exist
    let profileId: string;
    
    // First, try to get the existing profile
    const { data: existingProfile, error: fetchError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('userId', userId)
      .single();

    if (fetchError || !existingProfile) {
      // Profile doesn't exist, create a new one
      const { data: newProfile, error: createError } = await adminSupabase
        .from('profiles')
        .insert({
          userId: userId,
          firstName: profileData.firstName || null,
          lastName: profileData.lastName || null,
          phone: profileData.phone || null,
          location: profileData.location || null,
          headline: profileData.headline || null,
          bio: profileData.bio || null,
          website: profileData.website || null,
          linkedinUrl: profileData.linkedinUrl || null,
          githubUrl: profileData.githubUrl || null,
          completionScore: 0,
          isComplete: false,
          resumeUrl: resumeUrl,
          languages: profileData.languages || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError || !newProfile) {
        throw new Error(createError?.message || 'Failed to create profile');
      }

      profileId = newProfile.id;
    } else {
      // Use existing profile ID
      profileId = existingProfile.id;

      // 2. Update core profile fields for existing profile
      const profileUpdates: any = {
        resumeUrl: resumeUrl,
        updatedAt: new Date().toISOString()
      };
      
      // Only update fields that have values from AI parsing
      if (profileData.firstName) profileUpdates.firstName = profileData.firstName;
      if (profileData.lastName) profileUpdates.lastName = profileData.lastName;
      if (profileData.phone) profileUpdates.phone = profileData.phone;
      if (profileData.location) profileUpdates.location = profileData.location;
      if (profileData.headline) profileUpdates.headline = profileData.headline;
      if (profileData.bio) profileUpdates.bio = profileData.bio;
      if (profileData.website) profileUpdates.website = profileData.website;
      if (profileData.linkedinUrl) profileUpdates.linkedinUrl = profileData.linkedinUrl;
      if (profileData.githubUrl) profileUpdates.githubUrl = profileData.githubUrl;
      if (profileData.languages?.length) profileUpdates.languages = profileData.languages;

      const { error: updateProfileError } = await adminSupabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profileId);

      if (updateProfileError) throw updateProfileError;
    }

    // 3. Handle skills (AI-parsed format: { name, level, category })
    if (parsedData.skills?.length) {
      const skillsToInsert = parsedData.skills.map((skill: any) => ({
        profileId,
        name: skill.name || skill,
        level: skill.level || 3,
        category: skill.category || 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Delete existing skills and insert new ones
      await adminSupabase
        .from('skills')
        .delete()
        .eq('profileId', profileId)

      const { error: skillsError } = await adminSupabase
        .from('skills')
        .insert(skillsToInsert)

      if (skillsError) throw skillsError
    }

    // 4. Handle experiences
    if (parsedData.experiences?.length) {
      const experiencesToInsert = parsedData.experiences.map((exp: any) => ({
        profileId,
        title: exp.title || 'Untitled Position',
        company: exp.company || 'Unknown Company',
        location: exp.location || null,
        startDate: exp.startDate ? new Date(exp.startDate).toISOString() : new Date().toISOString(),
        endDate: exp.endDate ? new Date(exp.endDate).toISOString() : null,
        isCurrent: exp.isCurrent || false,
        description: exp.description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Delete existing experiences and insert new ones
      await adminSupabase
        .from('experiences')
        .delete()
        .eq('profileId', profileId)

      const { error: expError } = await adminSupabase
        .from('experiences')
        .insert(experiencesToInsert)

      if (expError) throw expError
    }

    // 5. Handle education
    if (parsedData.educations?.length) {
      const educationToInsert = parsedData.educations.map((edu: any) => ({
        profileId,
        institution: edu.institution || 'Unknown Institution',
        degree: edu.degree || 'Unknown Degree',
        field: edu.field || null,
        startDate: edu.startDate ? new Date(edu.startDate).toISOString() : new Date().toISOString(),
        endDate: edu.endDate ? new Date(edu.endDate).toISOString() : null,
        isCurrent: edu.isCurrent || false,
        description: edu.description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Delete existing education and insert new ones
      await adminSupabase
        .from('educations')
        .delete()
        .eq('profileId', profileId)

      const { error: eduError } = await adminSupabase
        .from('educations')
        .insert(educationToInsert)

      if (eduError) throw eduError
    }

    // 6. Handle certifications
    if (parsedData.certifications?.length) {
      const certsToInsert = parsedData.certifications.map((cert: any) => ({
        profileId,
        name: cert.name || 'Unnamed Certification',
        issuer: cert.issuer || 'Unknown Issuer',
        issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString() : new Date().toISOString(),
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString() : null,
        credentialUrl: cert.credentialUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Delete existing certifications and insert new ones
      await adminSupabase
        .from('certifications')
        .delete()
        .eq('profileId', profileId)

      const { error: certError } = await adminSupabase
        .from('certifications')
        .insert(certsToInsert)

      if (certError) throw certError
    }

    // 7. Handle projects
    if (parsedData.projects?.length) {
      const projectsToInsert = parsedData.projects.map((proj: any) => ({
        profileId,
        name: proj.name || 'Unnamed Project',
        description: proj.description || null,
        url: proj.url || null,
        startDate: proj.startDate ? new Date(proj.startDate).toISOString() : new Date().toISOString(),
        endDate: proj.endDate ? new Date(proj.endDate).toISOString() : null,
        isCurrent: proj.isCurrent || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Delete existing projects and insert new ones
      await adminSupabase
        .from('projects')
        .delete()
        .eq('profileId', profileId)

      const { error: projError } = await adminSupabase
        .from('projects')
        .insert(projectsToInsert)

      if (projError) throw projError
    }

    // 8. Update profile completion status
    const completionScore = calculateCompletionScore(parsedData)
    await adminSupabase
      .from('profiles')
      .update({ 
        completionScore,
        isComplete: completionScore >= 80, // Consider 80% as complete
        updatedAt: new Date().toISOString()
      })
      .eq('id', profileId)

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
}

