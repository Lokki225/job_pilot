"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createInterviewRequest, type InterviewRequestMode } from "@/lib/actions/interviews.action";

export function RequestInterviewDialog(props: {
  targetUserId: string;
  disabled?: boolean;
  triggerLabel?: string;
  onCreated?: () => void;
}) {
  const { targetUserId, disabled, triggerLabel, onCreated } = props;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InterviewRequestMode>("INSTANT");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!targetUserId) return false;
    if (mode === "SCHEDULED") return Boolean(scheduledAt);
    return true;
  }, [mode, scheduledAt, targetUserId]);

  async function submit() {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createInterviewRequest({
        targetId: targetUserId,
        mode,
        proposedTimes: mode === "SCHEDULED" ? [scheduledAt] : undefined,
        message: message.trim() ? message.trim() : undefined,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      toast({
        title: "Interview request sent",
        description: mode === "INSTANT" ? "They can join immediately." : "They can accept and choose a time.",
      });

      setOpen(false);
      setMode("INSTANT");
      setScheduledAt("");
      setMessage("");
      onCreated?.();
    } catch (e) {
      console.error("Error creating interview request:", e);
      setError("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {triggerLabel || "Request interview"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a peer interview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as InterviewRequestMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTANT">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Instant
                  </div>
                </SelectItem>
                <SelectItem value="SCHEDULED">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Scheduled
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "SCHEDULED" ? (
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Propose a time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Times are in your local timezone.</div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to focus on?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
