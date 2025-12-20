"use server";

import { z } from "zod";
import { createClient, adminSupabase } from "@/lib/supabase/server";

export type CommunityRoleType = "MENTOR" | "MODERATOR";
export type CommunityRoleApplicationStatus = "NOT_STARTED" | "STARTED" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface CommunityRoleApplicationData {
  id: string;
  userId: string;
  roleType: CommunityRoleType;
  status: CommunityRoleApplicationStatus;
  grade: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  reviewNote: string | null;
  payload: any | null;
  createdAt: string;
  updatedAt: string;
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

function mapRow(row: any): CommunityRoleApplicationData {
  return {
    id: row.id,
    userId: row.userId,
    roleType: row.roleType,
    status: row.status,
    grade: row.grade ?? null,
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    approvedBy: row.approvedBy ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectedBy: row.rejectedBy ?? null,
    reviewNote: row.reviewNote ?? null,
    payload: row.payload ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getModeratorEligibilityThresholds(): Promise<{
  minReputationPoints: number;
  minHelpfulVotes: number;
}> {
  const envMinReputation = parseInt(process.env.MODERATOR_MIN_REPUTATION || "500");
  const envMinHelpfulVotes = parseInt(process.env.MODERATOR_MIN_HELPFUL_VOTES || "25");

  const { data, error } = await adminSupabase
    .from("community_role_requirements")
    .select("minReputationPoints,minHelpfulVotes")
    .eq("roleType", "MODERATOR")
    .maybeSingle();

  if (error || !data) {
    return {
      minReputationPoints: Number.isFinite(envMinReputation) ? envMinReputation : 500,
      minHelpfulVotes: Number.isFinite(envMinHelpfulVotes) ? envMinHelpfulVotes : 25,
    };
  }

  return {
    minReputationPoints: typeof (data as any).minReputationPoints === "number" ? (data as any).minReputationPoints : envMinReputation,
    minHelpfulVotes: typeof (data as any).minHelpfulVotes === "number" ? (data as any).minHelpfulVotes : envMinHelpfulVotes,
  };
}

export async function getMyRoleApplication(roleType: CommunityRoleType): Promise<{
  data: CommunityRoleApplicationData | null;
  error: string | null;
}> {
  try {
    const parsed = z.enum(["MENTOR", "MODERATOR"]).safeParse(roleType);
    if (!parsed.success) return { data: null, error: "Invalid roleType" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: row, error } = await supabase
      .from("community_role_applications")
      .select("*")
      .eq("userId", user.id)
      .eq("roleType", parsed.data)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!row) {
      if (parsed.data === "MENTOR") {
        const { data: kyc } = await adminSupabase
          .from("mentor_kyc_verifications")
          .select("status,submittedAt,approvedAt,approvedBy,rejectedAt,rejectedBy,providerInquiryId,payload")
          .eq("userId", user.id)
          .maybeSingle();

        if (kyc?.status) {
          const adminNote =
            kyc.payload && typeof kyc.payload === "object" && !Array.isArray(kyc.payload)
              ? (kyc.payload as any).adminNote
              : undefined;

          const payload = kyc.providerInquiryId ? { providerInquiryId: kyc.providerInquiryId } : null;

          const { data: created, error: createError } = await adminSupabase
            .from("community_role_applications")
            .upsert(
              {
                userId: user.id,
                roleType: "MENTOR",
                status: kyc.status,
                grade: kyc.status === "APPROVED" ? "BRONZE" : null,
                submittedAt: kyc.submittedAt || null,
                approvedAt: kyc.approvedAt || null,
                approvedBy: kyc.approvedBy || null,
                rejectedAt: kyc.rejectedAt || null,
                rejectedBy: kyc.rejectedBy || null,
                reviewNote: kyc.status === "REJECTED" ? adminNote || null : null,
                payload,
              },
              { onConflict: "userId,roleType" }
            )
            .select("*")
            .single();

          if (!createError && created) return { data: mapRow(created), error: null };
        }
      }

      return { data: null, error: null };
    }

    return { data: mapRow(row), error: null };
  } catch (err) {
    console.error("Error getting role application:", err);
    return { data: null, error: "Failed to load role application" };
  }
}

export async function applyForModeratorRole(input?: {
  note?: string;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z
      .object({ note: z.string().trim().max(2000).optional() })
      .optional()
      .safeParse(input);

    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: cp } = await adminSupabase
      .from("community_profiles")
      .select("reputationPoints,helpfulVotes,isBanned")
      .eq("userId", user.id)
      .maybeSingle();

    const reputation = cp?.reputationPoints ?? 0;
    const helpful = cp?.helpfulVotes ?? 0;
    const isBanned = Boolean(cp?.isBanned);

    if (isBanned) return { data: null, error: "You are not eligible to apply." };

    const { minReputationPoints, minHelpfulVotes } = await getModeratorEligibilityThresholds();

    if (reputation < minReputationPoints || helpful < minHelpfulVotes) {
      return {
        data: null,
        error: `Eligibility not met. Requires ${minReputationPoints}+ reputation and ${minHelpfulVotes}+ helpful votes.`,
      };
    }

    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("community_role_applications")
      .select("id")
      .eq("userId", user.id)
      .eq("roleType", "MODERATOR")
      .maybeSingle();

    if (existingError) return { data: null, error: existingError.message };

    if (!existing) {
      const { error } = await supabase.from("community_role_applications").insert({
        userId: user.id,
        roleType: "MODERATOR",
        status: "SUBMITTED",
        submittedAt: now,
        payload: parsed.data?.note ? { note: parsed.data.note } : null,
      });

      if (error) return { data: null, error: error.message };
      return { data: { ok: true }, error: null };
    }

    const { error } = await supabase
      .from("community_role_applications")
      .update({
        status: "SUBMITTED",
        submittedAt: now,
        payload: parsed.data?.note ? { note: parsed.data.note } : null,
      })
      .eq("userId", user.id)
      .eq("roleType", "MODERATOR");

    if (error) return { data: null, error: error.message };
    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error applying for moderator role:", err);
    return { data: null, error: "Failed to submit application" };
  }
}

export async function updateModeratorEligibilityRequirements(input: {
  minReputationPoints: number;
  minHelpfulVotes: number;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z
      .object({
        minReputationPoints: z.number().int().min(0).max(1_000_000),
        minHelpfulVotes: z.number().int().min(0).max(1_000_000),
      })
      .safeParse(input);

    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("community_role_requirements")
      .upsert(
        {
          roleType: "MODERATOR",
          minReputationPoints: parsed.data.minReputationPoints,
          minHelpfulVotes: parsed.data.minHelpfulVotes,
        },
        { onConflict: "roleType" }
      );

    if (error) return { data: null, error: error.message };
    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error updating moderator requirements:", err);
    return { data: null, error: "Failed to update requirements" };
  }
}

export async function listRoleApplications(params?: {
  roleType?: CommunityRoleType;
  status?: CommunityRoleApplicationStatus;
}): Promise<{ data: CommunityRoleApplicationData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    let q = adminSupabase
      .from("community_role_applications")
      .select("*")
      .order("updatedAt", { ascending: false });

    if (params?.roleType) q = q.eq("roleType", params.roleType);
    if (params?.status) q = q.eq("status", params.status);

    const { data: rows, error } = await q;
    if (error) return { data: null, error: error.message };

    return { data: (rows || []).map(mapRow), error: null };
  } catch (err) {
    console.error("Error listing role applications:", err);
    return { data: null, error: "Failed to list applications" };
  }
}

