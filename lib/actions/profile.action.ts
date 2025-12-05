import { z } from "zod";
import { supabase } from "../supabase/client";

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

export async function getProfile() {
  try {
    

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error fetching profile" };
  }
}

export async function createProfile(values: z.infer<typeof ProfileSchema>) {
  try {
    
    const parsed = ProfileSchema.safeParse(values);
    if (!parsed.success) return { data: null, error: "Invalid input format" };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const payload = { userId: user.id, ...parsed.data };

    const { data, error } = await supabase.from("profiles").insert(payload).select("*").single();
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
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
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
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await supabase.from("profiles").delete().eq("userId", user.id);

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
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const existing = await supabase
      .from("profiles")
      .select("id")
      .eq("userId", user.id)
      .single();

    if (existing.error && existing.error.code !== "PGRST116") {
      return { data: null, error: existing.error.message };
    }

    const { data, error } = await supabase
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
