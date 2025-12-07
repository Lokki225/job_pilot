"use server"
import { z } from "zod";
import { adminSupabase } from "../supabase/server";

const ProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  headline: z.string().optional(),

  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  twitterUrl: z.string().optional(),

  avatarUrl: z.string().optional(),
  resumeUrl: z.string().optional(),

  languages: z.array(z.string()).optional(),

  completionScore: z.number().optional(),
  isComplete: z.boolean().optional(),
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

export async function createProfile(values: z.infer<typeof ProfileSchema>) {
  try {
    
    const parsed = ProfileSchema.safeParse(values);
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    const {
      data: { user },
    } = await adminSupabase.auth.getUser();

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

    const {
      data: { user },
    } = await adminSupabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await adminSupabase
      .from("profiles")
      .update({ ...parsed.data })
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
    

    const {
      data: { user },
    } = await adminSupabase.auth.getUser();

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
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    const {
      data: { user },
    } = await adminSupabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const existing = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("userId", user.id)
      .single();

    if (existing.error && existing.error.code !== "PGRST116") {
      return { data: null, error: existing.error.message };
    }

    const { data, error } = await adminSupabase
      .from("profiles")
      .upsert({ userId: user.id, ...parsed.data })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error in upsert profile" };
  }
}

export async function updateCompletionScore() {
  try {
    // Get the current user
    const {
      data: { user },
    } = await adminSupabase.auth.getUser();

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
