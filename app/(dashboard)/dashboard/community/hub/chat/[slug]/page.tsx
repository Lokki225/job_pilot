"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  MoreHorizontal,
  Reply,
  Smile,
  Trash2,
  Edit,
  Pin,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createBrowserClient } from "@supabase/ssr";
import { MentionInput } from "@/components/mentions/MentionInput";
import { MentionText } from "@/components/mentions/MentionText";
import { extractMentionedUserIds } from "@/lib/utils/mentions";
import {
  getChatRoomBySlug,
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  addMessageReaction,
  removeMessageReaction,
  joinChatRoom,
  leaveChatRoom,
  searchMentionableUsers,
  notifyMentionedUsers,
  type ChatRoomSummary,
  type ChatMessageData,
} from "@/lib/actions/community.action";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "💯"];

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [room, setRoom] = useState<ChatRoomSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageData | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<
    Array<{ userId: string; username: string; displayName: string; avatarUrl: string | null }>
  >([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isMentionLoading, setIsMentionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadMessagesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const getSupabaseClient = useCallback(() => {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseClientRef.current;
  }, []);

  useEffect(() => {
    loadRoom();
  }, [slug]);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionSuggestions([]);
      setIsMentionLoading(false);
      return;
    }

    const trimmed = mentionQuery.trim();
    if (!trimmed) {
      setMentionSuggestions([]);
      setIsMentionLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsMentionLoading(true);

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/mentions/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch mention suggestions");
        }

        const payload = await response.json();
        if (!controller.signal.aborted) {
          setMentionSuggestions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error fetching mention suggestions:", err);
        setMentionSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsMentionLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      controller.abort();
    };
  }, [mentionQuery]);

  useEffect(() => {
    if (!room) return;

    const supabase = getSupabaseClient();

    const scheduleLoadMessages = () => {
      if (loadMessagesTimeoutRef.current) {
        clearTimeout(loadMessagesTimeoutRef.current);
      }
      loadMessagesTimeoutRef.current = setTimeout(() => {
        loadMessages();
      }, 300);
    };

    const channel = supabase
      .channel(`chat_room_${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `roomId=eq.${room.id}`,
        },
        (_payload: unknown) => {
          // Immediately reload messages when new message arrives
          loadMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `roomId=eq.${room.id}`,
        },
        (_payload: unknown) => {
          // Immediately reload messages when message is updated
          loadMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message_reactions",
        },
        (_payload: unknown) => {
          // Debounce reaction updates since they can be frequent
          scheduleLoadMessages();
        }
      )
      .subscribe();

    return () => {
      if (loadMessagesTimeoutRef.current) {
        clearTimeout(loadMessagesTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadRoom() {
    setIsLoading(true);
    try {
      const res = await getChatRoomBySlug(slug);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setRoom(res.data);
        await loadMessages(res.data.id);
      }
    } catch (err) {
      console.error("Error loading room:", err);
      setError("Failed to load chat room");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(roomId?: string) {
    try {
      const res = await getChatMessages(roomId || room?.id || "");
      if (res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }

  async function handleJoinRoom() {
    if (!room) return;
    try {
      const res = await joinChatRoom(room.id);
      if (res.error) {
        setError(res.error);
      } else {
        setRoom((prev) => (prev ? { ...prev, isMember: true } : prev));
        const updated = await getChatRoomBySlug(slug);
        if (updated.data) setRoom(updated.data);
      }
    } catch (err) {
      console.error("Error joining room:", err);
    }
  }

  async function handleLeaveRoom() {
    if (!room) return;
    try {
      const res = await leaveChatRoom(room.id);
      if (res.error) {
        setError(res.error);
      } else {
        setRoom((prev) => (prev ? { ...prev, isMember: false } : prev));
        const updated = await getChatRoomBySlug(slug);
        if (updated.data) setRoom(updated.data);
      }
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !room) return;

    setIsSending(true);
    try {
      const res = await sendChatMessage(room.id, newMessage.trim(), replyTo?.id);
      if (res.error) {
        setError(res.error);
      } else {
        // Extract and notify mentioned users
        const mentionedUserIds = extractMentionedUserIds(newMessage, new Map());
        if (mentionedUserIds.length > 0 && res.data?.id) {
          await notifyMentionedUsers(res.data.id, room.id, newMessage.trim(), mentionedUserIds);
        }

        setNewMessage("");
        setReplyTo(null);
        inputRef.current?.focus();
        await loadMessages(room.id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return;

    try {
      const res = await editChatMessage(messageId, editContent.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setEditingMessage(null);
        setEditContent("");
      }
    } catch (err) {
      console.error("Error editing message:", err);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      const res = await deleteChatMessage(messageId);
      if (res.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  }

  async function handleReaction(messageId: string, emoji: string, hasReacted: boolean) {
    try {
      if (hasReacted) {
        await removeMessageReaction(messageId, emoji);
      } else {
        await addMessageReaction(messageId, emoji);
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage(editingMessage);
      } else {
        handleSendMessage();
      }
    }
    if (e.key === "Escape") {
      setReplyTo(null);
      setEditingMessage(null);
      setEditContent("");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="w-full p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">{error || "Chat room not found"}</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/community/hub")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col overflow-x-hidden p-4 md:p-6">
      <Card className="flex w-full flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/community/hub")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                {room.icon || "💬"}
              </div>
              <div>
                <CardTitle className="text-lg">{room.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{room.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {room.memberCount}
              </Badge>
              {room.isMember ? (
                <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
                  Leave
                </Button>
              ) : (
                <Button size="sm" onClick={handleJoinRoom}>
                  Join
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col overflow-hidden overflow-x-hidden p-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <p>No messages yet</p>
                <p className="text-sm">Be the first to say something!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const showAvatar =
                    index === 0 || messages[index - 1].userId !== message.userId;
                  const showTime =
                    index === 0 ||
                    new Date(message.createdAt).getTime() -
                      new Date(messages[index - 1].createdAt).getTime() >
                      5 * 60 * 1000;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showAvatar={showAvatar}
                      showTime={showTime}
                      isEditing={editingMessage === message.id}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onEdit={() => {
                        setEditingMessage(message.id);
                        setEditContent(message.content);
                      }}
                      onCancelEdit={() => {
                        setEditingMessage(null);
                        setEditContent("");
                      }}
                      onSaveEdit={() => handleEditMessage(message.id)}
                      onDelete={() => handleDeleteMessage(message.id)}
                      onReply={() => {
                        setReplyTo(message);
                        inputRef.current?.focus();
                      }}
                      onReaction={(emoji, hasReacted) =>
                        handleReaction(message.id, emoji, hasReacted)
                      }
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t p-4">
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted p-2 text-sm">
                <Reply className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium">{replyTo.authorName}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {replyTo.content}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <MentionInput
                value={newMessage}
                onChange={setNewMessage}
                onKeyDown={handleKeyDown}
                disabled={!room.isMember || isSending}
                placeholder={room.isMember ? "Type a message... (use @ to mention)" : "Join to send messages"}
                suggestions={mentionSuggestions}
                isLoadingSuggestions={isMentionLoading}
                onMentionQueryChange={setMentionQuery}
                onMentionSelect={(suggestion) => {
                  // Mention is already inserted by MentionInput
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!room.isMember || isSending || !newMessage.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({
  message,
  showAvatar,
  showTime,
  isEditing,
  editContent,
  setEditContent,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
  onReaction,
}: {
  message: ChatMessageData;
  showAvatar: boolean;
  showTime: boolean;
  isEditing: boolean;
  editContent: string;
  setEditContent: (v: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onReaction: (emoji: string, hasReacted: boolean) => void;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <div className={`group flex min-w-0 gap-3 ${message.isMine ? "flex-row-reverse" : ""}`}>
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.authorAvatar || undefined} />
          <AvatarFallback>{message.authorName[0] || "U"}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={`flex min-w-0 max-w-[70%] flex-col ${message.isMine ? "items-end" : "items-start"}`}>
        {showAvatar && (
          <div className={`mb-1 flex items-center gap-2 text-sm ${message.isMine ? "flex-row-reverse" : ""}`}>
            <span className="font-medium">{message.authorName}</span>
            {showTime && (
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        {message.replyTo && (
          <div className={`mb-1 rounded border-l-2 border-primary bg-muted/50 px-2 py-1 text-xs ${message.isMine ? "ml-auto" : ""}`}>
            <span className="font-medium">{message.replyTo.authorName}</span>
            <p className="truncate text-muted-foreground">{message.replyTo.content}</p>
          </div>
        )}

        <div
          className={`relative w-fit max-w-full rounded-lg px-3 py-2 ${
            message.isMine
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          } ${message.isDeleted ? "italic text-muted-foreground" : ""}`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={onSaveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-all leading-relaxed">
                <MentionText
                  content={message.content}
                  mentionClassName={
                    message.isMine
                      ? "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors cursor-pointer"
                      : undefined
                  }
                  onMentionClick={(userId, name) => {
                    if (userId) {
                      window.location.href = `/dashboard/community/hub/profile/${userId}`;
                    }
                  }}
                />
              </p>
              {message.isEdited && !message.isDeleted && (
                <span className="text-xs opacity-70">(edited)</span>
              )}
            </>
          )}

          {!isEditing && !message.isDeleted && (
            <div
              className={`absolute -top-10 left-0 z-50 flex items-center gap-1 rounded-lg border bg-card text-card-foreground p-1 shadow-md transition-opacity ${
                emojiOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              }`}
            >
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top" align="start" sideOffset={8}>
                  <div className="flex gap-1">
                    {EMOJI_OPTIONS.map((emoji) => {
                      const reaction = message.reactions.find((r) => r.emoji === emoji);
                      return (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg hover:bg-muted"
                          onClick={() => {
                            onReaction(emoji, reaction?.hasReacted || false);
                            setEmojiOpen(false);
                          }}
                        >
                          {emoji}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={onReply}>
                <Reply className="h-4 w-4" />
              </Button>
              {message.isMine && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {message.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${message.isMine ? "justify-end" : ""}`}>
            {message.reactions.map((reaction) => (
              <Button
                key={reaction.emoji}
                variant="outline"
                size="sm"
                className={`h-6 gap-1 px-2 text-xs ${reaction.hasReacted ? "border-primary" : ""}`}
                onClick={() => onReaction(reaction.emoji, reaction.hasReacted)}
              >
                {reaction.emoji} {reaction.count}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
