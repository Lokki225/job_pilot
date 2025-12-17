"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function safeFilenameSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function InterviewNotesPanel(props: { sessionId: string }) {
  const { sessionId } = props;

  const storageKey = useMemo(() => `jobpilot_interview_notes_${sessionId}`, [sessionId]);

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (typeof saved === "string") setValue(saved);
    } catch (_) {
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch (_) {
    }
  }, [storageKey, value]);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(null), 1500);
    return () => window.clearTimeout(t);
  }, [status]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch (_) {
      setStatus("Copy failed");
    }
  }, [value]);

  const onDownloadTxt = useCallback(() => {
    const base = safeFilenameSegment(sessionId.slice(0, 12) || "session");
    downloadText(`interview-notes-${base}.txt`, value, "text/plain");
    setStatus("Downloaded");
  }, [sessionId, value]);

  const onDownloadMd = useCallback(() => {
    const base = safeFilenameSegment(sessionId.slice(0, 12) || "session");
    downloadText(`interview-notes-${base}.md`, value, "text/markdown");
    setStatus("Downloaded");
  }, [sessionId, value]);

  const onClear = useCallback(() => {
    setValue("");
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {
    }
    setStatus("Cleared");
  }, [storageKey]);

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write notes here… (saved locally in your browser)"
        className="min-h-[220px]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{status ? status : "Autosaved"}</div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={!value.trim()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDownloadTxt} disabled={!value.trim()}>
            <Download className="mr-2 h-4 w-4" />
            TXT
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDownloadMd} disabled={!value.trim()}>
            <Download className="mr-2 h-4 w-4" />
            MD
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onClear} disabled={!value.trim()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
