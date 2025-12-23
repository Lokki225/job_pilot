/**
 * Mention system utilities for parsing, rendering, and handling mentions
 * across chat, posts, stories, and comments
 */

export interface MentionMatch {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  start: number;
  end: number;
}

/**
 * Parse mentions from text content
 * Matches @username or @firstName lastName patterns
 */
export function parseMentions(content: string): MentionMatch[] {
  const mentionRegex = /@([a-zA-Z0-9_\s-]+)/g;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      id: match[0],
      userId: "",
      name: match[1],
      avatarUrl: null,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Extract unique mention names from content
 */
export function extractMentionNames(content: string): string[] {
  const mentions = parseMentions(content);
  return [...new Set(mentions.map((m) => m.name))];
}

/**
 * Replace mentions with formatted HTML/JSX
 * Used for rendering in UI
 */
export function renderMentions(
  content: string,
  mentionMap: Map<string, { userId: string; name: string; avatarUrl: string | null }>
): { text: string; mentions: MentionMatch[] } {
  const mentions = parseMentions(content);
  const enrichedMentions: MentionMatch[] = [];

  mentions.forEach((mention) => {
    const found = mentionMap.get(mention.name.toLowerCase());
    if (found) {
      enrichedMentions.push({
        ...mention,
        userId: found.userId,
        avatarUrl: found.avatarUrl,
      });
    }
  });

  return {
    text: content,
    mentions: enrichedMentions,
  };
}

/**
 * Sanitize content to prevent mention spam
 * Limits mentions per message
 */
export function sanitizeMentions(content: string, maxMentions: number = 10): string {
  const mentions = parseMentions(content);
  if (mentions.length <= maxMentions) return content;

  // Keep only first N mentions
  const kept = mentions.slice(0, maxMentions);
  let result = content;

  // Remove mentions beyond the limit (in reverse order to preserve indices)
  for (let i = mentions.length - 1; i >= maxMentions; i--) {
    const mention = mentions[i];
    result = result.substring(0, mention.start) + mention.id.slice(1) + result.substring(mention.end);
  }

  return result;
}

/**
 * Check if a mention is valid (user exists and is mentionable)
 */
export function isValidMention(
  mentionName: string,
  mentionMap: Map<string, { userId: string; name: string; avatarUrl: string | null }>
): boolean {
  return mentionMap.has(mentionName.toLowerCase());
}

/**
 * Extract user IDs from mentions in content
 */
export function extractMentionedUserIds(
  content: string,
  mentionMap: Map<string, { userId: string; name: string; avatarUrl: string | null }>
): string[] {
  const mentions = parseMentions(content);
  const userIds: string[] = [];

  mentions.forEach((mention) => {
    const found = mentionMap.get(mention.name.toLowerCase());
    if (found) {
      userIds.push(found.userId);
    }
  });

  return [...new Set(userIds)];
}

/**
 * Format mention for storage/transmission
 * Ensures consistent format across the system
 */
export function formatMention(name: string): string {
  return `@${name.trim()}`;
}

/**
 * Create a mention string for a user
 */
export function createMention(firstName: string, lastName?: string): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return formatMention(fullName);
}
