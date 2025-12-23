"use client";

import React from "react";
import { parseMentions } from "@/lib/utils/mentions";

interface MentionTextProps {
  content: string;
  className?: string;
  mentionClassName?: string;
  onMentionClick?: (userId: string, username: string) => void;
}

/**
 * Component to render text with highlighted mentions
 * Parses @username tokens and renders them as clickable links
 * Uses username for storage, displayName for UI display
 */
export function MentionText({
  content,
  className = "",
  mentionClassName,
  onMentionClick,
}: MentionTextProps) {
  const mentions = parseMentions(content);

  if (mentions.length === 0) {
    return <span className={className}>{content}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mentions.forEach((mention) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex, mention.start)}
        </span>
      );
    }

    // Add mention as clickable element with enhanced styling
    const mentionText = content.substring(mention.start, mention.end);
    const defaultMentionClass =
      mentionClassName ||
      "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary font-semibold hover:bg-primary/25 transition-colors cursor-pointer";

    parts.push(
      <span
        key={`mention-${mention.start}`}
        className={defaultMentionClass}
        onClick={() => onMentionClick?.(mention.userId, mention.username)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onMentionClick?.(mention.userId, mention.username);
          }
        }}
      >
        {mentionText}
      </span>
    );

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {content.substring(lastIndex)}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
}
