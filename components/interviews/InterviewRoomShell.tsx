"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MessageSquare, NotebookText, Phone, PhoneOff, RefreshCw, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterviewSessionById, type InterviewRoomRole, type InterviewSessionData } from "@/lib/actions/interviews.action";
import { useInterviewAudioCall } from "@/hooks/useInterviewAudioCall";
import { AudioPreflight } from "@/components/interviews/AudioPreflight";
import { InterviewChatFallback } from "@/components/interviews/InterviewChatFallback";
import { InterviewNotesPanel } from "@/components/interviews/InterviewNotesPanel";
import { InterviewKitRatingPanel } from "@/components/interviews/InterviewKitRatingPanel";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return `${a}${b}`.toUpperCase();
}

function roleLabel(role: InterviewRoomRole | null) {
  if (role === "INTERVIEWER") return "Interviewer";
  if (role === "CANDIDATE") return "Candidate";
  return "Participant";
}

export function InterviewRoomShell(props: { sessionId: string }) {
  const { sessionId } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSessionData | null>(null);
  const [myRole, setMyRole] = useState<InterviewRoomRole | null>(null);
  const [otherUser, setOtherUser] = useState<{ userId: string; name: string; avatarUrl: string | null } | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);

  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getInterviewSessionById(sessionId);
        if (res.error || !res.data) {
          setError(res.error || "Session not found");
          setSession(null);
          setMyRole(null);
          setOtherUser(null);
          setParticipantsCount(0);
          return;
        }
        setSession(res.data.session);
        setMyRole(res.data.myRole);
        setOtherUser(
          res.data.otherUser
            ? {
                userId: res.data.otherUser.userId,
                name: res.data.otherUser.name,
                avatarUrl: res.data.otherUser.avatarUrl,
              }
            : null
        );
        setParticipantsCount(res.data.roles.length);
      } catch (e) {
        console.error("Error loading interview room:", e);
        setError("Failed to load interview room");
        setSession(null);
        setMyRole(null);
        setOtherUser(null);
        setParticipantsCount(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId]);

  const call = useInterviewAudioCall({ sessionId, otherUserId: otherUser?.userId ?? null, audioDeviceId });

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    if (!call.remoteStream) {
      try {
        (el as any).srcObject = null;
      } catch (_) {
      }
      return;
    }

    try {
      (el as any).srcObject = call.remoteStream;
      el.play().catch(() => {});
    } catch (e) {
      console.error("Failed setting remote audio srcObject:", e);
    }
  }, [call.remoteStream]);

  const title = useMemo(() => {
    if (!otherUser) return "Interview Room";
    return `Interview with ${otherUser.name}`;
  }, [otherUser]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/interviews">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-sm text-destructive">{error || "Session not found"}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">{title}</div>
          <div className="text-sm text-muted-foreground">Scheduled: {formatWhen(session.scheduledAt)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{roleLabel(myRole)}</Badge>
          <Badge variant="outline">{session.status}</Badge>
          <Badge variant="outline">Participants: {participantsCount}</Badge>
          <Badge variant={call.state === "in_call" ? "secondary" : "outline"}>Call: {call.state}</Badge>
          <Badge variant={call.isChannelConnected ? "secondary" : "outline"}>
            Signaling: {call.isChannelConnected ? "connected" : "connecting"}
          </Badge>
          <Badge variant={call.isPeerOnline ? "secondary" : "outline"}>Peer: {call.isPeerOnline ? "online" : "offline"}</Badge>
          <Link href="/dashboard/interviews">
            <Button variant="outline">Exit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="h-4 w-4" />
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {call.error ? <div className="text-sm text-destructive">{call.error}</div> : null}

              <AudioPreflight audioDeviceId={audioDeviceId} onAudioDeviceIdChange={setAudioDeviceId} />

              <audio ref={remoteAudioRef} autoPlay playsInline />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={call.state === "in_call" ? "outline" : "default"}
                  disabled={!call.isInitiator || !call.canStart || call.state === "connecting" || !call.isChannelConnected}
                  onClick={call.start}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Start call
                </Button>

                <Button
                  type="button"
                  variant="default"
                  disabled={!call.hasIncomingOffer || call.state === "connecting"}
                  onClick={call.join}
                >
                  Join
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={call.state === "idle" || call.state === "ended"}
                  onClick={call.hangup}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Hang up
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!call.isChannelConnected || !call.canStart || call.state === "connecting"}
                  onClick={call.reconnect}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconnect
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={call.state !== "in_call" && call.state !== "connecting" && call.state !== "waiting_for_peer"}
                  onClick={call.toggleMute}
                >
                  <VolumeX className="mr-2 h-4 w-4" />
                  {call.isMuted ? "Unmute" : "Mute"}
                </Button>
              </div>

              {call.hasIncomingOffer && call.state !== "in_call" ? (
                <div className="text-xs text-muted-foreground">Incoming call detected — click Join to connect.</div>
              ) : null}

              {!call.isChannelConnected ? (
                <div className="text-xs text-muted-foreground">Connecting to signaling…</div>
              ) : null}

              {call.isChannelConnected && !call.isPeerOnline ? (
                <div className="text-xs text-muted-foreground">Waiting for the other participant to open this room.</div>
              ) : null}

              {call.isChannelConnected && call.isPeerOnline && !call.isInitiator && !call.hasIncomingOffer && call.state !== "in_call" ? (
                <div className="text-xs text-muted-foreground">Waiting for the other participant to start the call.</div>
              ) : null}

              <div className="text-xs text-muted-foreground">
                Tip: if you don’t hear audio, check browser mic permissions and your output device.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Chat (fallback)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InterviewChatFallback sessionId={session.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {otherUser ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser.avatarUrl || undefined} />
                    <AvatarFallback>{initials(otherUser.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{otherUser.name}</div>
                    <div className="text-xs text-muted-foreground">Peer interview participant</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Participant info unavailable.</div>
              )}

              <div className="h-px w-full bg-border" />

              <div className="text-xs text-muted-foreground">Session ID</div>
              <div className="break-all text-sm">{session.id}</div>
            </CardContent>
          </Card>

          <InterviewKitRatingPanel
            session={session}
            onSessionUpdated={(next) => {
              setSession(next);
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InterviewNotesPanel sessionId={session.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
