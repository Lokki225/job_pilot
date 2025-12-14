"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Heart,
  Award,
  TrendingUp,
  Users,
  Star,
  Shield,
  Sparkles,
  BookOpen,
  Trophy,
  Flame,
  HelpCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getOrCreateCommunityProfile,
  updateCommunityProfile,
  getFollowers,
  getFollowing,
  type CommunityProfileData,
} from "@/lib/actions/community.action";

const BADGE_CONFIG: Record<string, { icon: React.ReactNode; label: string; description: string; color: string }> = {
  FIRST_POST: { icon: <MessageSquare className="h-4 w-4" />, label: "First Post", description: "Created your first community post", color: "bg-blue-100 text-blue-800" },
  CONVERSATIONALIST: { icon: <Users className="h-4 w-4" />, label: "Conversationalist", description: "Participated in 50+ discussions", color: "bg-purple-100 text-purple-800" },
  COMMUNITY_FAVORITE: { icon: <Heart className="h-4 w-4" />, label: "Community Favorite", description: "Received 100+ likes on your posts", color: "bg-red-100 text-red-800" },
  RESOURCE_SHARER: { icon: <BookOpen className="h-4 w-4" />, label: "Resource Sharer", description: "Shared 10+ helpful resources", color: "bg-green-100 text-green-800" },
  SUCCESS_STORYTELLER: { icon: <Star className="h-4 w-4" />, label: "Success Storyteller", description: "Shared your job success story", color: "bg-yellow-100 text-yellow-800" },
  MENTOR: { icon: <Shield className="h-4 w-4" />, label: "Mentor", description: "Helped 10+ community members", color: "bg-indigo-100 text-indigo-800" },
  ON_FIRE: { icon: <Flame className="h-4 w-4" />, label: "On Fire", description: "Posted 7 days in a row", color: "bg-orange-100 text-orange-800" },
  EXPERT: { icon: <Sparkles className="h-4 w-4" />, label: "Expert", description: "Recognized industry expert", color: "bg-cyan-100 text-cyan-800" },
  LEGEND: { icon: <Trophy className="h-4 w-4" />, label: "Legend", description: "Top 1% contributor", color: "bg-amber-100 text-amber-800" },
  HELPFUL: { icon: <HelpCircle className="h-4 w-4" />, label: "Helpful", description: "Answered 25+ questions", color: "bg-teal-100 text-teal-800" },
  MODERATOR: { icon: <Shield className="h-4 w-4" />, label: "Moderator", description: "Community moderator", color: "bg-gray-100 text-gray-800" },
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

function getLevelProgress(points: number, level: number): number {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function getPointsToNextLevel(points: number, level: number): number {
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return Math.max(nextThreshold - points, 0);
}

export default function CommunityProfilePage() {
  const [profile, setProfile] = useState<CommunityProfileData | null>(null);
  const [followers, setFollowers] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([]);
  const [following, setFollowing] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editTopics, setEditTopics] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoading(true);
    try {
      const [profileRes, followersRes, followingRes] = await Promise.all([
        getOrCreateCommunityProfile(),
        Promise.resolve({ data: [], error: null }),
        Promise.resolve({ data: [], error: null }),
      ]);

      if (profileRes.error) {
        setError(profileRes.error);
      } else if (profileRes.data) {
        setProfile(profileRes.data);
        setEditBio(profileRes.data.bio || "");
        setEditTopics(profileRes.data.favoriteTopics.join(", "));

        const [fRes, fgRes] = await Promise.all([
          getFollowers(profileRes.data.userId),
          getFollowing(profileRes.data.userId),
        ]);

        if (fRes.data) setFollowers(fRes.data);
        if (fgRes.data) setFollowing(fgRes.data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const topics = editTopics
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const res = await updateCommunityProfile({
        bio: editBio.trim() || undefined,
        favoriteTopics: topics.length > 0 ? topics : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsEditing(false);
        loadProfile();
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">{error || "Profile not found"}</p>
            <Link href="/dashboard/community/hub">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Hub
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const levelProgress = getLevelProgress(profile.reputationPoints, profile.level);
  const pointsToNext = getPointsToNextLevel(profile.reputationPoints, profile.level);

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

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {(profile.user.firstName?.[0] || "") + (profile.user.lastName?.[0] || "") || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {profile.user.firstName} {profile.user.lastName}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Level {profile.level}
                    </Badge>
                    {profile.isModerator && (
                      <Badge className="bg-gray-100 text-gray-800 gap-1">
                        <Shield className="h-3 w-3" />
                        Moderator
                      </Badge>
                    )}
                    {profile.isExpert && (
                      <Badge className="bg-cyan-100 text-cyan-800 gap-1">
                        <Sparkles className="h-3 w-3" />
                        Expert
                      </Badge>
                    )}
                    {profile.isMentor && (
                      <Badge className="bg-indigo-100 text-indigo-800 gap-1">
                        <Award className="h-3 w-3" />
                        Mentor
                      </Badge>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {profile.reputationPoints} reputation points
                  </span>
                  <span className="text-muted-foreground">
                    {pointsToNext > 0 ? `${pointsToNext} to Level ${profile.level + 1}` : "Max Level"}
                  </span>
                </div>
                <Progress value={levelProgress} className="h-2" />
              </div>

              {isEditing ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell the community about yourself..."
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topics">Favorite Topics (comma-separated)</Label>
                    <Input
                      id="topics"
                      placeholder="e.g., tech, remote work, interview tips"
                      value={editTopics}
                      onChange={(e) => setEditTopics(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditBio(profile.bio || "");
                        setEditTopics(profile.favoriteTopics.join(", "));
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}
                  {profile.favoriteTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.favoriteTopics.map((topic) => (
                        <Badge key={topic} variant="outline">
                          #{topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <MessageSquare className="mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">{profile.postsCount}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Heart className="mb-2 h-6 w-6 text-red-500" />
            <p className="text-2xl font-bold">{profile.commentsCount}</p>
            <p className="text-sm text-muted-foreground">Comments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <TrendingUp className="mb-2 h-6 w-6 text-green-500" />
            <p className="text-2xl font-bold">{profile.helpfulVotes}</p>
            <p className="text-sm text-muted-foreground">Helpful Votes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Star className="mb-2 h-6 w-6 text-yellow-500" />
            <p className="text-2xl font-bold">{profile.successStoriesShared}</p>
            <p className="text-sm text-muted-foreground">Stories Shared</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges">
        <TabsList>
          <TabsTrigger value="badges" className="gap-2">
            <Award className="h-4 w-4" />
            Badges ({profile.badges.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="gap-2">
            <Users className="h-4 w-4" />
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="gap-2">
            <Users className="h-4 w-4" />
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-4">
          {profile.badges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No badges yet</h3>
                <p className="text-muted-foreground">
                  Participate in the community to earn badges!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.badges.map((badge) => {
                const config = BADGE_CONFIG[badge.badgeType] || {
                  icon: <Award className="h-4 w-4" />,
                  label: badge.badgeType,
                  description: "",
                  color: "bg-gray-100 text-gray-800",
                };

                return (
                  <Card key={badge.badgeType}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}>
                        {config.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{config.label}</h4>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">All Available Badges</CardTitle>
              <CardDescription>Badges you can earn by participating in the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(BADGE_CONFIG).map(([type, config]) => {
                  const earned = profile.badges.some((b) => b.badgeType === type);
                  return (
                    <Popover key={type}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                            earned ? "" : "opacity-50"
                          }`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.color}`}>
                            {config.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="truncate text-xs text-muted-foreground">{config.description}</p>
                          </div>
                          {earned && (
                            <Badge variant="secondary" className="text-xs">
                              Earned
                            </Badge>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="max-w-sm">
                        <p className="text-sm font-medium">How to earn: {config.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {followers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No followers yet</h3>
                <p className="text-muted-foreground">
                  Share great content to gain followers!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.name[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{user.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          {following.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">Not following anyone</h3>
                <p className="text-muted-foreground">
                  Follow community members to see their posts!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {following.map((user) => (
                <Card key={user.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.name[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{user.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
