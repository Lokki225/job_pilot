"use server";

import { z } from "zod";
import { adminSupabase, createClient } from "@/lib/supabase/server";

export type InterviewRequestMode = "INSTANT" | "SCHEDULED";
export type InterviewRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
export type InterviewSessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type InterviewRoomRole = "INTERVIEWER" | "CANDIDATE";

export interface InterviewUserSummary {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface InterviewRequestData {
  id: string;
  requesterId: string;
  targetId: string;
  mode: InterviewRequestMode;
  status: InterviewRequestStatus;
  proposedTimes: string[];
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

function nameFromProfileRow(row: any): string {
  const first = typeof row?.firstName === "string" ? row.firstName : "";
  const last = typeof row?.lastName === "string" ? row.lastName : "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "User";
}

export interface InterviewSessionData {
  id: string;
  requestId: string | null;
  interviewerId: string;
  candidateId: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: InterviewSessionStatus;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewRoomRoleData {
  id: string;
  sessionId: string;
  userId: string;
  role: InterviewRoomRole;
  createdAt: string;
}

export interface InterviewRequestListItem extends InterviewRequestData {
  direction: "incoming" | "outgoing";
  otherUser: InterviewUserSummary | null;
}

export interface InterviewSessionListItem extends InterviewSessionData {
  role: InterviewRoomRole;
  otherUser: InterviewUserSummary | null;
}

type InterviewRequestsFrom = "MUTUAL_FOLLOWS" | "FOLLOWERS" | "ANYONE" | "NOBODY";

function toIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

const CreateInterviewRequestSchema = z
  .object({
    targetId: z.string().uuid(),
    mode: z.enum(["INSTANT", "SCHEDULED"]),
    proposedTimes: z.array(z.string().min(1)).optional(),
    message: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const RespondToInterviewRequestSchema = z
  .object({
    action: z.enum(["ACCEPT", "DECLINE", "CANCEL"]),
    scheduledAt: z.string().optional(),
  })
  .strict();

async function getTargetGating(targetId: string): Promise<InterviewRequestsFrom> {
  const { data } = await adminSupabase
    .from("community_profile_settings")
    .select("allowInterviewRequestsFrom")
    .eq("userId", targetId)
    .maybeSingle();

  return (data?.allowInterviewRequestsFrom ?? "MUTUAL_FOLLOWS") as InterviewRequestsFrom;
}

async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from("user_follows")
    .select("id")
    .eq("followerId", followerId)
    .eq("followingId", followingId)
    .maybeSingle();

  return Boolean(data);
}

async function canRequestInterview(params: { requesterId: string; targetId: string }): Promise<boolean> {
  const gating = await getTargetGating(params.targetId);

  if (gating === "NOBODY") return false;
  if (gating === "ANYONE") return true;

  const requesterFollowsTarget = await isFollowing(params.requesterId, params.targetId);
  if (!requesterFollowsTarget) return false;

  if (gating === "FOLLOWERS") return true;

  const targetFollowsRequester = await isFollowing(params.targetId, params.requesterId);
  return targetFollowsRequester;
}

export async function createInterviewRequest(input: z.infer<typeof CreateInterviewRequestSchema>): Promise<{
  data: InterviewRequestData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsed = CreateInterviewRequestSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: "Invalid input" };

    if (parsed.data.targetId === user.id) return { data: null, error: "Cannot request an interview with yourself" };

    const allowed = await canRequestInterview({ requesterId: user.id, targetId: parsed.data.targetId });
    if (!allowed) return { data: null, error: "This user is not accepting interview requests" };

    const proposedTimes = (parsed.data.proposedTimes || []).map((t) => toIso(t)).filter(Boolean);

    if (parsed.data.mode === "SCHEDULED" && proposedTimes.length === 0) {
      return { data: null, error: "Please propose at least one time" };
    }

    const { data, error } = await supabase
      .from("interview_requests")
      .insert({
        requesterId: user.id,
        targetId: parsed.data.targetId,
        mode: parsed.data.mode,
        status: "PENDING",
        proposedTimes,
        message: parsed.data.message?.trim() ? parsed.data.message.trim() : null,
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as InterviewRequestData, error: null };
  } catch (err) {
    console.error("Error creating interview request:", err);
    return { data: null, error: "Failed to create interview request" };
  }
}

export async function getOrCreateInterviewChatRoom(sessionId: string): Promise<{
  data: { roomId: string; slug: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("id,interviewerId,candidateId")
      .eq("id", sessionId)
      .or(`interviewerId.eq.${user.id},candidateId.eq.${user.id}`)
      .maybeSingle();

    if (sessionError) return { data: null, error: sessionError.message };
    if (!session) return { data: null, error: "Forbidden" };

    const slug = `interview-${sessionId}`;

    let roomId: string | null = null;

    const { data: existing } = await adminSupabase
      .from("chat_rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) {
      roomId = existing.id as string;
    } else {
      const name = `Interview chat ${sessionId.slice(0, 8)}`;
      const { data: created, error: createError } = await adminSupabase
        .from("chat_rooms")
        .insert({
          name,
          description: null,
          slug,
          type: "ROLE_SPECIFIC",
          category: "INTERVIEW",
          icon: null,
          isActive: true,
          isArchived: true,
        })
        .select("id")
        .single();

      if (createError || !created?.id) return { data: null, error: createError?.message || "Failed to create chat room" };
      roomId = created.id as string;
    }

    const { error: memberError } = await adminSupabase
      .from("chat_room_members")
      .insert({ roomId, userId: user.id });

    if (memberError && memberError.code !== "23505") {
      return { data: null, error: memberError.message };
    }

    if (!memberError) {
      try {
        await adminSupabase.rpc("increment_room_members", { room_id: roomId });
      } catch (_) {
      }
    }

    return { data: { roomId, slug }, error: null };
  } catch (err) {
    console.error("Error getting/creating interview chat room:", err);
    return { data: null, error: "Failed to initialize interview chat" };
  }
}

export async function getMyInterviewRequests(): Promise<{
  data: InterviewRequestData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("interview_requests")
      .select("*")
      .or(`requesterId.eq.${user.id},targetId.eq.${user.id}`)
      .order("createdAt", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data || []) as InterviewRequestData[], error: null };
  } catch (err) {
    console.error("Error getting interview requests:", err);
    return { data: null, error: "Failed to load interview requests" };
  }
}

export async function getMyInterviewRequestList(): Promise<{
  data: InterviewRequestListItem[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: rows, error } = await supabase
      .from("interview_requests")
      .select("*")
      .or(`requesterId.eq.${user.id},targetId.eq.${user.id}`)
      .order("createdAt", { ascending: false });

    if (error) return { data: null, error: error.message };
    const reqs = (rows || []) as InterviewRequestData[];

    const otherUserIds = Array.from(
      new Set(
        reqs
          .map((r) => (r.requesterId === user.id ? r.targetId : r.requesterId))
          .filter(Boolean)
      )
    );

    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId,firstName,lastName,avatarUrl")
      .in("userId", otherUserIds.length > 0 ? otherUserIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    const out: InterviewRequestListItem[] = reqs.map((r) => {
      const direction: "incoming" | "outgoing" = r.requesterId === user.id ? "outgoing" : "incoming";
      const otherUserId = direction === "outgoing" ? r.targetId : r.requesterId;
      const p = profileMap.get(otherUserId);
      const otherUser: InterviewUserSummary | null = otherUserId
        ? {
            userId: otherUserId,
            name: nameFromProfileRow(p),
            avatarUrl: (p?.avatarUrl as string | null) ?? null,
          }
        : null;
      return { ...r, direction, otherUser };
    });

    return { data: out, error: null };
  } catch (err) {
    console.error("Error getting interview request list:", err);
    return { data: null, error: "Failed to load interview requests" };
  }
}

export async function respondToInterviewRequest(
  requestId: string,
  input: z.infer<typeof RespondToInterviewRequestSchema>
): Promise<{ data: { sessionId?: string; success: true } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsed = RespondToInterviewRequestSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: "Invalid input" };

