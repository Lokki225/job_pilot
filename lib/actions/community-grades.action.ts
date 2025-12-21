"use server";

import { z } from "zod";
import { createClient, adminSupabase } from "@/lib/supabase/server";
import { requireUserAtLeastRole } from "@/lib/auth/rbac";
import {
  computeMentorGrade,
  computeResourceSharerGrade,
  pickHigherGrade,
  type CommunityGrade,
} from "@/lib/services/community-grades.service";

export async function getMyMentorGradePreview(): Promise<{
  data:
    | {
        computedGrade: CommunityGrade;
        storedGrade: string | null;
        metrics: { completedMentorships: number };
        roleApplicationStatus: string | null;
      }
    | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const [{ grade, metrics }, { data: roleApp, error: roleErr }] = await Promise.all([
      computeMentorGrade(user.id),
      adminSupabase
        .from("community_role_applications")
        .select("status,grade")
        .eq("userId", user.id)
        .eq("roleType", "MENTOR")
        .maybeSingle(),
    ]);

    if (roleErr) return { data: null, error: roleErr.message };

    return {
      data: {
        computedGrade: grade,
        storedGrade: roleApp?.grade ?? null,
        metrics,
        roleApplicationStatus: roleApp?.status ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting mentor grade preview:", err);
    return { data: null, error: "Failed to compute grade" };
  }
}

export async function refreshMyMentorGrade(): Promise<{
  data: { grade: CommunityGrade } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: roleApp, error: roleErr } = await adminSupabase
      .from("community_role_applications")
      .select("status,grade")
      .eq("userId", user.id)
      .eq("roleType", "MENTOR")
      .maybeSingle();

    if (roleErr) return { data: null, error: roleErr.message };
    if (!roleApp) return { data: null, error: "Mentor application not found" };
    if (roleApp.status !== "APPROVED") return { data: null, error: "Mentor role is not approved" };

    const { grade } = await computeMentorGrade(user.id);
    const next = pickHigherGrade(roleApp.grade, grade);

    if (!roleApp.grade || next !== roleApp.grade) {
      const { error: updateErr } = await adminSupabase
        .from("community_role_applications")
        .update({ grade: next })
        .eq("userId", user.id)
        .eq("roleType", "MENTOR");

      if (updateErr) return { data: null, error: updateErr.message };
    }

    return { data: { grade: next }, error: null };
  } catch (err) {
    console.error("Error refreshing mentor grade:", err);
    return { data: null, error: "Failed to refresh grade" };
  }
}

export async function getMyResourceSharerGradePreview(): Promise<{
  data:
    | {
        computedGrade: CommunityGrade;
        metrics: { resourcePosts: number; likes: number; bookmarks: number };
      }
    | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { grade, metrics } = await computeResourceSharerGrade(user.id);

    return {
      data: {
        computedGrade: grade,
        metrics,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting resource sharer grade preview:", err);
    return { data: null, error: "Failed to compute grade" };
  }
}

export async function adminRefreshMentorGrade(input: {
  userId: string;
}): Promise<{ data: { grade: CommunityGrade } | null; error: string | null }> {
  try {
    const parsed = z.object({ userId: z.string().uuid() }).safeParse(input);
    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };
    try {
      await requireUserAtLeastRole(user.id, "ADMIN");
    } catch {
      return { data: null, error: "Unauthorized" };
    }

    const { data: roleApp, error: roleErr } = await adminSupabase
      .from("community_role_applications")
      .select("status,grade")
      .eq("userId", parsed.data.userId)
      .eq("roleType", "MENTOR")
      .maybeSingle();

    if (roleErr) return { data: null, error: roleErr.message };
    if (!roleApp) return { data: null, error: "Mentor application not found" };
    if (roleApp.status !== "APPROVED") return { data: null, error: "Mentor role is not approved" };

    const { grade } = await computeMentorGrade(parsed.data.userId);
    const next = pickHigherGrade(roleApp.grade, grade);

    const { error: updateErr } = await adminSupabase
      .from("community_role_applications")
      .update({ grade: next })
      .eq("userId", parsed.data.userId)
      .eq("roleType", "MENTOR");

    if (updateErr) return { data: null, error: updateErr.message };
    return { data: { grade: next }, error: null };
  } catch (err) {
    console.error("Error admin refreshing mentor grade:", err);
    return { data: null, error: "Failed to refresh grade" };
  }
}
