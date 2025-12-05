// app/api/parse-resume/route.ts
import { adminSupabase } from '@/lib/supabase/server'
import { calculateCompletionScore, transformResumeData } from '@/lib/utils'
import { NextResponse } from 'next/server'
import { string } from 'zod'

export async function POST(request: Request) {
  try {
    const { resumeId } = await request.json()

    console.log('[parse-resume] Resume ID:', resumeId)

    // 1️⃣ Fetch resume record
    const { data: resume, error: resumeError } = await adminSupabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single()

    if (resumeError) {
      console.error('[parse-resume] Error fetching resume record:', resumeError)
      return NextResponse.json(
        { error: `Error fetching resume record: ${resumeError.message}` },
        { status: 500 }
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

    console.log('[parse-resume] Using fileUrl for Affinda:', finalUrl)

    // 3️⃣ Parse the resume via Affinda
    let parsedData: any
    try {
      parsedData = await parseResume(finalUrl, resume.fileName)
      console.log('[parse-resume] Parsed data:', parsedData)
    } catch (err: any) {
      console.error('[parse-resume] Error parsing resume:', err)
      return NextResponse.json(
        { 
          error: 'Failed to parse resume',
          details: JSON.parse(err.message)
        },
        { status: 500 }
      )
    }

    // 4️⃣ Update resume record with parsed data
    const { error: updateError } = await adminSupabase
      .from('resumes')
      .update({ parsedData })
      .eq('id', resumeId)

    if (updateError) {
      console.error('[parse-resume] Error updating resume record:', updateError)
      return NextResponse.json(
        { error: `Error updating resume record: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    // ----------------------------
    // 5️⃣ Update user profile
    // ----------------------------
    try {
      const parsedResume = transformResumeData(parsedData);
      await updateUserProfile(resume.userId, parsedResume)
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

// Helper function to parse resume via Affinda
async function parseResume(fileUrl: string, fileName: string) {
  try {
    console.log('[parse-resume] Fetching file from URL:', fileUrl);
    
    // First, download the file from the URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
    }
    
    // Get the file as a blob
    const fileBlob = await fileResponse.blob();
    
    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', fileBlob, fileName); // The filename is important
    
    console.log('[parse-resume] Sending to Affinda...');
    
    const response = await fetch('https://api.affinda.com/v2/resumes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AFFINDA_API_KEY}`
        // Don't set Content-Type header when using FormData, let the browser set it with the correct boundary
      },
      body: formData
    });

    const data = await response.json();
    console.log('[parse-resume] Affinda response status:', response.status);
    
    if (!response.ok) {
      console.error('[parse-resume] Affinda API error:', data);
      throw new Error(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        ...data
      }));
    }

    return data;
  } catch (error: any) {
    console.error('[parse-resume] Error in parseResume:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// ----------------------------
// Helper: Update user profile and skills
// ----------------------------
// Update user profile and related data
async function updateUserProfile(userId: string, parsedData: any) {
  try {
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
          firstName: parsedData.firstName || null,
          lastName: parsedData.lastName || null,
          phone: parsedData.phone || null,
          location: parsedData.location || null,
          headline: parsedData.headline || null,
          bio: parsedData.summary || null,
          completionScore: 0,
          isComplete: false,
          languages: parsedData.languages || [],
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
        firstName: parsedData.firstName || null,
        lastName: parsedData.lastName || null,
        phone: parsedData.phone || null,
        location: parsedData.location || null,
        headline: parsedData.headline || null,
        bio: parsedData.summary || null,
        updatedAt: new Date().toISOString()
      };

      const { error: updateProfileError } = await adminSupabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profileId);

      if (updateProfileError) throw updateProfileError;
    }

    // 3. Handle skills
    if (parsedData.skills?.length) {
      const skillsToInsert = parsedData.skills.map((skill: string) => ({
        profileId,
        name: skill,
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

