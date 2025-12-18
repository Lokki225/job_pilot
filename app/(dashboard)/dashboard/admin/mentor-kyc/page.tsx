"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { checkIsAdmin } from "@/lib/actions/cover-letter.action";
import {
  approveMentorKyc,
  listMentorKycVerifications,
  rejectMentorKyc,
  type AdminMentorKycRow,
} from "@/lib/actions/mentor-kyc.action";

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "SUBMITTED") return "secondary";
  return "outline";
}

export default function MentorKycAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<AdminMentorKycRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [rejectReasonByUserId, setRejectReasonByUserId] = useState<Record<string, string>>({});

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const adminRes = await checkIsAdmin();
      setIsAdmin(adminRes.isAdmin);

      if (!adminRes.isAdmin) {
        setRows([]);
        return;
      }

      const res = await listMentorKycVerifications();
      if (res.error || !res.data) {
        setError(res.error || "Failed to load");
        setRows([]);
        return;
      }

      setRows(res.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const submitted = useMemo(() => rows.filter((r) => r.status === "SUBMITTED"), [rows]);

  async function handleApprove(userId: string) {
    setBusyUserId(userId);
    try {
      const res = await approveMentorKyc(userId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Approved", description: "Mentor verification approved" });
      await load();
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReject(userId: string) {
    const reason = (rejectReasonByUserId[userId] || "").trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }

    setBusyUserId(userId);
    try {
      const res = await rejectMentorKyc({ userId, reason });
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Rejected", description: "Mentor verification rejected" });
      await load();
    } finally {
      setBusyUserId(null);
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
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Mentor KYC Review</h1>
            <p className="text-muted-foreground">Admin-only</p>
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">You do not have admin access.</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Submitted ({submitted.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted.length === 0 ? (
                <div className="text-sm text-muted-foreground">No submitted verifications.</div>
              ) : (
                submitted.map((r) => (
                  <div key={r.userId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{r.userName}</div>
                          <Badge variant={badgeVariant(r.status)}>{r.status}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{r.userEmail || r.userId}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Inquiry: {r.providerInquiryId || "—"}</div>
                      </div>

                      <div className="flex flex-col gap-2 md:w-[360px]">
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprove(r.userId)} disabled={busyUserId === r.userId} className="flex-1">
                            {busyUserId === r.userId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReject(r.userId)}
                            disabled={busyUserId === r.userId}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                        <Input
                          placeholder="Rejection reason (required)"
                          value={rejectReasonByUserId[r.userId] || ""}
                          onChange={(e) =>
                            setRejectReasonByUserId((prev) => ({
                              ...prev,
                              [r.userId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.map((r) => (
                <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.userName}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail || r.userId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant(r.status)}>{r.status}</Badge>
                    <div className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
