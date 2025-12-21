"use server";

import { z } from "zod";
import { createClient, adminSupabase } from "@/lib/supabase/server";
import { requireUserAtLeastRole } from "@/lib/auth/rbac";

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

async function syncMentorRoleApplication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    userId: string;
    status: MentorKycStatus;
    providerInquiryId?: string | null;
    submittedAt?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = input.status;
  const roleStatus = status === "APPROVED" || status === "REJECTED" ? status : status === "SUBMITTED" ? "SUBMITTED" : "STARTED";

  const { data: existing, error: existingError } = await supabase
    .from("community_role_applications")
    .select("id")
    .eq("userId", input.userId)
    .eq("roleType", "MENTOR")
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  const submittedAt = roleStatus === "SUBMITTED" ? input.submittedAt || new Date().toISOString() : null;
  const payload = input.providerInquiryId ? { providerInquiryId: input.providerInquiryId } : null;

  if (!existing) {
    const { error } = await supabase.from("community_role_applications").insert({
      userId: input.userId,
      roleType: "MENTOR",
      status: roleStatus,
      submittedAt,
      payload,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from("community_role_applications")
    .update({
      status: roleStatus,
      submittedAt,
      payload,
    })
    .eq("userId", input.userId)
    .eq("roleType", "MENTOR");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

const PersonaInquiryCreateResponseSchema = z.object({
  data: z.object({
    id: z.string().trim().min(1),
  }),
});

const PersonaInquiryResumeResponseSchema = z.object({
  meta: z
    .object({
      "session-token": z.string().trim().min(1),
    })
    .passthrough(),
  data: z
    .object({
      id: z.string().trim().min(1),
    })
    .passthrough(),
});

async function personaFetch(path: string, init: RequestInit) {
  const apiKey = process.env.PERSONA_API_KEY;
  if (!apiKey) {
    return { ok: false as const, error: "Missing PERSONA_API_KEY" };
  }

  const res = await fetch(`https://api.withpersona.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false as const,
      error: `Persona API error (${res.status}): ${JSON.stringify(json)}`,
    };
  }
  return { ok: true as const, data: json };
}

export async function getMentorKycPersonaHostedUrl(): Promise<{
  data: { url: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const templateId = process.env.PERSONA_INQUIRY_TEMPLATE_ID;
    if (!templateId) return { data: null, error: "Missing PERSONA_INQUIRY_TEMPLATE_ID" };

    const hostedBase = process.env.PERSONA_HOSTED_FLOW_BASE_URL || "https://inquiry.withpersona.com/verify";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return { data: null, error: "Missing NEXT_PUBLIC_SITE_URL" };

    const { data: existing } = await adminSupabase
      .from("mentor_kyc_verifications")
      .select("status,providerInquiryId")
      .eq("userId", user.id)
      .maybeSingle();

    if (existing?.status === "APPROVED") {
      return { data: null, error: "You are already verified." };
    }

    if (existing?.status === "SUBMITTED") {
      return { data: null, error: "Your verification is already submitted and awaiting review." };
    }

    let inquiryId = existing?.providerInquiryId || null;

    if (!inquiryId || existing?.status === "REJECTED" || existing?.status === "NOT_STARTED") {
      const createRes = await personaFetch("/api/v1/inquiries", {
        method: "POST",
        body: JSON.stringify({
          data: {
            attributes: {
              "inquiry-template-id": templateId,
              "reference-id": user.id,
            },
          },
        }),
      });

      if (!createRes.ok) return { data: null, error: createRes.error };

      const parsed = PersonaInquiryCreateResponseSchema.safeParse(createRes.data);
      if (!parsed.success) return { data: null, error: "Unexpected Persona create inquiry response" };

      inquiryId = parsed.data.data.id;
    }

    const resumeRes = await personaFetch(`/api/v1/inquiries/${encodeURIComponent(inquiryId)}/resume`, {
      method: "POST",
    });

    if (!resumeRes.ok) return { data: null, error: resumeRes.error };

    const resumeParsed = PersonaInquiryResumeResponseSchema.safeParse(resumeRes.data);
    if (!resumeParsed.success) return { data: null, error: "Unexpected Persona resume inquiry response" };

    const sessionToken = resumeParsed.data.meta["session-token"];

    const redirectUri = `${siteUrl}/dashboard/community/hub/mentorship?persona=1`;

    const url =
      `${hostedBase}?` +
      `inquiry-id=${encodeURIComponent(inquiryId)}` +
      `&session-token=${encodeURIComponent(sessionToken)}` +
      `&redirect-uri=${encodeURIComponent(redirectUri)}`;

    const { error } = await supabase
      .from("mentor_kyc_verifications")
      .upsert(
        {
          userId: user.id,
          status: "STARTED",
          provider: "PERSONA",
          providerInquiryId: inquiryId,
          submittedAt: null,
          approvedAt: null,
          approvedBy: null,
          rejectedAt: null,
          rejectedBy: null,
        },
        { onConflict: "userId" }
      );

    if (error) return { data: null, error: error.message };

    const syncRes = await syncMentorRoleApplication(supabase, {
      userId: user.id,
      status: "STARTED",
      providerInquiryId: inquiryId,
      submittedAt: null,
    });
    if (!syncRes.ok) return { data: null, error: syncRes.error };

    return { data: { url }, error: null };
  } catch (err) {
    console.error("Error generating Persona hosted URL:", err);
    return { data: null, error: "Failed to start verification" };
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

    const syncRes = await syncMentorRoleApplication(supabase, {
      userId: user.id,
      status: "STARTED",
      providerInquiryId,
      submittedAt: null,
    });
    if (!syncRes.ok) return { data: null, error: syncRes.error };

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

    const syncRes = await syncMentorRoleApplication(supabase, {
      userId: user.id,
      status: "SUBMITTED",
      providerInquiryId: parsed.data,
      submittedAt: now,
    });
    if (!syncRes.ok) return { data: null, error: syncRes.error };

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

    if (!user) return { data: null, error: "Unauthorized" };
    try {
      await requireUserAtLeastRole(user.id, "ADMIN");
    } catch {
      return { data: null, error: "Unauthorized" };
    }

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

    if (!user) return { data: null, error: "Unauthorized" };
    try {
      await requireUserAtLeastRole(user.id, "ADMIN");
    } catch {
      return { data: null, error: "Unauthorized" };
    }

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

    await adminSupabase.from("mentor_profiles").update({ isActive: true }).eq("userId", parsed.data);

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

    await adminSupabase
      .from("community_role_applications")
      .upsert(
        {
          userId: parsed.data,
          roleType: "MENTOR",
          status: "APPROVED",
          grade: "BRONZE",
          approvedAt: now,
          approvedBy: user.id,
          rejectedAt: null,
          rejectedBy: null,
        },
        { onConflict: "userId,roleType" }
      );

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

    if (!user) return { data: null, error: "Unauthorized" };
    try {
      await requireUserAtLeastRole(user.id, "ADMIN");
    } catch {
      return { data: null, error: "Unauthorized" };
    }

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

    await adminSupabase.from("mentor_profiles").update({ isActive: false }).eq("userId", parsed.data.userId);
    await adminSupabase.from("community_profiles").update({ isMentor: false }).eq("userId", parsed.data.userId);

    await adminSupabase
      .from("community_role_applications")
      .upsert(
        {
          userId: parsed.data.userId,
          roleType: "MENTOR",
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

    const { data: cp } = await adminSupabase
      .from("community_profiles")
      .select("id")
      .eq("userId", parsed.data.userId)
      .maybeSingle();

    if (cp?.id) {
      await adminSupabase
        .from("community_badges")
        .delete()
        .eq("communityProfileId", cp.id)
        .eq("badgeType", "MENTOR");
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    console.error("Error rejecting mentor KYC:", err);
    return { data: null, error: "Failed to reject" };
  }
}
