"use server"
import { z } from "zod";
import { adminSupabase, createClient } from "../supabase/server";

const ProfileSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),

  website: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  githubUrl: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),

  avatarUrl: z.string().optional().nullable(),
  resumeUrl: z.string().optional().nullable(),

  languages: z.array(z.string()).optional().nullable(),

  completionScore: z.number().optional().nullable(),
  isComplete: z.boolean().optional().nullable(),
});

export async function getProfile(userId: string) {
  try {
        const { data, error } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();

      console.log("Data: ", data);
      
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: `Unexpected error fetching profile` };
  }
}

export async function getProfileDetails(userId: string) {
  try {
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();

    if (profileError) return { data: null, error: profileError.message };
    if (!profile) return { data: null, error: "Profile not found" };

    const profileId = profile.id;

    const [skillsRes, experiencesRes, educationsRes, certificationsRes] = await Promise.all([
      adminSupabase.from("skills").select("*").eq("profileId", profileId),
      adminSupabase.from("experiences").select("*").eq("profileId", profileId),
      adminSupabase.from("educations").select("*").eq("profileId", profileId),
      adminSupabase.from("certifications").select("*").eq("profileId", profileId),
    ]);

    const firstError =
      skillsRes.error || experiencesRes.error || educationsRes.error || certificationsRes.error;

    if (firstError) return { data: null, error: firstError.message };

    return {
      data: {
        profile,
        skills: skillsRes.data || [],
        experiences: experiencesRes.data || [],
        educations: educationsRes.data || [],
        certifications: certificationsRes.data || [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: "Unexpected error fetching profile details" };
  }
}

export async function createProfile(values: z.infer<typeof ProfileSchema>) {
  try {
    
    const parsed = ProfileSchema.safeParse(values);
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const payload = { userId: user.id, ...parsed.data };

    const { data, error } = await adminSupabase.from("profiles").insert(payload).select("*").single();
    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error while creating profile" };
  }
}

export async function updateProfile(values: z.infer<typeof ProfileSchema>) {
  try {
    
    const parsed = ProfileSchema.safeParse(values);
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("profiles")
      .update({ ...parsed.data, updatedAt: new Date().toISOString() })
      .eq("userId", user.id)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error updating profile" };
  }
}

export async function deleteProfile() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase.from("profiles").delete().eq("userId", user.id);

    if (error) return { data: null, error: error.message };

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error deleting profile" };
  }
}

export async function upsertProfile(values: z.infer<typeof ProfileSchema>) {
  try {
    
    const parsed = ProfileSchema.safeParse(values);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.issues);
      return { data: null, error: `Invalid input format: ${parsed.error.issues.map((e: any) => e.message).join(', ')}` };
    }

    // Use authenticated client to get user from session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Check if profile exists
    const { data: existing } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    let data, error;

    if (existing) {
      // Update existing profile
      const result = await adminSupabase
        .from("profiles")
        .update({ ...parsed.data, updatedAt: new Date().toISOString() })
        .eq("userId", user.id)
        .select("*")
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Insert new profile
      const result = await adminSupabase
        .from("profiles")
        .insert({ userId: user.id, ...parsed.data, updatedAt: new Date().toISOString() })
        .select("*")
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error in upsert profile" };
  }
}

export async function updateCompletionScore() {
  try {
    // Get the current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // Get the current profile
    const { data: profile, error: fetchError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (fetchError) return { data: null, error: fetchError.message };
    if (!profile) return { data: null, error: "Profile not found" };

    // Calculate completion score based on profile fields
    let score = 0;
    const fieldsToCheck = [
      { field: 'firstName', weight: 10 },
      { field: 'lastName', weight: 10 },
      { field: 'location', weight: 10 },
      { field: 'headline', weight: 10 },
      { field: 'resumeUrl', weight: 30 },
      { field: 'skills', weight: 20 },
      { field: 'languages', weight: 10 }
    ];

    for (const { field, weight } of fieldsToCheck) {
      if (field === 'skills' && profile.skills?.length > 0) {
        score += weight;
      } else if (field === 'languages' && profile.languages?.length > 0) {
        score += weight;
      } else if (profile[field]) {
        score += weight;
      }
    }

    // Cap the score at 100
    const finalScore = Math.min(score, 100);
    const isComplete = finalScore >= 80; // Consider profile complete if score is 80% or higher

    // Update the profile with the new score
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from("profiles")
      .update({ 
        completionScore: finalScore,
        isComplete,
        updatedAt: new Date().toISOString()
      })
      .eq("userId", user.id)
      .select("*")
      .single();

    if (updateError) return { data: null, error: updateError.message };

    return { 
      data: { 
        completionScore: finalScore,
        isComplete,
        profile: updatedProfile 
      }, 
      error: null 
    };
  } catch (err) {
    console.error("Error updating completion score:", err);
    return { data: null, error: "Unexpected error updating completion score" };
  }
}
