"use server";

import { z } from "zod";
import { createClient, adminSupabase } from "@/lib/supabase/server";

export type MentorKycStatus = "NOT_STARTED" | "STARTED" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface MentorKycVerificationData {
  id: string;
  userId: string;
  status: MentorKycStatus;
  provider: string;
  providerInquiryId: string | null;
  providerStatus: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMentorKycRow extends MentorKycVerificationData {
  userEmail: string | null;
  userName: string;
  avatarUrl: string | null;
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

function mapRow(row: any): MentorKycVerificationData {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    provider: row.provider,
    providerInquiryId: row.providerInquiryId ?? null,
    providerStatus: row.providerStatus ?? null,
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    approvedBy: row.approvedBy ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectedBy: row.rejectedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getMyMentorKycVerification(): Promise<{
  data: MentorKycVerificationData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: row, error } = await supabase
      .from("mentor_kyc_verifications")
      .select("*")
      .eq("userId", user.id)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!row) return { data: null, error: null };

    return { data: mapRow(row), error: null };
  } catch (err) {
    console.error("Error getting mentor KYC verification:", err);
    return { data: null, error: "Failed to get mentor KYC verification" };
  }
}

export async function startMentorKycVerification(input?: {
  providerInquiryId?: string;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const providerInquiryId = input?.providerInquiryId?.trim() || null;

    const { error } = await supabase
      .from("mentor_kyc_verifications")
      .upsert(
        {
          userId: user.id,
          status: "STARTED",
          provider: "PERSONA",
          providerInquiryId,
        },
        { onConflict: "userId" }
      );

    if (error) return { data: null, error: error.message };
    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error starting mentor KYC verification:", err);
    return { data: null, error: "Failed to start verification" };
  }
}

export async function submitMentorKycInquiryId(
  providerInquiryId: string
): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z.string().trim().min(1).max(512).safeParse(providerInquiryId);
    if (!parsed.success) return { data: null, error: "Invalid inquiry ID" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("mentor_kyc_verifications")
      .upsert(
        {
          userId: user.id,
          status: "SUBMITTED",
          provider: "PERSONA",
          providerInquiryId: parsed.data,
          submittedAt: now,
        },
        { onConflict: "userId" }
      );

    if (error) return { data: null, error: error.message };
    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error submitting mentor KYC inquiry ID:", err);
    return { data: null, error: "Failed to submit inquiry ID" };
  }
}

export async function listMentorKycVerifications(params?: {
  status?: MentorKycStatus;
}): Promise<{ data: AdminMentorKycRow[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    let q = adminSupabase
      .from("mentor_kyc_verifications")
      .select("*")
      .order("updatedAt", { ascending: false });

    if (params?.status) q = q.eq("status", params.status);

    const { data: rows, error } = await q;
    if (error) return { data: null, error: error.message };

    const userIds = (rows || []).map((r: any) => r.userId);

    const [{ data: profiles }, { data: users }] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("userId,firstName,lastName,avatarUrl")
        .in("userId", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      adminSupabase
        .from("users")
        .select("id,email")
        .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));
    const emailMap = new Map((users || []).map((u: any) => [u.id, u.email]));

    const result: AdminMentorKycRow[] = (rows || []).map((r: any) => {
      const p = profileMap.get(r.userId);
      const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || "User" : "User";
      return {
        ...mapRow(r),
        userEmail: emailMap.get(r.userId) || null,
        userName: name,
        avatarUrl: p?.avatarUrl || null,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("Error listing mentor KYC verifications:", err);
    return { data: null, error: "Failed to list verifications" };
  }
}

export async function approveMentorKyc(userId: string): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z.string().uuid().safeParse(userId);
    if (!parsed.success) return { data: null, error: "Invalid userId" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("mentor_kyc_verifications")
      .upsert(
        {
          userId: parsed.data,
          status: "APPROVED",
          approvedAt: now,
          approvedBy: user.id,
        },
        { onConflict: "userId" }
      );

    if (error) return { data: null, error: error.message };

    await adminSupabase.from("community_profiles").update({ isMentor: true }).eq("userId", parsed.data);

    const { data: cp } = await adminSupabase
      .from("community_profiles")
      .select("id")
      .eq("userId", parsed.data)
      .maybeSingle();

    if (cp?.id) {
      await adminSupabase
        .from("community_badges")
        .upsert({ communityProfileId: cp.id, badgeType: "MENTOR" }, { onConflict: "communityProfileId,badgeType" });
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error approving mentor KYC:", err);
    return { data: null, error: "Failed to approve" };
  }
}

export async function rejectMentorKyc(input: {
  userId: string;
  reason: string;
}): Promise<{ data: { ok: true } | null; error: string | null }> {
  try {
    const parsed = z
      .object({ userId: z.string().uuid(), reason: z.string().trim().min(1).max(2000) })
      .safeParse(input);

    if (!parsed.success) return { data: null, error: "Invalid input" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return { data: null, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("mentor_kyc_verifications")
      .upsert(
        {
          userId: parsed.data.userId,
          status: "REJECTED",
          rejectedAt: now,
          rejectedBy: user.id,
          payload: { adminNote: parsed.data.reason },
        },
        { onConflict: "userId" }
      );

    if (error) return { data: null, error: error.message };
    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error rejecting mentor KYC:", err);
    return { data: null, error: "Failed to reject" };
  }
}
