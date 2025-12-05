import { z } from "zod";
import { supabase } from "../supabase/client";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    // deactivate old resumes
    await supabase.from("resumes").update({ isActive: false }).eq("userId", user.id);

    // insert new
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        userId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    // update profile resumeUrl
    await supabase
      .from("profiles")
      .update({ resumeUrl: parsed.data.fileUrl })
      .eq("userId", user.id);

    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error creating resume" };
  }
}

export async function listResumes() {
  try {
    

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
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
    

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const { error } = await supabase.from("resumes").delete().eq("id", id);

    if (error) return { data: null, error: error.message };

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: "Unexpected error deleting resume" };
  }
}

export async function updateResumeParsedData(id: string, parsedData: any) {
  try {
    

    const { data, error } = await supabase
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
