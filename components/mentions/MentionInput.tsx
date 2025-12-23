"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface MentionSuggestion {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: MentionSuggestion[];
  isLoadingSuggestions?: boolean;
  onMentionSelect?: (suggestion: MentionSuggestion) => void;
  onMentionQueryChange?: (query: string | null) => void;
}

/**
 * Input component with mention autocomplete support
 * Shows suggestions when user types @
 */
export function MentionInput({
  value,
  onChange,
  onKeyDown,
  disabled = false,
  placeholder = "Type a message... (use @ to mention)",
  suggestions = [],
  isLoadingSuggestions = false,
  onMentionSelect,
  onMentionQueryChange,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the current mention being typed
  const findCurrentMention = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) return null;

    const afterAt = beforeCursor.substring(lastAtIndex + 1);
    if (afterAt.includes(" ") || afterAt.includes("\n")) return null;

    return {
      query: afterAt,
      startIndex: lastAtIndex,
    };
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.currentTarget.selectionStart || 0;
    const mention = findCurrentMention(newValue, cursorPos);

    if (mention) {
      setMentionStartPos(mention.startIndex);
      if (mention.query.length > 0) {
        setMentionQuery(mention.query);
        onMentionQueryChange?.(mention.query);
        const filtered = suggestions.filter((s) => {
          const target = `${s.displayName} ${s.username}`.toLowerCase();
          return target.includes(mention.query.toLowerCase());
        });
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        // Show all suggestions when user just types @
        setMentionQuery("");
        onMentionQueryChange?.("");
        setFilteredSuggestions(suggestions);
        setShowSuggestions(true);
        setSelectedIndex(0);
      }
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
      onMentionQueryChange?.(null);
      setFilteredSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: MentionSuggestion) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const mention = findCurrentMention(value, cursorPos);

    if (mention) {
      const before = value.substring(0, mention.startIndex);
      const after = value.substring(cursorPos);
      const newValue = `${before}@${suggestion.username}${after.startsWith(" ") ? "" : " "}${after}`;
      onChange(newValue);
      onMentionSelect?.(suggestion);
      setShowSuggestions(false);
      setMentionQuery("");
      onMentionQueryChange?.(null);
      setFilteredSuggestions([]);

      // Focus input and move cursor after mention
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = before.length + suggestion.username.length + 1;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      onKeyDown?.(e);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        onKeyDown?.(e);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="pr-10"
      />

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-xl z-50"
        >
          {mentionQuery && (
            <div className="sticky top-0 px-4 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
              Mentioning "{mentionQuery}"
            </div>
          )}
          <div className="py-2">
            {isLoadingSuggestions ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Searching users…</div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.userId}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    index === selectedIndex
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                    <AvatarImage src={suggestion.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs font-semibold">
                      {suggestion.displayName[0]?.toUpperCase() || suggestion.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{suggestion.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{suggestion.username}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {mentionQuery ? "No users found. Keep typing…" : "Type after @ to search users"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
