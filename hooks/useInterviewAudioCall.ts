"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type CallState = "idle" | "waiting_for_peer" | "incoming" | "connecting" | "in_call" | "ended" | "error";

type PermissionStateEx = PermissionState | "unsupported";

type SignalPayload =
  | {
      senderId: string;
      kind: "offer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      senderId: string;
      kind: "answer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      senderId: string;
      kind: "ice";
      candidate: RTCIceCandidateInit;
    }
  | {
      senderId: string;
      kind: "hangup";
    };

 type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never;

function mediaErrorMessage(err: unknown) {
  const anyErr = err as any;
  const name = (anyErr?.name as string | undefined) ?? "";
  const message = (anyErr?.message as string | undefined) ?? "";
  const lower = message.toLowerCase();

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    if (
      lower.includes("secure origin") ||
      lower.includes("secure context") ||
      lower.includes("only secure origins") ||
      lower.includes("permissions policy")
    ) {
      return "Microphone is blocked by browser security policy. Use HTTPS or localhost.";
    }
    return "Microphone access blocked. Check browser microphone permission for this site, Windows microphone privacy settings, and close other apps using the mic.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found. Connect a microphone and try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microphone is in use or not readable. Close other apps using it and try again.";
  }
  if (name === "SecurityError") {
    return "Microphone is blocked by browser security policy. Use HTTPS or localhost.";
  }
  if (name === "OverconstrainedError") {
    return "Microphone constraints could not be satisfied.";
  }

  return message || "Failed to access microphone";
}

async function queryPermission(name: "microphone" | "camera"): Promise<{ state: PermissionStateEx; status: PermissionStatus | null }> {
  try {
    const perms = (navigator as any).permissions;
    if (!perms?.query) return { state: "unsupported", status: null };
    const status = (await perms.query({ name } as any)) as PermissionStatus;
    return { state: status.state, status };
  } catch (_) {
    return { state: "unsupported", status: null };
  }
}