export async function approveRoleApplication(input: {
  userId: string;
  roleType: CommunityRoleType;
  grade?: string;
  note?: string;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        roleType: z.enum(["MENTOR", "MODERATOR"]),
        grade: z.string().trim().max(30).optional(),
        note: z.string().trim().max(2000).optional(),
      })
      .safeParse(input);

    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("community_role_applications")
      .upsert(
        {
          userId: parsed.data.userId,
          roleType: parsed.data.roleType,
          status: "APPROVED",
          grade: parsed.data.grade || "BRONZE",
          approvedAt: now,
          approvedBy: user.id,
          rejectedAt: null,
          rejectedBy: null,
          reviewNote: parsed.data.note || null,
        },
        { onConflict: "userId,roleType" }
      );

    if (error) return { data: null, error: error.message };

    if (parsed.data.roleType === "MODERATOR") {
      await adminSupabase.from("community_profiles").update({ isModerator: true }).eq("userId", parsed.data.userId);

      const { data: cp } = await adminSupabase
        .from("community_profiles")
        .select("id")
        .eq("userId", parsed.data.userId)
        .maybeSingle();

      if (cp?.id) {
        await adminSupabase
          .from("community_badges")
          .upsert({ communityProfileId: cp.id, badgeType: "MODERATOR" }, { onConflict: "communityProfileId,badgeType" });
      }
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error approving role application:", err);
    return { data: null, error: "Failed to approve" };
  }
}

export async function rejectRoleApplication(input: {
  userId: string;
  roleType: CommunityRoleType;
  reason: string;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        roleType: z.enum(["MENTOR", "MODERATOR"]),
        reason: z.string().trim().min(1).max(2000),
      })
      .safeParse(input);

    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("community_role_applications")
      .upsert(
        {
          userId: parsed.data.userId,
          roleType: parsed.data.roleType,
          status: "REJECTED",
          grade: null,
          rejectedAt: now,
          rejectedBy: user.id,
          reviewNote: parsed.data.reason,
          approvedAt: null,
          approvedBy: null,
        },
        { onConflict: "userId,roleType" }
      );

    if (error) return { data: null, error: error.message };

    if (parsed.data.roleType === "MODERATOR") {
      await adminSupabase.from("community_profiles").update({ isModerator: false }).eq("userId", parsed.data.userId);
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error rejecting role application:", err);
    return { data: null, error: "Failed to reject" };
  }
}
