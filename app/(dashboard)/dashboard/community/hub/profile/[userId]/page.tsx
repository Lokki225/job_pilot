"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Trophy,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  FileText,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";

export default function PublicCommunityProfilePage() {
  const [data, setData] = useState<PublicCommunityProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const params = useParams();
  const userId = useMemo(() => {
    const raw = (params as any)?.userId;
    if (Array.isArray(raw)) return raw[0] || "";
    return raw || "";
  }, [params]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) return;
      if (!options?.silent) {
        setIsLoading(true);
      }
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
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    load();
  }, [load]);

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

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      load({ silent: true });
    }, 400);
  }, [load]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`community_profile_stats_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_profiles",
          filter: `userId=eq.${userId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_posts",
          filter: `userId=eq.${userId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_post_comments",
          filter: `userId=eq.${userId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "success_stories",
          filter: `userId=eq.${userId}`,
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [scheduleRefresh, userId]);

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
            <Button className="mt-4" onClick={() => load()}>
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
                {data.isMe && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link href="/dashboard/profile">
                      <Button variant="outline" size="sm">
                        Edit Profile
                      </Button>
                    </Link>
                    {data.resumeUrl && (
                      <Button size="sm" onClick={() => setIsResumePreviewOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Preview Resume
                      </Button>
                    )}
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

      {Object.values(data.contact).some((value) => value) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {data.contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${data.contact.email}`} className="hover:text-primary">
                  {data.contact.email}
                </a>
              </div>
            )}
            {data.contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4" />
                <a href={`tel:${data.contact.phone}`} className="hover:text-primary">
                  {data.contact.phone}
                </a>
              </div>
            )}
            {data.contact.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4" />
                <span>{data.contact.location}</span>
              </div>
            )}
            {data.contact.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4" />
                <a href={data.contact.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  {data.contact.website}
                </a>
              </div>
            )}
            {data.contact.linkedinUrl && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-4 w-4" />
                <a href={data.contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  {data.contact.linkedinUrl}
                </a>
              </div>
            )}
            {data.contact.githubUrl && (
              <div className="flex items-center gap-3">
                <Github className="h-4 w-4" />
                <a href={data.contact.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  {data.contact.githubUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {(data.kitMastery || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4" />
                  Kit Mastery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.kitMastery.slice(0, 6).map((m) => (
                    <div key={m.kitId} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.kitTitle}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.sessionsCount} session{m.sessionsCount === 1 ? "" : "s"}
                            {m.lastPracticedAt ? ` • Last: ${new Date(m.lastPracticedAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          Best {m.bestScore}/100
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Avg {m.avgScore}/100
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Completion {m.avgCompletionRate}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

      {data.resumeUrl && (
        <Dialog open={isResumePreviewOpen} onOpenChange={setIsResumePreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{data.name}'s Resume</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border">
                <iframe src={data.resumeUrl} className="h-[70vh] w-full rounded-lg" title="Resume preview" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setIsResumePreviewOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <a href={data.resumeUrl} target="_blank" rel="noopener noreferrer">
                    Download Resume
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
