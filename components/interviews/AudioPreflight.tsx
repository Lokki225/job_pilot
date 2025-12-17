"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PermissionStateEx = PermissionState | "unsupported";

async function queryPermission(name: "microphone"): Promise<PermissionStateEx> {
  try {
    const perms = (navigator as any).permissions;
    if (!perms?.query) return "unsupported";
    const status = (await perms.query({ name } as any)) as PermissionStatus;
    return status.state;
  } catch (_) {
    return "unsupported";
  }
}

function badgeVariantForPermission(state: PermissionStateEx): "secondary" | "outline" | "destructive" {
  if (state === "granted") return "secondary";
  if (state === "denied") return "destructive";
  return "outline";
}

const STORAGE_KEY = "jobpilot_audio_input_device_id";

export function AudioPreflight(props: {
  audioDeviceId: string | null;
  onAudioDeviceIdChange: (next: string | null) => void;
}) {
  const { audioDeviceId, onAudioDeviceIdChange } = props;

  const [permission, setPermission] = useState<PermissionStateEx>("prompt");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const selected = audioDeviceId ?? "default";

  const audioInputs = useMemo(() => devices.filter((d) => d.kind === "audioinput"), [devices]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [permState, devs] = await Promise.all([
        queryPermission("microphone"),
        navigator.mediaDevices?.enumerateDevices?.() ?? Promise.resolve([] as MediaDeviceInfo[]),
      ]);
      setPermission(permState);
      setDevices(devs);
    } catch (e) {
      console.error("Error refreshing audio preflight:", e);
      setError("Failed to read microphone status");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch (_) {
          return null;
        }
      })();

      if (mounted && stored && stored !== audioDeviceId) {
        onAudioDeviceIdChange(stored);
      }

      await refresh();
    })();

    const onDeviceChange = () => {
      refresh();
    };

    try {
      navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    } catch (_) {
    }

    return () => {
      mounted = false;
      try {
        navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      } catch (_) {
      }
    };
  }, [audioDeviceId, onAudioDeviceIdChange, refresh]);

  const requestMic = useCallback(async () => {
    setIsRequesting(true);
    setError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Microphone API unavailable in this browser context");
        return;
      }

      const audioConstraint: boolean | MediaTrackConstraints =
        selected && selected !== "default" ? { deviceId: { exact: selected } } : true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Failed to access microphone";
      setError(msg);
      await refresh();
    } finally {
      setIsRequesting(false);
    }
  }, [refresh, selected]);

  const onSelectDevice = useCallback(
    (v: string) => {
      const next = v === "default" ? null : v;
      onAudioDeviceIdChange(next);
      try {
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
      } catch (_) {
      }
    },
    [onAudioDeviceIdChange]
  );

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Microphone</div>
          <Badge variant={badgeVariantForPermission(permission)}>
            {permission === "unsupported" ? "unknown" : permission}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={requestMic} disabled={isRequesting}>
            {isRequesting ? "Requesting…" : "Request / Test"}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">Input device</div>
        <Select value={selected} onValueChange={onSelectDevice}>
          <SelectTrigger className="w-full sm:w-[360px]" size="sm">
            <SelectValue placeholder="Select microphone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default microphone</SelectItem>
            {audioInputs.map((d, idx) => {
              const label = d.label || `Microphone ${idx + 1}`;
              const value = d.deviceId || `device_${idx}`;
              return (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}

      {permission === "denied" ? (
        <div className="mt-2 text-xs text-muted-foreground">If permission is denied, enable Microphone for this site in your browser settings and reload.</div>
      ) : null}
    </div>
  );
}
