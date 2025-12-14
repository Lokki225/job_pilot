"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, ChevronRight, Eye, Heart, Loader2, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getBookmarkedStories,
  likeStory,
  unlikeStory,
  unbookmarkStory,
  type SuccessStorySummary,
} from "@/lib/actions/success-stories.action";

export default function SavedStoriesPage() {
  const [stories, setStories] = useState<SuccessStorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBookmarkedStories();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setStories(result.data);
      }
    } catch (err) {
      console.error("Error loading saved stories:", err);
      setError("Failed to load saved stories");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike(storyId: string, hasLiked: boolean) {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? { ...s, hasLiked: !hasLiked, likeCount: hasLiked ? s.likeCount - 1 : s.likeCount + 1 }
          : s
      )
    );

    try {
      const result = hasLiked ? await unlikeStory(storyId) : await likeStory(storyId);
      if (result.error) {
        setStories((prev) =>
          prev.map((s) =>
            s.id === storyId
              ? { ...s, hasLiked: hasLiked, likeCount: hasLiked ? s.likeCount + 1 : s.likeCount - 1 }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  }

  async function handleUnsave(storyId: string) {
    const before = stories;
    setStories((prev) => prev.filter((s) => s.id !== storyId));

    try {
      const result = await unbookmarkStory(storyId);
      if (result.error) {
        setStories(before);
      }
    } catch (err) {
      console.error("Error removing bookmark:", err);
      setStories(before);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/community">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Stories
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/community/hub">
                <Users className="h-4 w-4 mr-2" />
                Community Hub
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-blue-500" />
            Saved Stories
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your bookmarked success stories.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Button variant="outline" onClick={loadData}>
            Try Again
          </Button>
        </div>
      ) : stories.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No saved stories
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Bookmark stories to see them here.
            </p>
            <Button asChild>
              <Link href="/dashboard/community">Browse Stories</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onLike={handleLike}
              onUnsave={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({
  story,
  onLike,
  onUnsave,
}: {
  story: SuccessStorySummary;
  onLike: (id: string, hasLiked: boolean) => void;
  onUnsave: (id: string) => void;
}) {
  const truncatedStory = story.story.length > 150 ? story.story.slice(0, 150) + "..." : story.story;
  const visibleTags = (story.tags || []).slice(0, 3);

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg text-gray-900 dark:text-white truncate">
              {story.title || `${story.jobTitle} at ${story.companyName}`}
            </CardTitle>
            <CardDescription>
              {story.jobTitle} @ {story.companyName}
              {story.industry && ` • ${story.industry}`}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUnsave(story.id)}
            className="shrink-0"
          >
            <Bookmark className="h-4 w-4 mr-2 fill-current" />
            Unsave
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {story.coverImageUrl && (
          <div className="mb-3 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
            <img
              src={story.coverImageUrl}
              alt="Story cover"
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {visibleTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
            {(story.tags || []).length > visibleTags.length && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{(story.tags || []).length - visibleTags.length}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{truncatedStory}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={(e) => {
                e.preventDefault();
                onLike(story.id, story.hasLiked || false);
              }}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                story.hasLiked ? "text-red-500" : ""
              }`}
            >
              <Heart className={`h-4 w-4 ${story.hasLiked ? "fill-current" : ""}`} />
              {story.likeCount}
            </button>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {story.viewCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">by {story.authorName}</span>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/community/${story.id}`}>
                Read <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