    const { data: req, error: reqErr } = await supabase
      .from("interview_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr) return { data: null, error: reqErr.message };
    if (!req) return { data: null, error: "Request not found" };

    const isRequester = req.requesterId === user.id;
    const isTarget = req.targetId === user.id;
    if (!isRequester && !isTarget) return { data: null, error: "Forbidden" };

    if (parsed.data.action === "CANCEL") {
      if (!isRequester) return { data: null, error: "Only the requester can cancel" };

      const { error } = await supabase
        .from("interview_requests")
        .update({ status: "CANCELLED" })
        .eq("id", requestId);

      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    }

    if (!isTarget) return { data: null, error: "Only the recipient can respond" };
    if (req.status !== "PENDING") return { data: null, error: "Request is no longer pending" };

    if (parsed.data.action === "DECLINE") {
      const { error } = await supabase
        .from("interview_requests")
        .update({ status: "DECLINED" })
        .eq("id", requestId);

      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    }

    const scheduledAt = (() => {
      if (req.mode === "INSTANT") return new Date().toISOString();
      if (parsed.data.scheduledAt) return toIso(parsed.data.scheduledAt);
      if (Array.isArray(req.proposedTimes) && req.proposedTimes.length > 0) return toIso(req.proposedTimes[0]);
      return "";
    })();

    const sched = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(sched.getTime())) {
      return { data: null, error: "Invalid scheduled time" };
    }

