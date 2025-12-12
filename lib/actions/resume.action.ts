'use server'

import { z } from "zod";
import { adminSupabase } from "../supabase/server";
import { createClient } from "../supabase/server";

const ResumeSchema = z.object({
  fileUrl: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  parsedData: z.any().optional(),
});

export async function createResume(values: z.infer<typeof ResumeSchema>) {
  try {
    const parsed = ResumeSchema.safeParse(values);
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    // Get authenticated user from server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Ensure user exists in users table (handles case where OAuth callback didn't create it)
    const { data: existingUser, error: userCheckError } = await adminSupabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (userCheckError || !existingUser) {
      // Create user record first - this MUST succeed before inserting resume
      const { error: userInsertError } = await adminSupabase.from("users").upsert({
        id: user.id,
        email: user.email!,
        role: "USER",
      }, { onConflict: "id" });

      if (userInsertError) {
        console.error("Failed to create user record:", userInsertError);
        return { data: null, error: "Failed to create user record: " + userInsertError.message };
      }

      // Create profile record
      const userMetadata = user.user_metadata || {};
      const fullName = userMetadata.full_name || userMetadata.name || user.email?.split("@")[0] || "User";
      const nameParts = fullName.trim().split(/\s+/);
      
      const { error: profileInsertError } = await adminSupabase.from("profiles").upsert({
        userId: user.id,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        avatarUrl: userMetadata.avatar_url || userMetadata.picture || "",
      }, { onConflict: "userId" });

      if (profileInsertError) {
        console.error("Failed to create profile record:", profileInsertError);
        // Don't fail here - profile is not required for resume upload
      }
    }

    // Use admin client for database operations (bypasses RLS)
    // Deactivate old resumes
    await adminSupabase.from("resumes").update({ isActive: false }).eq("userId", user.id);

    // Insert new resume
    const { data, error } = await adminSupabase
      .from("resumes")
      .insert({
        userId: user.id,
        ...parsed.data,
        isActive: true,
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    // Update profile resumeUrl
    await adminSupabase
      .from("profiles")
      .update({ resumeUrl: parsed.data.fileUrl })
      .eq("userId", user.id);

    return { data, error: null };
  } catch (err) {
    console.error("Error creating resume:", err);
    return { data: null, error: "Unexpected error creating resume" };
  }
}

export async function listResumes() {
  try {
    // Get authenticated user from server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("resumes")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error listing resumes" };
  }
}

export async function deleteResume(id: string) {
  try {
    // Get authenticated user from server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { data: null, error: "Unauthorized" };

    // Verify ownership before deleting
    const { data: resume } = await adminSupabase
      .from("resumes")
      .select("userId")
      .eq("id", id)
      .single();

    if (!resume || resume.userId !== user.id) {
      return { data: null, error: "Unauthorized" };
    }

    const { error } = await adminSupabase.from("resumes").delete().eq("id", id);

    if (error) return { data: null, error: error.message };

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error deleting resume" };
  }
}

export async function updateResumeParsedData(id: string, parsedData: any) {
  try {
    const { data, error } = await adminSupabase
      .from("resumes")
      .update({ parsedData })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error updating parsed data" };
  }
}

/**
 * Parse resume data from Affinda (or similar service) using AI
 * This transforms raw parsed data into structured profile fields
 */
export async function parseResumeWithAI(rawAffindaData: any) {
  try {
    const { aiService } = await import("@/lib/services/ai");
    
    // Parse the raw data using AI
    const parsedData = await aiService.parseResumeData(rawAffindaData);
    
    return { data: parsedData, error: null };
  } catch (err) {
    console.error("Error parsing resume with AI:", err);
    return { data: null, error: "Failed to parse resume data" };
  }
}

/**
 * Parse resume and save to profile
 * This parses Affinda data and updates the user's profile with extracted information
 */
export async function parseAndSaveResumeToProfile(resumeId: string, rawAffindaData: any) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { data: null, error: "Unauthorized" };

    // Import AI service dynamically to avoid circular dependencies
    const { aiService } = await import("@/lib/services/ai");
    
    // Parse the raw data using AI
    const parsedData = await aiService.parseResumeData(rawAffindaData);
    
    // Get the user's profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("userId", user.id)
      .single();

    if (!profile) {
      return { data: null, error: "Profile not found" };
    }

    const profileId = profile.id;

    // Update profile with parsed data
    if (parsedData.profile) {
      const profileUpdate: any = {};
      
      if (parsedData.profile.firstName) profileUpdate.firstName = parsedData.profile.firstName;
      if (parsedData.profile.lastName) profileUpdate.lastName = parsedData.profile.lastName;
      if (parsedData.profile.phone) profileUpdate.phone = parsedData.profile.phone;
      if (parsedData.profile.location) profileUpdate.location = parsedData.profile.location;
      if (parsedData.profile.bio) profileUpdate.bio = parsedData.profile.bio;
      if (parsedData.profile.headline) profileUpdate.headline = parsedData.profile.headline;
      if (parsedData.profile.website) profileUpdate.website = parsedData.profile.website;
      if (parsedData.profile.linkedinUrl) profileUpdate.linkedinUrl = parsedData.profile.linkedinUrl;
      if (parsedData.profile.githubUrl) profileUpdate.githubUrl = parsedData.profile.githubUrl;
      if (parsedData.profile.twitterUrl) profileUpdate.twitterUrl = parsedData.profile.twitterUrl;
      if (parsedData.profile.languages?.length > 0) profileUpdate.languages = parsedData.profile.languages;

      if (Object.keys(profileUpdate).length > 0) {
        await adminSupabase
          .from("profiles")
          .update({ ...profileUpdate, updatedAt: new Date().toISOString() })
          .eq("id", profileId);
      }
    }

    // Insert skills
    if (parsedData.skills?.length > 0) {
      // Delete existing skills first
      await adminSupabase.from("skills").delete().eq("profileId", profileId);
      
      // Insert new skills
      const skillsToInsert = parsedData.skills.map(skill => ({
        profileId,
        name: skill.name,
        level: skill.level,
        category: skill.category,
      }));
      
      await adminSupabase.from("skills").insert(skillsToInsert);
    }

    // Insert experiences
    if (parsedData.experiences?.length > 0) {
      // Delete existing experiences first
      await adminSupabase.from("experiences").delete().eq("profileId", profileId);
      
      // Insert new experiences
      const experiencesToInsert = parsedData.experiences.map(exp => ({
        profileId,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrent: exp.isCurrent,
        description: exp.description,
      }));
      
      await adminSupabase.from("experiences").insert(experiencesToInsert);
    }

    // Insert educations
    if (parsedData.educations?.length > 0) {
      // Delete existing educations first
      await adminSupabase.from("educations").delete().eq("profileId", profileId);
      
      // Insert new educations
      const educationsToInsert = parsedData.educations.map(edu => ({
        profileId,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate,
        isCurrent: edu.isCurrent,
        description: edu.description,
      }));
      
      await adminSupabase.from("educations").insert(educationsToInsert);
    }

    // Insert certifications
    if (parsedData.certifications?.length > 0) {
      // Delete existing certifications first
      await adminSupabase.from("certifications").delete().eq("profileId", profileId);
      
      // Insert new certifications
      const certificationsToInsert = parsedData.certifications.map(cert => ({
        profileId,
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        credentialUrl: cert.credentialUrl,
      }));
      
      await adminSupabase.from("certifications").insert(certificationsToInsert);
    }

    // Insert projects
    if (parsedData.projects?.length > 0) {
      // Delete existing projects first
      await adminSupabase.from("projects").delete().eq("profileId", profileId);
      
      // Insert new projects
      const projectsToInsert = parsedData.projects.map(proj => ({
        profileId,
        name: proj.name,
        description: proj.description,
        url: proj.url,
        startDate: proj.startDate,
        endDate: proj.endDate,
        isCurrent: proj.isCurrent,
      }));
      
      await adminSupabase.from("projects").insert(projectsToInsert);
    }

    // Update resume with parsed data
    await adminSupabase
      .from("resumes")
      .update({ parsedData: rawAffindaData })
      .eq("id", resumeId);

    // Update profile completion score
    const { updateCompletionScore } = await import("@/lib/actions/profile.action");
    await updateCompletionScore();

    return { 
      data: {
        parsedData,
        message: "Resume parsed and profile updated successfully"
      }, 
      error: null 
    };
  } catch (err) {
    console.error("Error parsing and saving resume:", err);
    return { data: null, error: "Failed to parse and save resume data" };
  }
}
