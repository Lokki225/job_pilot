"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { getChatMessages, sendChatMessage, type ChatMessageData } from "@/lib/actions/community.action";
import { getOrCreateInterviewChatRoom } from "@/lib/actions/interviews.action";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InterviewChatFallback(props: { sessionId: string }) {
  const { sessionId } = props;

  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async (rid: string) => {
    try {
      const res = await getChatMessages(rid);
      if (res.data) setMessages(res.data);
    } catch (e) {
      console.error("Error loading interview chat messages:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getOrCreateInterviewChatRoom(sessionId);
        if (!mounted) return;
        if (res.error || !res.data) {
          setError(res.error || "Failed to initialize chat");
          setRoomId(null);
          setMessages([]);
          return;
        }
        setRoomId(res.data.roomId);
        await loadMessages(res.data.roomId);
      } catch (e) {
        console.error("Error initializing interview chat:", e);
        if (!mounted) return;
        setError("Failed to initialize chat");
        setRoomId(null);
        setMessages([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadMessages, sessionId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`interview_chat_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `roomId=eq.${roomId}`,
        },
        () => {
          loadMessages(roomId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `roomId=eq.${roomId}`,
        },
        () => {
          loadMessages(roomId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const onSend = useCallback(async () => {
    if (!roomId) return;
    const content = newMessage.trim();
    if (!content) return;

    setIsSending(true);
    setError(null);
    try {
      const res = await sendChatMessage(roomId, content);
      if (res.error) {
        setError(res.error);
        return;
      }
      setNewMessage("");
      await loadMessages(roomId);
    } catch (e) {
      console.error("Error sending interview chat message:", e);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [loadMessages, newMessage, roomId]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading chat…</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (!roomId) {
    return <div className="text-sm text-muted-foreground">Chat unavailable.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[280px] overflow-y-auto rounded-md border bg-background p-3">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet. Say hi!</div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={m.isMine ? "flex justify-end" : "flex justify-start"}>
                <div className={m.isMine ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground" : "max-w-[85%] rounded-lg bg-muted px-3 py-2"}>
                  <div className={m.isMine ? "text-[11px] opacity-90" : "text-[11px] text-muted-foreground"}>
                    {m.isMine ? "You" : m.authorName}
                    {m.createdAt ? ` · ${formatTime(m.createdAt)}` : ""}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button type="button" onClick={onSend} disabled={isSending || !newMessage.trim()}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
