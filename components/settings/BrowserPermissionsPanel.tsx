"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Camera, Mic, RefreshCw } from "lucide-react";

type PermissionStateEx = PermissionState | "unsupported";

type PermissionKey = "microphone" | "camera";

type PermissionRow = {
  key: PermissionKey;
  label: string;
  icon: "mic" | "camera";
};

function badgeClasses(state: PermissionStateEx) {
  if (state === "granted") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (state === "denied") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (state === "prompt") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function labelForState(state: PermissionStateEx) {
  if (state === "unsupported") return "unsupported";
  return state;
}

async function queryPermission(name: PermissionKey): Promise<{ state: PermissionStateEx; status: PermissionStatus | null }> {
  try {
    const perms = (navigator as any).permissions;
    if (!perms?.query) return { state: "unsupported", status: null };
    const status = (await perms.query({ name } as any)) as PermissionStatus;
    return { state: status.state, status };
  } catch (_) {
    return { state: "unsupported", status: null };
  }
}

export function BrowserPermissionsPanel() {
  const [micState, setMicState] = useState<PermissionStateEx>("prompt");
  const [camState, setCamState] = useState<PermissionStateEx>("prompt");
  const [notifState, setNotifState] = useState<NotificationPermission | "unsupported">("default");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSecure = useMemo(() => {
    const host = globalThis.location?.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    return Boolean((globalThis as any).isSecureContext) || isLocalhost;
  }, []);

  const origin = useMemo(() => {
    try {
      return globalThis.location?.origin || "";
    } catch (_) {
      return "";
    }
  }, []);

  const rows: PermissionRow[] = useMemo(
    () => [
      { key: "microphone", label: "Microphone", icon: "mic" },
      { key: "camera", label: "Camera", icon: "camera" },
    ],
    []
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [mic, cam] = await Promise.all([queryPermission("microphone"), queryPermission("camera")]);
      setMicState(mic.state);
      setCamState(cam.state);

      if (typeof (globalThis as any).Notification !== "undefined") {
        setNotifState((globalThis as any).Notification.permission as NotificationPermission);
      } else {
        setNotifState("unsupported");
      }

      if (mic.status) {
        mic.status.onchange = () => setMicState(mic.status!.state);
      }
      if (cam.status) {
        cam.status.onchange = () => setCamState(cam.status!.state);
      }
    } catch (e) {
      console.error("Error refreshing permissions:", e);
      setError("Failed to read permission status");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestMic = useCallback(async () => {
    setError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Microphone API unavailable in this browser context");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Microphone permission request failed";
      setError(msg);
      await refresh();
    }
  }, [refresh]);

  const requestCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Camera API unavailable in this browser context");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Camera permission request failed";
      setError(msg);
      await refresh();
    }
  }, [refresh]);

  const requestNotifications = useCallback(async () => {
    setError(null);
    try {
      if (typeof (globalThis as any).Notification === "undefined") {
        setError("Notifications API unavailable in this browser");
        return;
      }
      await (globalThis as any).Notification.requestPermission();
      await refresh();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Notification permission request failed";
      setError(msg);
      await refresh();
    }
  }, [refresh]);

  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Browser Permissions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage permissions required for calls and notifications.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-white dark:hover:bg-slate-600 transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!isSecure ? (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Microphone and camera require HTTPS (or localhost).</div>
          {origin ? <div className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">Current origin: {origin}</div> : null}
        </div>
      ) : null}

      {error ? <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-3">
        {rows.map((r) => {
          const state = r.key === "microphone" ? micState : camState;
          const Icon = r.icon === "mic" ? Mic : Camera;
          const onRequest = r.key === "microphone" ? requestMic : requestCamera;

          return (
            <div key={r.key} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600">
                  <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{r.label}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 truncate">Status: {labelForState(state)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badgeClasses(state)}`}>{labelForState(state)}</span>
                <button
                  type="button"
                  onClick={onRequest}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Request
                </button>
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600">
              <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">Notifications</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 truncate">Status: {notifState}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badgeClasses(notifState === "unsupported" ? "unsupported" : notifState === "granted" ? "granted" : notifState === "denied" ? "denied" : "prompt")}`}>{notifState}</span>
            <button
              type="button"
              onClick={requestNotifications}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Request
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        If a permission is set to denied, you may need to change it in your browser site settings and reload.
      </div>
    </div>
  );
}
