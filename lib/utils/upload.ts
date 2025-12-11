// lib/utils/upload.ts
"use server"

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/server";

export async function uploadAvatar(file: File, userId: string) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      return { data: null, error: "Unauthorized" };
    }

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage using admin client
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('profiles')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return { data: { url: publicUrl, path: filePath }, error: null };
  } catch (err) {
    console.error("Unexpected error uploading avatar:", err);
    return { data: null, error: "Failed to upload avatar" };
  }
}

export async function deleteAvatar(filePath: string, userId: string) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      return { data: null, error: "Unauthorized" };
    }

    // Delete from Supabase Storage
    const { error } = await adminSupabase.storage
      .from('profiles')
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    console.error("Unexpected error deleting avatar:", err);
    return { data: null, error: "Failed to delete avatar" };
  }
}