export function useInterviewAudioCall(params: { sessionId: string; otherUserId: string | null; audioDeviceId?: string | null }) {
  const { sessionId, otherUserId, audioDeviceId = null } = params;

  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [isChannelConnected, setIsChannelConnected] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localStreamDeviceIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const isInitiatorRef = useRef(false);
  const isPeerOnlineRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const answerOfferRef = useRef<((offer: RTCSessionDescriptionInit) => Promise<void>) | null>(null);

  const isInitiator = useMemo(() => {
    if (!userId || !otherUserId) return false;
    return userId < otherUserId;
  }, [otherUserId, userId]);

  useEffect(() => {
    isInitiatorRef.current = isInitiator;
  }, [isInitiator]);

  const canStart = Boolean(sessionId && otherUserId);

  const cleanup = useCallback(async () => {
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    try {
      pcRef.current?.close();
    } catch (_) {
    }
    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    localStreamDeviceIdRef.current = null;

    setRemoteStream(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    let mounted = true;

    (async () => {
      const res = await queryPermission("microphone");
      if (!mounted) return;
      status = res.status;

      const errLower = error?.toLowerCase() ?? "";
      const looksLikeMicPermError =
        errLower.includes("microphone") && (errLower.includes("permission") || errLower.includes("access") || errLower.includes("blocked"));

      if (state === "error" && looksLikeMicPermError && res.state === "granted") {
        setError(null);
        setState("idle");
      }

      if (status) {
        status.onchange = () => {
          if (!mounted) return;
          const nextErrLower = error?.toLowerCase() ?? "";
          const nextLooksLikeMicPermError =
            nextErrLower.includes("microphone") &&
            (nextErrLower.includes("permission") || nextErrLower.includes("access") || nextErrLower.includes("blocked"));

          if (state === "error" && nextLooksLikeMicPermError && status!.state === "granted") {
            setError(null);
            setState("idle");
          }
        };
      }
    })();

    return () => {
      mounted = false;
      if (status) status.onchange = null;
    };
  }, [error, state]);

  const ensureChannel = useCallback(() => {
    if (channelRef.current) return channelRef.current;

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const channel = supabase
      .channel(`interview_call_${sessionId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      })
      .on("presence", { event: "sync" }, () => {
        if (!otherUserId) {
          setIsPeerOnline(false);
          return;
        }
        const presenceState = channel.presenceState() as Record<string, unknown>;
        setIsPeerOnline(Boolean(presenceState[otherUserId]));
      })
      .on(
        "broadcast",
        { event: "signal" },
        async ({ payload }) => {
          const msg = payload as SignalPayload;
          if (!msg?.senderId) return;
          if (msg.senderId === userId) return;

          if (msg.kind === "hangup") {
            cleanup();
            setState("ended");
            return;
          }

          if (msg.kind === "offer") {
            const pc = pcRef.current;
            if (
              pc &&
              (pc.connectionState === "connected" || pc.connectionState === "connecting") &&
              pc.signalingState === "stable" &&
              answerOfferRef.current
            ) {
              try {
                await answerOfferRef.current(msg.sdp);
                return;
              } catch (e) {
                console.error("Error answering renegotiation offer:", e);
              }
            }

            pendingOfferRef.current = msg.sdp;
            setState((prev) => (prev === "in_call" || prev === "connecting" ? prev : "incoming"));
            return;
          }

          if (msg.kind === "answer") {
            const pc = pcRef.current;
            if (!pc) return;
            try {
              await pc.setRemoteDescription(msg.sdp);

              for (const c of pendingCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(c);
                } catch (e) {
                  console.error("Error applying queued ICE:", e);
                }
              }
              pendingCandidatesRef.current = [];

              setState("in_call");
            } catch (e) {
              console.error("Error setting remote answer:", e);
              setError("Failed to establish call");
              setState("error");
            }
            return;
          }

          if (msg.kind === "ice") {
            const pc = pcRef.current;
            if (!pc || !msg.candidate) {
              return;
            }

            if (!pc.remoteDescription) {
              pendingCandidatesRef.current.push(msg.candidate);
              return;
            }

            try {
              await pc.addIceCandidate(msg.candidate);
            } catch (e) {
              console.error("Error adding ICE candidate:", e);
            }
          }
        }
      )
      .subscribe(async (status) => {
        setIsChannelConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({ onlineAt: new Date().toISOString() });
          } catch (e) {
            console.error("Error tracking presence:", e);
          }
        }
      });

    channelRef.current = channel;
    return channel;
  }, [cleanup, otherUserId, sessionId, userId]);

  useEffect(() => {
    if (!sessionId || !otherUserId || !userId) return;
    ensureChannel();
  }, [ensureChannel, otherUserId, sessionId, userId]);

  useEffect(() => {
    if (!otherUserId) {
      setIsPeerOnline(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    isPeerOnlineRef.current = isPeerOnline;
  }, [isPeerOnline]);

  useEffect(() => {
    return () => {
      cleanup();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [cleanup]);

  const sendSignal = useCallback(
    async (msg: DistributiveOmit<SignalPayload, "senderId">) => {
      if (!userId) return;
      const channel = ensureChannel();
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload: { ...msg, senderId: userId },
      });
    },
    [ensureChannel, userId]
  );

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ kind: "ice", candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream) {
        setRemoteStream(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        if (disconnectTimerRef.current) {
          window.clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setError(null);
        setState("in_call");
      }
      if (s === "connecting") setState("connecting");
      if (s === "disconnected") {
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = window.setTimeout(() => {
            disconnectTimerRef.current = null;
            setError("Connection lost. Try Reconnect.");
            setState("error");
          }, 4500);
        }
        setState((prev) => (prev === "in_call" ? "connecting" : prev));
      }
      if (s === "failed") {
        if (disconnectTimerRef.current) {
          window.clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setError("Connection failed. Try Reconnect.");
        setState("error");
      }
      if (s === "closed") {
        cleanup();
        setState("ended");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, sendSignal]);

  const ensureLocalAudio = useCallback(async () => {
    if (localStreamRef.current && localStreamDeviceIdRef.current === audioDeviceId) return localStreamRef.current;

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Microphone API unavailable in this browser context");
    }

    const host = globalThis.location?.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    if (!(globalThis as any).isSecureContext && !isLocalhost) {
      throw new Error("Microphone is blocked by browser security policy. Use HTTPS or localhost.");
    }

    const audioConstraint: boolean | MediaTrackConstraints =
      audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
    } catch (e) {
      const anyErr = e as any;
      const name = (anyErr?.name as string | undefined) ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        const perm = await queryPermission("microphone");
        if (perm.state === "granted" || perm.state === "unsupported") {
          let hasAudioInput = true;
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            hasAudioInput = devices.some((d) => d.kind === "audioinput");
          } catch (_) {
          }
          if (!hasAudioInput) {
            throw new Error("No microphone found. Connect a microphone and try again.");
          }
          throw new Error(
            "Microphone permission is allowed, but the device is still unavailable. Check Windows microphone privacy settings and close other apps using the mic."
          );
        }
      }
      throw new Error(mediaErrorMessage(e));
    }

    const prevStream = localStreamRef.current;
    localStreamRef.current = stream;
    localStreamDeviceIdRef.current = audioDeviceId;

    if (prevStream && prevStream !== stream) {
      try {
        prevStream.getTracks().forEach((t) => t.stop());
      } catch (_) {
      }

      const pc = pcRef.current;
      const newTrack = stream.getAudioTracks()[0] ?? null;
      if (pc && newTrack) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "audio") ?? null;
        if (sender) {
          try {
            await sender.replaceTrack(newTrack);
          } catch (e) {
            console.error("Error replacing audio track:", e);
          }
        }
      }
    }

    stream.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted;
    });

    return stream;
  }, [audioDeviceId, isMuted]);

  const answerOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!userId) {
        setError("Not authenticated");
        setState("error");
        return;
      }

      setError(null);

      const pc = ensurePeerConnection();
      const local = await ensureLocalAudio();

      const senderTrackIds = new Set(pc.getSenders().map((s) => s.track?.id).filter(Boolean) as string[]);
      local.getTracks().forEach((track) => {
        if (!senderTrackIds.has(track.id)) {
          pc.addTrack(track, local);
        }
      });

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({ kind: "answer", sdp: pc.localDescription! });

      pendingOfferRef.current = null;

      for (const c of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(c);
        } catch (e) {
          console.error("Error applying queued ICE:", e);
        }
      }
      pendingCandidatesRef.current = [];

      setState("in_call");
    },
    [ensureLocalAudio, ensurePeerConnection, sendSignal, userId]
  );

  useEffect(() => {
    answerOfferRef.current = answerOffer;
  }, [answerOffer]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    if (localStreamDeviceIdRef.current === audioDeviceId) return;

    ensureLocalAudio().catch((e) => {
      console.error("Error switching microphone:", e);
      setError(e instanceof Error ? e.message : "Failed to switch microphone");
    });
  }, [audioDeviceId, ensureLocalAudio]);

  const start = useCallback(async () => {
    if (!canStart) {
      setError("Missing participant info");
      setState("error");
      return;
    }
    if (!userId) {
      setError("Not authenticated");
      setState("error");
      return;
    }

    setError(null);

    try {
      ensureChannel();

      if (!isInitiator) {
        setState("waiting_for_peer");
        return;
      }

      if (!isPeerOnline) {
        setState("waiting_for_peer");
        return;
      }

      setState("connecting");

      const pc = ensurePeerConnection();
      const local = await ensureLocalAudio();

      const senderTrackIds = new Set(pc.getSenders().map((s) => s.track?.id).filter(Boolean) as string[]);
      local.getTracks().forEach((track) => {
        if (!senderTrackIds.has(track.id)) {
          pc.addTrack(track, local);
        }
      });

      if (pc.signalingState !== "stable") {
        setState("waiting_for_peer");
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: "offer", sdp: pc.localDescription! });
      setState("waiting_for_peer");
    } catch (e) {
      console.error("Error starting call:", e);
      setError(e instanceof Error ? e.message : "Failed to start call");
      setState("error");
    }
  }, [canStart, ensureChannel, ensureLocalAudio, ensurePeerConnection, isInitiator, isPeerOnline, sendSignal, userId]);

  const join = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer) {
      setError("No incoming call");
      setState("error");
      return;
    }

    try {
      ensureChannel();
      setState("connecting");
      await answerOffer(offer);
    } catch (e) {
      console.error("Error joining call:", e);
      setError(e instanceof Error ? e.message : "Failed to join call");
      setState("error");
    }
  }, [answerOffer, ensureChannel]);

  const reconnect = useCallback(async () => {
    setError(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);

    try {
      pcRef.current?.close();
    } catch (_) {
    }
    pcRef.current = null;

    if (!canStart) {
      setError("Missing participant info");
      setState("error");
      return;
    }

    if (!isPeerOnlineRef.current) {
      setState("waiting_for_peer");
      return;
    }

    if (isInitiatorRef.current) {
      await start();
      return;
    }

    setState("waiting_for_peer");
  }, [canStart, start]);

  const hangup = useCallback(async () => {
    try {
      await sendSignal({ kind: "hangup" });
    } catch (_) {
    }
    await cleanup();
    setState("ended");
  }, [cleanup, sendSignal]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const local = localStreamRef.current;
      if (local) {
        local.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const hasIncomingOffer = state === "incoming";

  return {
    userId,
    state,
    error,
    isMuted,
    isChannelConnected,
    isPeerOnline,
    remoteStream,
    canStart,
    isInitiator,
    hasIncomingOffer,
    start,
    join,
    hangup,
    toggleMute,
    reconnect,
  };
}
