"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Users,
  MessageSquare,
  Star,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  followUser,
  getPublicCommunityProfile,
  unfollowUser,
  type PublicCommunityProfileData,
} from "@/lib/actions/community.action";
import { RequestInterviewDialog } from "@/components/interviews/RequestInterviewDialog";

export default function PublicCommunityProfilePage() {
  const [data, setData] = useState<PublicCommunityProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const params = useParams();
  const userId = useMemo(() => {
    const raw = (params as any)?.userId;
    if (Array.isArray(raw)) return raw[0] || "";
    return raw || "";
  }, [params]);

  useEffect(() => {
    load();
  }, [userId]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPublicCommunityProfile(userId);
      if (res.error) {
        setError(res.error);
        setData(null);
        return;
      }
      setData(res.data);
    } catch (err) {
      console.error("Error loading public profile:", err);
      setError("Failed to load profile");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  const badgeLabels = useMemo(() => {
    const badges = data?.communityProfile?.badges || [];
    return badges.map((b) => b.badgeType.replace(/_/g, " "));
  }, [data]);

  async function handleToggleFollow() {
    if (!data || data.isMe) return;
    if (isTogglingFollow) return;

    const currentlyFollowing = data.isFollowing;
    setIsTogglingFollow(true);

    setData((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !currentlyFollowing,
            isMutualFollowing: !currentlyFollowing ? prev.isFollowedBy : false,
            followersCount: currentlyFollowing
              ? Math.max((prev.followersCount || 0) - 1, 0)
              : (prev.followersCount || 0) + 1,
          }
        : prev
    );

    try {
      const res = currentlyFollowing ? await unfollowUser(userId) : await followUser(userId);
      if (res.error) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: currentlyFollowing,
                isMutualFollowing: currentlyFollowing ? prev.isFollowedBy : false,
                followersCount: currentlyFollowing
                  ? (prev.followersCount || 0) + 1
                  : Math.max((prev.followersCount || 0) - 1, 0),
              }
            : prev
        );
        setError(res.error);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setData((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: currentlyFollowing,
              isMutualFollowing: currentlyFollowing ? prev.isFollowedBy : false,
              followersCount: currentlyFollowing
                ? (prev.followersCount || 0) + 1
                : Math.max((prev.followersCount || 0) - 1, 0),
            }
          : prev
      );
      setError("Failed to update follow");
    } finally {
      setIsTogglingFollow(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/community/hub">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hub
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">{error || "Profile not found"}</p>
            <Button className="mt-4" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/community/hub">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <Button variant="link" className="ml-2 p-0" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={data.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">{data.name[0] || "U"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold">{data.name}</h1>
                  {data.headline && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">{data.headline}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">Level {data.communityProfile.level}</Badge>
                    {data.communityProfile.isMentor && <Badge variant="secondary">Mentor</Badge>}
                    {data.communityProfile.isExpert && <Badge variant="secondary">Expert</Badge>}
                    {data.communityProfile.isModerator && <Badge variant="secondary">Moderator</Badge>}
                  </div>
                </div>

                {!data.isMe && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <RequestInterviewDialog targetUserId={userId} />
                    <Button
                      onClick={handleToggleFollow}
                      disabled={isTogglingFollow}
                      variant={data.isFollowing ? "outline" : "default"}
                    >
                      {isTogglingFollow ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : data.isFollowing ? (
                        <UserCheck className="mr-2 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      {data.isFollowing ? "Following" : "Follow"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-lg font-semibold">{data.followersCount}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-lg font-semibold">{data.followingCount}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-lg font-semibold">{data.communityProfile.postsCount}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-lg font-semibold">{data.communityProfile.successStoriesShared}</p>
                  <p className="text-xs text-muted-foreground">Stories</p>
                </div>
              </div>

              {data.communityProfile.bio && (
                <div className="rounded-lg border p-4">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.communityProfile.bio}</p>
                </div>
              )}

              {badgeLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badgeLabels.slice(0, 12).map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Users className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Star className="h-4 w-4" />
            Stories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favorite Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {data.communityProfile.favoriteTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.communityProfile.favoriteTopics.slice(0, 24).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {!data.settings.showPostsToCommunity ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Posts are hidden on this profile.</p>
              </CardContent>
            </Card>
          ) : data.posts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">No posts yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {post.title && <p className="truncate font-medium">{post.title}</p>}
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {post.content}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {post.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/community/hub/post/${post.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          {!data.settings.showStoriesToCommunity ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Stories are hidden on this profile.</p>
              </CardContent>
            </Card>
          ) : data.stories.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">No published stories yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.stories.map((s: any) => (
                <Link key={s.id} href={`/dashboard/community/${s.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {[s.jobTitle, s.companyName].filter(Boolean).join(" • ")}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                            </span>
                            {Array.isArray(s.tags) && s.tags.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {s.tags[0]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Read
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
