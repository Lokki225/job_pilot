import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/server";

const LegacyWebhookBodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    providerInquiryId: z.string().trim().min(1).max(512).optional(),
    providerStatus: z.string().trim().max(512).optional(),
    status: z.enum(["NOT_STARTED", "STARTED", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
    payload: z.any().optional(),
  })
  .refine((v) => Boolean(v.userId || v.providerInquiryId), {
    message: "userId or providerInquiryId is required",
  });

function parsePersonaSignatureHeader(value: string): { t: string; v1s: string[] } | null {
  const tMatch = value.match(/t=(\d+)/);
  const v1s = Array.from(value.matchAll(/v1=([0-9a-f]+)/gi)).map((m) => m[1]);
  if (!tMatch || v1s.length === 0) return null;
  return { t: tMatch[1], v1s };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const personaSignatureHeader = request.headers.get("Persona-Signature");
    const secret = process.env.MENTOR_KYC_WEBHOOK_SECRET;

    const rawBody = await request.text().catch(() => "");

    if (secret) {
      const bearerOk = authHeader === `Bearer ${secret}`;

      let personaOk = false;
      if (personaSignatureHeader) {
        const parsed = parsePersonaSignatureHeader(personaSignatureHeader);
        if (parsed) {
          const expected = createHmac("sha256", secret).update(`${parsed.t}.${rawBody}`).digest("hex");
          personaOk = parsed.v1s.some((v1) => safeEqualHex(v1, expected));
        }
      }

      if (!bearerOk && !personaOk) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : null;
    const eventName = body?.data?.attributes?.name;
    const inquiry = body?.data?.attributes?.payload?.data;

    if (eventName && inquiry?.type === "inquiry" && typeof inquiry?.id === "string") {
      const inquiryId = inquiry.id;
      const inquiryStatus = inquiry?.attributes?.status;
      const referenceId = inquiry?.attributes?.["reference-id"];

      const now = new Date().toISOString();

      let userId: string | null = null;
      if (typeof referenceId === "string") {
        const parsedUserId = z.string().uuid().safeParse(referenceId);
        if (parsedUserId.success) userId = parsedUserId.data;
      }

      if (!userId) {
        const { data: existingByInquiry } = await adminSupabase
          .from("mentor_kyc_verifications")
          .select("userId")
          .eq("providerInquiryId", inquiryId)
          .maybeSingle();

        userId = existingByInquiry?.userId || null;
      }

      if (!userId) {
        return NextResponse.json({ error: "Unable to resolve user" }, { status: 404 });
      }

      const { data: existingKyc } = await adminSupabase
        .from("mentor_kyc_verifications")
        .select("status,providerInquiryId,payload,submittedAt")
        .eq("userId", userId)
        .maybeSingle();

      if (existingKyc?.providerInquiryId && existingKyc.providerInquiryId !== inquiryId) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      if (existingKyc?.status === "APPROVED" || existingKyc?.status === "REJECTED") {
        return NextResponse.json({ ok: true, skipped: true });
      }

      let nextStatus: "STARTED" | "SUBMITTED" | null = null;
      if (eventName === "inquiry.created" || eventName === "inquiry.started") nextStatus = "STARTED";
      if (
        eventName === "inquiry.completed" ||
        eventName === "inquiry.marked-for-review" ||
        eventName === "inquiry.approved" ||
        eventName === "inquiry.declined" ||
        eventName === "inquiry.failed" ||
        eventName === "inquiry.expired"
      ) {
        nextStatus = "SUBMITTED";
      }

      const existingPayload = existingKyc?.payload;
      const adminNote =
        existingPayload && typeof existingPayload === "object" && !Array.isArray(existingPayload)
          ? (existingPayload as any).adminNote
          : undefined;

      const eventId = typeof body?.data?.id === "string" ? body.data.id : null;
      const eventCreatedAt = typeof body?.data?.attributes?.["created-at"] === "string" ? body.data.attributes["created-at"] : null;

      const update: any = {
        userId,
        provider: "PERSONA",
        providerInquiryId: inquiryId,
        providerStatus: typeof inquiryStatus === "string" ? inquiryStatus : eventName,
        payload: {
          ...(adminNote ? { adminNote } : null),
          persona: {
            eventId,
            eventName,
            eventCreatedAt,
            inquiryId,
            inquiryStatus: typeof inquiryStatus === "string" ? inquiryStatus : null,
          },
        },
      };

      if (nextStatus) {
        update.status = nextStatus;
        if (nextStatus === "SUBMITTED" && !existingKyc?.submittedAt) update.submittedAt = now;
      }

      const { error } = await adminSupabase
        .from("mentor_kyc_verifications")
        .upsert(update, { onConflict: "userId" });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (nextStatus) {
        const { data: existingRole } = await adminSupabase
          .from("community_role_applications")
          .select("status,submittedAt")
          .eq("userId", userId)
          .eq("roleType", "MENTOR")
          .maybeSingle();

        if (existingRole?.status !== "APPROVED" && existingRole?.status !== "REJECTED") {
          const roleUpdate: any = {
            userId,
            roleType: "MENTOR",
            status: nextStatus,
            payload: { providerInquiryId: inquiryId },
          };

          if (nextStatus === "SUBMITTED" && !existingRole?.submittedAt) {
            roleUpdate.submittedAt = now;
          }

          await adminSupabase
            .from("community_role_applications")
            .upsert(roleUpdate, { onConflict: "userId,roleType" });
        }
      }

      return NextResponse.json({ ok: true });
    }

    const legacyParsed = LegacyWebhookBodySchema.safeParse(body);
    if (!legacyParsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const now = new Date().toISOString();

    let userId = legacyParsed.data.userId;

    if (!userId && legacyParsed.data.providerInquiryId) {
      const { data: existing } = await adminSupabase
        .from("mentor_kyc_verifications")
        .select("userId")
        .eq("providerInquiryId", legacyParsed.data.providerInquiryId)
        .maybeSingle();

      userId = existing?.userId || undefined;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unable to resolve user" }, { status: 404 });
    }

    const requestedStatus = legacyParsed.data.status;
    const nextStatus =
      requestedStatus === "STARTED" || requestedStatus === "SUBMITTED"
        ? requestedStatus
        : legacyParsed.data.providerStatus
          ? "SUBMITTED"
          : "STARTED";

    const update: any = {
      userId,
      status: nextStatus,
      provider: "PERSONA",
      providerInquiryId: legacyParsed.data.providerInquiryId || null,
      providerStatus: legacyParsed.data.providerStatus || null,
      payload: legacyParsed.data.payload ?? null,
    };

    if (nextStatus === "SUBMITTED") update.submittedAt = now;

    const { error } = await adminSupabase
      .from("mentor_kyc_verifications")
      .upsert(update, { onConflict: "userId" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mentor-kyc webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
