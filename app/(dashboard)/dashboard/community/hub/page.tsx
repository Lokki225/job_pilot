"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  BookmarkCheck,
  Filter,
  Loader2,
  PenLine,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  FileText,
  Megaphone,
  Trophy,
  Search,
  Users,
  TrendingUp,
  Clock,
  Hash,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  getCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  getChatRooms,
  getOrCreateCommunityProfile,
  seedDefaultChatRooms,
  searchPeople,
  followUser,
  unfollowUser,
  type CommunityPostSummary,
  type CommunityPostType,
  type ChatRoomSummary,
  type CommunityProfileData,
  type CommunityPersonSearchResult,
} from "@/lib/actions/community.action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase/client";

const POST_TYPE_CONFIG: Record<CommunityPostType, { label: string; icon: React.ReactNode; color: string }> = {
  TIP: { label: "Tip", icon: <Lightbulb className="h-4 w-4" />, color: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" },
  QUESTION: { label: "Question", icon: <HelpCircle className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
  DISCUSSION: { label: "Discussion", icon: <MessageSquare className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" },
  RESOURCE: { label: "Resource", icon: <FileText className="h-4 w-4" />, color: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" },
  ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="h-4 w-4" />, color: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400" },
  TRAINING_RESULT_SHARE: {
    label: "Training Result",
    icon: <Trophy className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  },
};

export default function CommunityHubPage() {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoomSummary[]>([]);
  const [profile, setProfile] = useState<CommunityProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("feed");
  const [postTypeFilter, setPostTypeFilter] = useState<CommunityPostType | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "trending">("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<CommunityPersonSearchResult[]>([]);
  const [isPeopleLoading, setIsPeopleLoading] = useState(false);
  const [pendingFollowIds, setPendingFollowIds] = useState<string[]>([]);

  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostType, setNewPostType] = useState<CommunityPostType>("DISCUSSION");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const realtimePostIdsRef = useRef<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadPosts();
    }, 300);
    return () => clearTimeout(t);
  }, [postTypeFilter, sortBy, searchQuery]);

  useEffect(() => {
    if (activeTab !== "people") return;

    const t = setTimeout(async () => {
      const q = peopleQuery.trim();
      if (!q) {
        setPeopleResults([]);
        return;
      }

      setIsPeopleLoading(true);
      try {
        const res = await searchPeople(q);
        if (res.error) {
          setError(res.error);
          return;
        }
        setPeopleResults(res.data || []);
      } catch (err) {
        console.error("Error searching people:", err);
        setError("Failed to search people");
      } finally {
        setIsPeopleLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [activeTab, peopleQuery]);

  async function toggleFollow(targetUserId: string, currentlyFollowing: boolean) {
    if (pendingFollowIds.includes(targetUserId)) return;
    setPendingFollowIds((prev) => [...prev, targetUserId]);

    setPeopleResults((prev) =>
      prev.map((p) => (p.id === targetUserId ? { ...p, isFollowing: !currentlyFollowing } : p))
    );

    try {
      const res = currentlyFollowing
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);

      if (res.error) {
        setPeopleResults((prev) =>
          prev.map((p) => (p.id === targetUserId ? { ...p, isFollowing: currentlyFollowing } : p))
        );
        setError(res.error);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setPeopleResults((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, isFollowing: currentlyFollowing } : p))
      );
      setError("Failed to update follow");
    } finally {
      setPendingFollowIds((prev) => prev.filter((id) => id !== targetUserId));
    }
  }

  async function loadInitialData() {
    setIsLoading(true);
    try {
      const [postsRes, roomsRes, profileRes] = await Promise.all([
        getCommunityPosts({ sort: sortBy }),
        getChatRooms(),
        getOrCreateCommunityProfile(),
      ]);

      if (postsRes.data) setPosts(postsRes.data);
      if (roomsRes.data) {
        if (roomsRes.data.length === 0) {
          await seedDefaultChatRooms();
          const newRoomsRes = await getChatRooms();
          if (newRoomsRes.data) setChatRooms(newRoomsRes.data);
        } else {
          setChatRooms(roomsRes.data);
        }
      }
      if (profileRes.data) setProfile(profileRes.data);
    } catch (err) {
      console.error("Error loading community data:", err);
      setError("Failed to load community data");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPosts() {
    try {
      const res = await getCommunityPosts({
        type: postTypeFilter === "all" ? undefined : postTypeFilter,
        sort: sortBy,
        search: searchQuery.trim() || undefined,
      });
      if (res.data) {
        setPosts(res.data);
        realtimePostIdsRef.current = res.data.map((post) => post.id);
      }
    } catch (err) {
      console.error("Error loading posts:", err);
    }
  }

  useEffect(() => {
    const postIds = realtimePostIdsRef.current;
    if (!postIds.length) return;

    const filterValues = postIds.map((id) => `"${id}"`).join(",");
    if (!filterValues) return;

    const channel = supabase
      .channel(`community_posts_feed_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_posts",
          filter: `id=in.(${filterValues})`,
        },
        (payload) => {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.new.id
                ? {
                    ...post,
                    likesCount: payload.new.likesCount,
                    commentsCount: payload.new.commentsCount,
                    viewsCount: payload.new.viewsCount,
                  }
                : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [posts]);

  async function handleCreatePost() {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);

    try {
      const tags = newPostTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const res = await createPost({
        type: newPostType,
        title: newPostTitle.trim() || undefined,
        content: newPostContent.trim(),
        tags: tags.length > 0 ? tags : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsCreatePostOpen(false);
        setNewPostType("DISCUSSION");
        setNewPostTitle("");
        setNewPostContent("");
        setNewPostTags("");
        loadPosts();
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLike(postId: string, hasLiked: boolean) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, hasLiked: !hasLiked, likesCount: hasLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );

    try {
      const res = hasLiked ? await unlikePost(postId) : await likePost(postId);
      if (res.error) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, hasLiked, likesCount: hasLiked ? p.likesCount + 1 : p.likesCount - 1 }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  }

  async function handleBookmark(postId: string, hasBookmarked: boolean) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, hasBookmarked: !hasBookmarked } : p))
    );

    try {
      const res = hasBookmarked ? await unbookmarkPost(postId) : await bookmarkPost(postId);
      if (res.error) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, hasBookmarked } : p))
        );
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  }

  const filteredPosts = useMemo(() => {
    return posts;
  }, [posts]);

  const roomsByCategory = useMemo(() => {
    const grouped: Record<string, ChatRoomSummary[]> = {};
    chatRooms.forEach((room) => {
      const cat = room.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(room);
    });
    return grouped;
  }, [chatRooms]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Community Hub</h1>
          <p className="text-muted-foreground">Connect, share, and learn with fellow job seekers</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/community">
            <Button variant="outline">Success Stories</Button>
          </Link>
          <Link href="/dashboard/community/kits">
            <Button variant="outline">Kits</Button>
          </Link>
          <Link href="/dashboard/community/kits/marketplace">
            <Button variant="outline">Marketplace</Button>
          </Link>
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button>
                <PenLine className="mr-2 h-4 w-4" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a Post</DialogTitle>
                <DialogDescription>Share tips, ask questions, or start a discussion</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Post Type</Label>
                  <Select value={newPostType} onValueChange={(v) => setNewPostType(v as CommunityPostType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(POST_TYPE_CONFIG) as CommunityPostType[])
                        .filter((t) => t !== "ANNOUNCEMENT" && t !== "TRAINING_RESULT_SHARE")
                        .map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {POST_TYPE_CONFIG[type].icon}
                              {POST_TYPE_CONFIG[type].label}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="Give your post a title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="What would you like to share?"
                    rows={5}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., interview, resume, remote"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost} disabled={isSubmitting || !newPostContent.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Post
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <Button variant="link" className="ml-2 p-0" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="feed" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="rooms" className="gap-2">
                <Users className="h-4 w-4" />
                Chat Rooms
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-2">
                <Users className="h-4 w-4" />
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={postTypeFilter} onValueChange={(v) => setPostTypeFilter(v as CommunityPostType | "all")}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {(Object.keys(POST_TYPE_CONFIG) as CommunityPostType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {POST_TYPE_CONFIG[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "recent" | "popular" | "trending")}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Recent
                        </div>
                      </SelectItem>
                      <SelectItem value="popular">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Popular
                        </div>
                      </SelectItem>
                      <SelectItem value="trending">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Trending
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No posts yet</h3>
                    <p className="text-muted-foreground">Be the first to share something!</p>
                    <Button className="mt-4" onClick={() => setIsCreatePostOpen(true)}>
                      <PenLine className="mr-2 h-4 w-4" />
                      Create Post
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={() => handleLike(post.id, post.hasLiked)}
                      onBookmark={() => handleBookmark(post.id, post.hasBookmarked)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rooms" className="space-y-6">
              {Object.entries(roomsByCategory).map(([category, rooms]) => (
                <div key={category}>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {category.replace("-", " ")}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rooms.map((room) => (
                      <Link key={room.id} href={`/dashboard/community/hub/chat/${room.slug}`}>
                        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                          <CardContent className="flex items-center gap-3 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                              {room.icon || "💬"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium">{room.name}</h4>
                              <p className="truncate text-sm text-muted-foreground">{room.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {room.memberCount}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="people" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search people by name or headline..."
                  className="pl-9"
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                />
              </div>

              {isPeopleLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : peopleQuery.trim() && peopleResults.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">No people found.</p>
                  </CardContent>
                </Card>
              ) : peopleResults.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Search for people to connect with.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {peopleResults.map((person) => (
                    <Card key={person.id}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Link href={`/dashboard/community/hub/profile/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={person.avatarUrl || undefined} />
                            <AvatarFallback>{person.name[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{person.name}</p>
                            {person.headline && (
                              <p className="truncate text-sm text-muted-foreground">{person.headline}</p>
                            )}
                          </div>
                        </Link>
                        <Button
                          variant={person.isFollowing ? "outline" : "default"}
                          size="sm"
                          disabled={pendingFollowIds.includes(person.id)}
                          onClick={() => toggleFollow(person.id, person.isFollowing)}
                        >
                          {person.isFollowing ? "Following" : "Follow"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {profile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.user.avatarUrl || undefined} />
                    <AvatarFallback>
                      {(profile.user.firstName?.[0] || "") + (profile.user.lastName?.[0] || "") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {profile.user.firstName} {profile.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">Level {profile.level}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-semibold">{profile.postsCount}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-semibold">{profile.commentsCount}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-semibold">{profile.reputationPoints}</p>
                    <p className="text-xs text-muted-foreground">Rep</p>
                  </div>
                </div>
                {profile.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.badges.slice(0, 5).map((badge) => (
                      <Badge key={badge.badgeType} variant="secondary" className="text-xs">
                        {badge.badgeType.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/community" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Success Stories
                </Button>
              </Link>
              <Link href="/dashboard/community/hub/saved" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved Posts
                </Button>
              </Link>
              <Link href="/dashboard/community/hub/leaderboard" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Leaderboard
                </Button>
              </Link>
              <Link href="/dashboard/community/hub/profile" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  My Profile
                </Button>
              </Link>
              <Link href="/dashboard/community/hub/mentorship" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Mentorship
                </Button>
              </Link>
              <Link href="/dashboard/community/hub/guidelines" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Filter className="mr-2 h-4 w-4" />
                  Guidelines
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Popular Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["interview", "resume", "remote", "tech", "salary", "networking", "career-change"].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setSearchQuery(tag)}
                  >
                    <Hash className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  onLike,
  onBookmark,
}: {
  post: CommunityPostSummary;
  onLike: () => void;
  onBookmark: () => void;
}) {
  const typeConfig = POST_TYPE_CONFIG[post.type];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.authorAvatar || undefined} />
            <AvatarFallback>{post.authorName[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/community/hub/profile/${post.userId}`}
                className="font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {post.authorName}
              </Link>
              <Badge className={`${typeConfig.color} gap-1`}>
                {typeConfig.icon}
                {typeConfig.label}
              </Badge>
              {post.isPinned && (
                <Badge variant="outline" className="text-xs">
                  📌 Pinned
                </Badge>
              )}
              {post.isFeatured && (
                <Badge variant="outline" className="text-xs text-yellow-600">
                  ⭐ Featured
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>

            {post.title && <h3 className="mt-2 font-semibold">{post.title}</h3>}

            <p className="mt-2 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
              {post.content}
            </p>

            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={post.hasLiked ? "text-red-500" : ""}
                aria-label={post.hasLiked ? `Unlike post` : `Like post`}
                aria-pressed={post.hasLiked}
                onClick={onLike}
              >
                <Heart className={`mr-1 h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`} />
                {post.likesCount}
              </Button>
              <Link href={`/dashboard/community/hub/post/${post.id}`}>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="mr-1 h-4 w-4" />
                  {post.commentsCount}
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                <Eye className="mr-1 h-4 w-4" />
                {post.viewsCount}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={post.hasBookmarked ? "text-primary" : ""}
                aria-label={post.hasBookmarked ? `Unsave post` : `Save post`}
                aria-pressed={post.hasBookmarked}
                onClick={onBookmark}
              >
                {post.hasBookmarked ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <Link href={`/dashboard/community/hub/post/${post.id}`} className="ml-auto">
                <Button size="sm">View full post</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Post actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
