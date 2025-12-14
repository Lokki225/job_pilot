"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Eye,
  BookmarkCheck,
  Loader2,
  ArrowLeft,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  FileText,
  Megaphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getBookmarkedPosts,
  unbookmarkPost,
  likePost,
  unlikePost,
  type CommunityPostSummary,
  type CommunityPostType,
} from "@/lib/actions/community.action";

const POST_TYPE_CONFIG: Record<CommunityPostType, { label: string; icon: React.ReactNode; color: string }> = {
  TIP: { label: "Tip", icon: <Lightbulb className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  QUESTION: { label: "Question", icon: <HelpCircle className="h-4 w-4" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  DISCUSSION: { label: "Discussion", icon: <MessageSquare className="h-4 w-4" />, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  RESOURCE: { label: "Resource", icon: <FileText className="h-4 w-4" />, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="h-4 w-4" />, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setIsLoading(true);
    try {
      const res = await getBookmarkedPosts();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPosts(res.data);
      }
    } catch (err) {
      console.error("Error loading saved posts:", err);
      setError("Failed to load saved posts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsave(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await unbookmarkPost(postId);
      if (res.error) {
        loadPosts();
      }
    } catch (err) {
      console.error("Error unsaving post:", err);
      loadPosts();
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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/community/hub">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Saved Posts</h1>
          <p className="text-muted-foreground">Posts you've bookmarked for later</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookmarkCheck className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No saved posts</h3>
            <p className="text-muted-foreground">Posts you bookmark will appear here</p>
            <Link href="/dashboard/community/hub">
              <Button className="mt-4">Browse Posts</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const typeConfig = POST_TYPE_CONFIG[post.type];

            return (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.authorAvatar || undefined} />
                      <AvatarFallback>{post.authorName[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{post.authorName}</span>
                        <Badge className={`${typeConfig.color} gap-1`}>
                          {typeConfig.icon}
                          {typeConfig.label}
                        </Badge>
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

                      <div className="mt-3 flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={post.hasLiked ? "text-red-500" : ""}
                          onClick={() => handleLike(post.id, post.hasLiked)}
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
                          className="ml-auto text-primary"
                          onClick={() => handleUnsave(post.id)}
                        >
                          <BookmarkCheck className="mr-1 h-4 w-4" />
                          Unsave
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
