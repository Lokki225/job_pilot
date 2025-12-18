import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/server";

const WebhookBodySchema = z
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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const signatureHeader = request.headers.get("x-mentor-kyc-signature");
    const secret = process.env.MENTOR_KYC_WEBHOOK_SECRET;

    const rawBody = await request.text().catch(() => "");

    if (secret) {
      const bearerOk = authHeader === `Bearer ${secret}`;

      let signatureOk = false;
      if (signatureHeader) {
        const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
        try {
          const a = Buffer.from(signatureHeader);
          const b = Buffer.from(expected);
          signatureOk = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          signatureOk = false;
        }
      }

      if (!bearerOk && !signatureOk) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : null;
    const parsed = WebhookBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const now = new Date().toISOString();

    let userId = parsed.data.userId;

    if (!userId && parsed.data.providerInquiryId) {
      const { data: existing } = await adminSupabase
        .from("mentor_kyc_verifications")
        .select("userId")
        .eq("providerInquiryId", parsed.data.providerInquiryId)
        .maybeSingle();

      userId = existing?.userId || undefined;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unable to resolve user" }, { status: 404 });
    }

    const requestedStatus = parsed.data.status;
    const nextStatus =
      requestedStatus === "STARTED" || requestedStatus === "SUBMITTED"
        ? requestedStatus
        : parsed.data.providerStatus
          ? "SUBMITTED"
          : "STARTED";

    const update: any = {
      userId,
      status: nextStatus,
      provider: "PERSONA",
      providerInquiryId: parsed.data.providerInquiryId || null,
      providerStatus: parsed.data.providerStatus || null,
      payload: parsed.data.payload ?? null,
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
