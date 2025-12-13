"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Eye, Calendar, Briefcase, MapPin, DollarSign, Loader2, Lightbulb, MessageSquare, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoryById, likeStory, unlikeStory, type SuccessStoryDetail } from "@/lib/actions/success-stories.action";

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.storyId as string;

  const [story, setStory] = useState<SuccessStoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStory();
  }, [storyId]);

  async function loadStory() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getStoryById(storyId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setStory(result.data);
      }
    } catch (err) {
      console.error("Error loading story:", err);
      setError("Failed to load story");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike() {
    if (!story) return;

    const wasLiked = story.hasLiked;
    setStory((prev) =>
      prev
        ? { ...prev, hasLiked: !wasLiked, likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount + 1 }
        : prev
    );

    try {
      const result = wasLiked ? await unlikeStory(storyId) : await likeStory(storyId);
      if (result.error) {
        setStory((prev) =>
          prev
            ? { ...prev, hasLiked: wasLiked, likeCount: wasLiked ? prev.likeCount + 1 : prev.likeCount - 1 }
            : prev
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="outline" asChild className="mb-6">
          <Link href="/dashboard/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stories
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Story not found</CardTitle>
            <CardDescription>{error || "This story could not be loaded."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(story.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/dashboard/community">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stories
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {story.title || `${story.jobTitle} at ${story.companyName}`}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {story.jobTitle} @ {story.companyName}
          </span>
          {story.industry && (
            <Badge variant="secondary">{story.industry}</Badge>
          )}
          {story.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {story.location}
            </span>
          )}
          {story.salaryRange && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {story.salaryRange}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </span>
          <span>by {story.authorName}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {story.viewCount} views
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Story */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Story</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {story.story.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-4 text-gray-700 dark:text-gray-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Learnings */}
          {story.keyLearnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Key Learnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {story.keyLearnings.map((learning, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{learning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Advice */}
          {story.adviceForOthers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Advice for Others
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{story.adviceForOthers}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Like Button */}
          <div className="flex items-center gap-4">
            <Button
              variant={story.hasLiked ? "default" : "outline"}
              onClick={handleLike}
              className={story.hasLiked ? "bg-red-500 hover:bg-red-600" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${story.hasLiked ? "fill-current" : ""}`} />
              {story.hasLiked ? "Liked" : "Like"} ({story.likeCount})
            </Button>
          </div>
        </div>

        {/* Sidebar - Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Journey Stats
              </CardTitle>
              <CardDescription>
                Auto-tracked from Job Pilot usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {story.daysToOffer !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Days to Offer</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.daysToOffer}</span>
                </div>
              )}
              {story.totalApplications !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Applications</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalApplications}</span>
                </div>
              )}
              {story.totalTrainingSessions !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Training Sessions</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalTrainingSessions}</span>
                </div>
              )}
              {story.avgTrainingScore !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Training Score</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.avgTrainingScore}%</span>
                </div>
              )}
              {story.totalStudyTimeMinutes !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Study Time</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {story.totalStudyTimeMinutes >= 60
                      ? `${Math.floor(story.totalStudyTimeMinutes / 60)}h ${story.totalStudyTimeMinutes % 60}m`
                      : `${story.totalStudyTimeMinutes}m`}
                  </span>
                </div>
              )}
              {story.totalQuestionsPracticed !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Questions Practiced</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{story.totalQuestionsPracticed}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Ready to share your story?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Inspire others by sharing your job search journey.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/community/submit">Share Your Story</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
