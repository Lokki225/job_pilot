/**
 * Mention system utilities for parsing, rendering, and handling mentions
 * across chat, posts, stories, and comments
 */

export interface MentionMatch {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  start: number;
  end: number;
}

/**
 * Parse mentions from text content
 * Matches @username (single-token, no spaces)
 */
export function parseMentions(content: string): MentionMatch[] {
  const mentionRegex = /@([\w.]+)/g;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      id: match[0],
      userId: "",
      username: match[1],
      displayName: "",
      avatarUrl: null,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Extract unique mention usernames from content
 */
export function extractMentionUsernames(content: string): string[] {
  const mentions = parseMentions(content);
  return [...new Set(mentions.map((m) => m.username))];
}

/**
 * Replace mentions with enriched data
 * Used for rendering in UI
 */
export function renderMentions(
  content: string,
  mentionMap: Map<string, { userId: string; username: string; displayName: string; avatarUrl: string | null }>
): { text: string; mentions: MentionMatch[] } {
  const mentions = parseMentions(content);
  const enrichedMentions: MentionMatch[] = [];

  mentions.forEach((mention) => {
    const found = mentionMap.get(mention.username.toLowerCase());
    if (found) {
      enrichedMentions.push({
        ...mention,
        userId: found.userId,
        displayName: found.displayName,
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
  username: string,
  mentionMap: Map<string, { userId: string; username: string; displayName: string; avatarUrl: string | null }>
): boolean {
  return mentionMap.has(username.toLowerCase());
}

/**
 * Extract user IDs from mentions in content
 */
export function extractMentionedUserIds(
  content: string,
  mentionMap: Map<string, { userId: string; username: string; displayName: string; avatarUrl: string | null }>
): string[] {
  const mentions = parseMentions(content);
  const userIds: string[] = [];

  mentions.forEach((mention) => {
    const found = mentionMap.get(mention.username.toLowerCase());
    if (found) {
      userIds.push(found.userId);
    }
  });

  return [...new Set(userIds)];
}

/**
 * Format mention for storage/transmission
 * Uses username token (single-word, no spaces)
 */
export function formatMention(username: string): string {
  return `@${username.trim()}`;
}

/**
 * Create a mention string for a user
 * Uses username, not display name
 */
export function createMention(username: string): string {
  return formatMention(username);
}
