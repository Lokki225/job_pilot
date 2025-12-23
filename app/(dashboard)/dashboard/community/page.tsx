"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Eye, ChevronRight, Filter, Loader2, Trophy, Sparkles, PenLine, BarChart3, Bookmark, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MentionText } from "@/components/mentions/MentionText";
import { getSuccessStories, getStoryIndustries, getStoryTags, likeStory, unlikeStory, bookmarkStory, unbookmarkStory, type SuccessStorySummary } from "@/lib/actions/success-stories.action";

export default function CommunityPage() {
  const [stories, setStories] = useState<SuccessStorySummary[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "most_liked" | "most_viewed">("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(t);
  }, [selectedIndustry, selectedTag, sort, searchQuery]);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const [storiesResult, industriesResult, tagsResult] = await Promise.all([
        getSuccessStories({
          industry: selectedIndustry === "all" ? undefined : selectedIndustry,
          query: searchQuery.trim() ? searchQuery.trim() : undefined,
          tag: selectedTag === "all" ? undefined : selectedTag,
          sort,
        }),
        getStoryIndustries(),
        getStoryTags(),
      ]);

      if (storiesResult.error) {
        setError(storiesResult.error);
      } else if (storiesResult.data) {
        setStories(storiesResult.data.stories);
      }

      if (industriesResult.data) {
        setIndustries(industriesResult.data);
      }

      if (tagsResult.data) {
        setTags(tagsResult.data);
      }
    } catch (err) {
      console.error("Error loading community data:", err);
      setError("Failed to load stories");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBookmark(storyId: string, hasBookmarked: boolean) {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? { ...s, hasBookmarked: !hasBookmarked }
          : s
      )
    );

    try {
      const result = hasBookmarked ? await unbookmarkStory(storyId) : await bookmarkStory(storyId);
      if (result.error) {
        setStories((prev) =>
          prev.map((s) =>
            s.id === storyId
              ? { ...s, hasBookmarked: hasBookmarked }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? { ...s, hasBookmarked: hasBookmarked }
            : s
        )
      );
    }
  }

  async function handleLike(storyId: string, hasLiked: boolean) {
    // Optimistic update
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
        // Revert on error
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

  const featuredStories = stories.filter((s) => s.isFeatured);
  const regularStories = stories.filter((s) => !s.isFeatured);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Success Stories
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real stories from job seekers who landed their dream roles
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
          <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
            <Link href="/dashboard/community/hub">
              <Users className="h-4 w-4 mr-2" />
              Community Hub
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
            <Link href="/dashboard/community/leaderboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Leaderboard
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
            <Link href="/dashboard/community/saved">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </Link>
          </Button>
          <Button className="w-full justify-center sm:w-auto" asChild>
            <Link href="/dashboard/community/submit">
              <PenLine className="h-4 w-4 mr-2" />
              Share Your Story
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border bg-background/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filter stories</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories (title, company, role...)"
            className="sm:col-span-2 lg:col-span-2"
          />

          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="most_liked">Most Liked</SelectItem>
              <SelectItem value="most_viewed">Most Viewed</SelectItem>
            </SelectContent>
          </Select>
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
              No stories yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Be the first to share your success story and inspire others!
            </p>
            <Button asChild>
              <Link href="/dashboard/community/submit">
                <PenLine className="h-4 w-4 mr-2" />
                Share Your Story
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Featured Stories */}
          {featuredStories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Featured Stories
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredStories.map((story) => (
                  <StoryCard key={story.id} story={story} onLike={handleLike} onBookmark={handleBookmark} featured />
                ))}
              </div>
            </div>
          )}

          {/* All Stories */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {featuredStories.length > 0 ? "More Stories" : "All Stories"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularStories.map((story) => (
                <StoryCard key={story.id} story={story} onLike={handleLike} onBookmark={handleBookmark} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryCard({
  story,
  onLike,
  onBookmark,
  featured = false,
}: {
  story: SuccessStorySummary;
  onLike: (id: string, hasLiked: boolean) => void;
  onBookmark: (id: string, hasBookmarked: boolean) => void;
  featured?: boolean;
}) {
  const truncatedStory = story.story.length > 150 ? story.story.slice(0, 150) + "..." : story.story;
  const visibleTags = (story.tags || []).slice(0, 3);

  return (
    <Card
      className={`hover:shadow-md transition-all duration-200 ${
        featured ? "border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {story.title || `${story.jobTitle} at ${story.companyName}`}
            </CardTitle>
            <CardDescription>
              {story.jobTitle} @ {story.companyName}
              {story.industry && ` • ${story.industry}`}
            </CardDescription>
          </div>
          {featured && (
            <Badge className="bg-yellow-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <MentionText
            content={truncatedStory}
            onMentionClick={(userId, name) => {
              if (userId) {
                window.location.href = `/dashboard/community/hub/profile/${userId}`;
              }
            }}
          />
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={(e) => {
                e.preventDefault();
                onLike(story.id, story.hasLiked || false);
              }}
              aria-label={story.hasLiked ? `Unlike story \"${story.title || `${story.jobTitle} at ${story.companyName}`}\"` : `Like story \"${story.title || `${story.jobTitle} at ${story.companyName}`}\"`}
              aria-pressed={!!story.hasLiked}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                story.hasLiked ? "text-red-500" : ""
              }`}
            >
              <Heart className={`h-4 w-4 ${story.hasLiked ? "fill-current" : ""}`} />
              {story.likeCount}
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmark(story.id, story.hasBookmarked || false);
              }}
              aria-label={story.hasBookmarked ? `Remove bookmark for story \"${story.title || `${story.jobTitle} at ${story.companyName}`}\"` : `Bookmark story \"${story.title || `${story.jobTitle} at ${story.companyName}`}\"`}
              aria-pressed={!!story.hasBookmarked}
              className={`flex items-center gap-1 hover:text-blue-500 transition-colors ${
                story.hasBookmarked ? "text-blue-500" : ""
              }`}
            >
              <Bookmark className={`h-4 w-4 ${story.hasBookmarked ? "fill-current" : ""}`} />
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
