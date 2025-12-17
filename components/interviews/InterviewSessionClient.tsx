"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InterviewRoomShell } from "@/components/interviews/InterviewRoomShell";

export function InterviewSessionClient(props: { sessionId?: string }) {
  const params = useParams();
  const sessionId = props.sessionId || ((params as any)?.sessionId as string) || "";

  if (!sessionId) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <Link href="/dashboard/interviews">
          <Button variant="outline">Back</Button>
        </Link>
        <div className="text-sm text-destructive">Missing session id</div>
      </div>
    );
  }

  return <InterviewRoomShell sessionId={sessionId} />;
}
