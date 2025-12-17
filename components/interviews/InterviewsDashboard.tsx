"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  getMyInterviewRequestList,
  getMyInterviewSessionList,
  respondToInterviewRequest,
  type InterviewRequestListItem,
  type InterviewSessionListItem,
} from "@/lib/actions/interviews.action";

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

export function InterviewsDashboard() {
  const [requests, setRequests] = useState<InterviewRequestListItem[]>([]);
  const [sessions, setSessions] = useState<InterviewSessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [pickedTime, setPickedTime] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqRes, sessRes] = await Promise.all([getMyInterviewRequestList(), getMyInterviewSessionList()]);
      if (reqRes.error) setError(reqRes.error);
      if (sessRes.error) setError(sessRes.error);
      setRequests(reqRes.data || []);
      setSessions(sessRes.data || []);
    } catch (e) {
      console.error("Error loading interviews:", e);
      setError("Failed to load interviews");
      setRequests([]);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incoming = useMemo(() => requests.filter((r) => r.direction === "incoming"), [requests]);
  const outgoing = useMemo(() => requests.filter((r) => r.direction === "outgoing"), [requests]);

  async function act(requestId: string, action: "ACCEPT" | "DECLINE" | "CANCEL", scheduledAt?: string) {
    if (pending[requestId]) return;
    setPending((prev) => ({ ...prev, [requestId]: true }));

    try {
      const res = await respondToInterviewRequest(requestId, { action, scheduledAt });
      if (res.error) {
        toast({ title: "Action failed", description: res.error, variant: "destructive" });
        return;
      }

      if (action === "ACCEPT" && res.data?.sessionId) {
        toast({ title: "Request accepted", description: "Session created." });
      } else {
        toast({ title: "Updated", description: "Your changes were saved." });
      }

      await load();
    } catch (e) {
      console.error("Error updating request:", e);
      toast({ title: "Action failed", description: "Unexpected error", variant: "destructive" });
    } finally {
      setPending((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Interviews</h1>
          <p className="text-sm text-muted-foreground">Requests and upcoming sessions</p>
        </div>
        <Link href="/dashboard/community/hub">
          <Button variant="outline">Back to Community</Button>
        </Link>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incoming requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">No incoming requests.</div>
          ) : (
            incoming.map((r) => {
              const other = r.otherUser;
              const canRespond = r.status === "PENDING";
              const proposed = Array.isArray(r.proposedTimes) ? r.proposedTimes : [];
              const chosen = pickedTime[r.id] || proposed[0] || "";

              return (
                <div key={r.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback>{initials(other?.name || "User")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{other?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.mode} • {r.status} • {formatWhen(r.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    {r.mode === "SCHEDULED" && canRespond ? (
                      <div className="w-full sm:w-[240px]">
                        <Select
                          value={chosen}
                          onValueChange={(v) => setPickedTime((prev) => ({ ...prev, [r.id]: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pick a time" />
                          </SelectTrigger>
                          <SelectContent>
                            {proposed.map((t) => (
                              <SelectItem key={t} value={t}>
                                {formatWhen(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canRespond || pending[r.id]}
                        onClick={() => act(r.id, "DECLINE")}
                      >
                        Decline
                      </Button>
                      <Button
                        type="button"
                        disabled={!canRespond || pending[r.id] || (r.mode === "SCHEDULED" && !chosen)}
                        onClick={() => act(r.id, "ACCEPT", r.mode === "SCHEDULED" ? chosen : undefined)}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outgoing requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outgoing.length === 0 ? (
            <div className="text-sm text-muted-foreground">No outgoing requests.</div>
          ) : (
            outgoing.map((r) => {
              const other = r.otherUser;
              const canCancel = r.status === "PENDING";
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback>{initials(other?.name || "User")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{other?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.mode} • {r.status} • {formatWhen(r.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.status}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canCancel || pending[r.id]}
                      onClick={() => act(r.id, "CANCEL")}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions yet.</div>
          ) : (
            sessions.map((s) => {
              const other = s.otherUser;
              return (
                <div key={s.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback>{initials(other?.name || "User")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{other?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.role} • {s.status} • {formatWhen(s.scheduledAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    <Link href={`/dashboard/interviews/session/${s.id}`}>
                      <Button type="button">Open</Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