    const { error: updateReqError } = await supabase
      .from("interview_requests")
      .update({ status: "ACCEPTED" })
      .eq("id", requestId);

    if (updateReqError) return { data: null, error: updateReqError.message };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({
        requestId,
        interviewerId: req.targetId,
        candidateId: req.requesterId,
        scheduledAt,
        status: "SCHEDULED",
        metadata: {},
      })
      .select("*")
      .single();

    if (sessionError || !session) return { data: null, error: sessionError?.message || "Failed to create session" };

    const { error: rolesError } = await supabase.from("interview_room_roles").insert([
      { sessionId: session.id, userId: req.targetId, role: "INTERVIEWER" },
      { sessionId: session.id, userId: req.requesterId, role: "CANDIDATE" },
    ]);

    if (rolesError) return { data: null, error: rolesError.message };

    return { data: { success: true, sessionId: session.id }, error: null };
  } catch (err) {
    console.error("Error responding to interview request:", err);
    return { data: null, error: "Failed to respond to interview request" };
  }
}

export async function getMyInterviewSessions(): Promise<{
  data: InterviewSessionData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .or(`interviewerId.eq.${user.id},candidateId.eq.${user.id}`)
      .order("scheduledAt", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data || []) as InterviewSessionData[], error: null };
  } catch (err) {
    console.error("Error getting interview sessions:", err);
    return { data: null, error: "Failed to load interview sessions" };
  }
}

export async function getMyInterviewSessionList(): Promise<{
  data: InterviewSessionListItem[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: rows, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .or(`interviewerId.eq.${user.id},candidateId.eq.${user.id}`)
      .order("scheduledAt", { ascending: true });

    if (error) return { data: null, error: error.message };
    const sessions = (rows || []) as InterviewSessionData[];

    const otherUserIds = Array.from(
      new Set(
        sessions
          .map((s) => (s.interviewerId === user.id ? s.candidateId : s.interviewerId))
          .filter(Boolean)
      )
    );

    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("userId,firstName,lastName,avatarUrl")
      .in("userId", otherUserIds.length > 0 ? otherUserIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.userId, p]));

    const out: InterviewSessionListItem[] = sessions.map((s) => {
      const role: InterviewRoomRole = s.interviewerId === user.id ? "INTERVIEWER" : "CANDIDATE";
      const otherUserId = role === "INTERVIEWER" ? s.candidateId : s.interviewerId;
      const p = profileMap.get(otherUserId);
      const otherUser: InterviewUserSummary | null = otherUserId
        ? {
            userId: otherUserId,
            name: nameFromProfileRow(p),
            avatarUrl: (p?.avatarUrl as string | null) ?? null,
          }
        : null;
      return { ...s, role, otherUser };
    });

    return { data: out, error: null };
  } catch (err) {
    console.error("Error getting interview sessions list:", err);
    return { data: null, error: "Failed to load interview sessions" };
  }
}

export async function getInterviewSessionById(sessionId: string): Promise<{
  data: {
    session: InterviewSessionData;
    roles: InterviewRoomRoleData[];
    myRole: InterviewRoomRole | null;
    otherUser: InterviewUserSummary | null;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) return { data: null, error: sessionError.message };
    if (!session) return { data: null, error: "Session not found" };

    const { data: roles, error: rolesError } = await supabase
      .from("interview_room_roles")
      .select("*")
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });

    if (rolesError) return { data: null, error: rolesError.message };

    const roleRows = (roles || []) as InterviewRoomRoleData[];
    const myRole = roleRows.find((r) => r.userId === user.id)?.role ?? null;
    const otherUserId = roleRows.find((r) => r.userId !== user.id)?.userId ?? null;

    const { data: otherProfile } = otherUserId
      ? await adminSupabase
          .from("profiles")
          .select("userId,firstName,lastName,avatarUrl")
          .eq("userId", otherUserId)
          .maybeSingle()
      : { data: null };

    const otherUser: InterviewUserSummary | null = otherUserId
      ? {
          userId: otherUserId,
          name: nameFromProfileRow(otherProfile),
          avatarUrl: (otherProfile as any)?.avatarUrl ?? null,
        }
      : null;

    return {
      data: {
        session: session as InterviewSessionData,
        roles: roleRows,
        myRole,
        otherUser,
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting interview session:", err);
    return { data: null, error: "Failed to load interview session" };
  }
}
