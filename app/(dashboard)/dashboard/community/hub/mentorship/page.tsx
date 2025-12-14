"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  UserPlus,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMentors,
  getMyMentorProfile,
  getMyMentorships,
  becomeMentor,
  requestMentorship,
  respondToMentorshipRequest,
  type MentorData,
  type MentorshipData,
} from "@/lib/actions/community.action";

export default function MentorshipPage() {
  const [mentors, setMentors] = useState<MentorData[]>([]);
  const [myMentorProfile, setMyMentorProfile] = useState<MentorData | null>(null);
  const [mentorships, setMentorships] = useState<{ asMentor: MentorshipData[]; asMentee: MentorshipData[] }>({
    asMentor: [],
    asMentee: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBecomeMentorOpen, setIsBecomeMentorOpen] = useState(false);
  const [mentorBio, setMentorBio] = useState("");
  const [mentorExpertise, setMentorExpertise] = useState("");
  const [mentorAvailability, setMentorAvailability] = useState("");
  const [mentorMaxMentees, setMentorMaxMentees] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [requestMentorId, setRequestMentorId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [mentorsRes, profileRes, mentorshipsRes] = await Promise.all([
        getMentors(),
        getMyMentorProfile(),
        getMyMentorships(),
      ]);

      if (mentorsRes.data) setMentors(mentorsRes.data);
      if (profileRes.data) {
        setMyMentorProfile(profileRes.data);
        setMentorBio(profileRes.data.bio || "");
        setMentorExpertise(profileRes.data.expertise.join(", "));
        setMentorAvailability(profileRes.data.availability || "");
        setMentorMaxMentees(String(profileRes.data.maxMentees));
      }
      if (mentorshipsRes.data) setMentorships(mentorshipsRes.data);
    } catch (err) {
      console.error("Error loading mentorship data:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBecomeMentor() {
    if (!mentorBio.trim()) return;
    setIsSubmitting(true);

    try {
      const expertise = mentorExpertise
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const res = await becomeMentor({
        bio: mentorBio.trim(),
        expertise,
        availability: mentorAvailability.trim() || undefined,
        maxMentees: parseInt(mentorMaxMentees) || 3,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsBecomeMentorOpen(false);
        loadData();
      }
    } catch (err) {
      console.error("Error becoming mentor:", err);
      setError("Failed to become mentor");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestMentorship() {
    if (!requestMentorId || !requestMessage.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await requestMentorship(requestMentorId, requestMessage.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setRequestMentorId(null);
        setRequestMessage("");
        loadData();
      }
    } catch (err) {
      console.error("Error requesting mentorship:", err);
      setError("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRespondToRequest(mentorshipId: string, accept: boolean) {
    try {
      const res = await respondToMentorshipRequest(mentorshipId, accept);
      if (res.error) {
        setError(res.error);
      } else {
        loadData();
      }
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = mentorships.asMentor.filter((m) => m.status === "PENDING");
  const activeMentorships = [
    ...mentorships.asMentor.filter((m) => m.status === "ACCEPTED"),
    ...mentorships.asMentee.filter((m) => m.status === "ACCEPTED"),
  ];

  const myUserId = myMentorProfile?.userId;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/community/hub">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Mentorship Program
            </h1>
            <p className="text-muted-foreground">Connect with experienced professionals</p>
          </div>
        </div>
        <Dialog open={isBecomeMentorOpen} onOpenChange={setIsBecomeMentorOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {myMentorProfile ? "Edit Mentor Profile" : "Become a Mentor"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{myMentorProfile ? "Edit Mentor Profile" : "Become a Mentor"}</DialogTitle>
              <DialogDescription>
                Share your expertise and help others in their job search journey
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / Introduction</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell potential mentees about yourself and your experience..."
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expertise">Areas of Expertise (comma-separated)</Label>
                <Input
                  id="expertise"
                  placeholder="e.g., Software Engineering, Resume Writing, Interview Prep"
                  value={mentorExpertise}
                  onChange={(e) => setMentorExpertise(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Input
                  id="availability"
                  placeholder="e.g., Weekends, 2 hours/week"
                  value={mentorAvailability}
                  onChange={(e) => setMentorAvailability(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMentees">Maximum Mentees</Label>
                <Input
                  id="maxMentees"
                  type="number"
                  min="1"
                  max="10"
                  value={mentorMaxMentees}
                  onChange={(e) => setMentorMaxMentees(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBecomeMentorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBecomeMentor} disabled={isSubmitting || !mentorBio.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <Button variant="link" className="ml-2 p-0" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <Tabs defaultValue="find">
        <TabsList>
          <TabsTrigger value="find" className="gap-2">
            <Users className="h-4 w-4" />
            Find Mentors
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <Award className="h-4 w-4" />
            My Mentorships
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="mt-6">
          {mentors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No mentors available</h3>
                <p className="text-muted-foreground">Be the first to become a mentor!</p>
                <Button className="mt-4" onClick={() => setIsBecomeMentorOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Become a Mentor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mentors.map((mentor) => (
                <Card key={mentor.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={mentor.avatarUrl || undefined} />
                        <AvatarFallback>{mentor.name[0] || "M"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{mentor.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {mentor.currentMentees}/{mentor.maxMentees} mentees
                        </div>
                        {mentor.availability && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {mentor.availability}
                          </div>
                        )}
                      </div>
                    </div>

                    {mentor.bio && (
                      <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
                        {mentor.bio}
                      </p>
                    )}

                    {mentor.expertise.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {mentor.expertise.slice(0, 4).map((exp) => (
                          <Badge key={exp} variant="secondary" className="text-xs">
                            {exp}
                          </Badge>
                        ))}
                        {mentor.expertise.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.expertise.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      {myUserId && mentor.userId === myUserId ? (
                        <Button disabled className="w-full">
                          This is you
                        </Button>
                      ) : mentor.currentMentees >= mentor.maxMentees ? (
                        <Button disabled className="w-full">
                          Not Accepting Mentees
                        </Button>
                      ) : (
                        <Dialog
                          open={requestMentorId === mentor.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setRequestMentorId(null);
                              setRequestMessage("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              className="w-full"
                              onClick={() => setRequestMentorId(mentor.id)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Request Mentorship
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Request Mentorship</DialogTitle>
                              <DialogDescription>
                                Send a message to {mentor.name} explaining why you'd like them as your mentor
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Textarea
                                placeholder="Introduce yourself and explain what you're hoping to learn..."
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                rows={5}
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setRequestMentorId(null);
                                  setRequestMessage("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleRequestMentorship}
                                disabled={isSubmitting || !requestMessage.trim()}
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Request
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-6 space-y-6">
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Pending Requests
                </CardTitle>
                <CardDescription>
                  Review mentorship requests from potential mentees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <Avatar>
                      <AvatarImage src={request.mentee.avatarUrl || undefined} />
                      <AvatarFallback>{request.mentee.name[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{request.mentee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.message && (
                        <p className="mt-2 text-sm bg-muted p-2 rounded">
                          "{request.message}"
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespondToRequest(request.id, true)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondToRequest(request.id, false)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Active Mentorships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeMentorships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8" />
                  <p>No active mentorships</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMentorships.map((mentorship) => {
                    const isMentor = mentorship.mentor.name === "You";
                    const otherPerson = isMentor ? mentorship.mentee : mentorship.mentor;

                    return (
                      <div
                        key={mentorship.id}
                        className="flex items-center gap-4 rounded-lg border p-4"
                      >
                        <Avatar>
                          <AvatarImage src={otherPerson.avatarUrl || undefined} />
                          <AvatarFallback>{otherPerson.name[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{otherPerson.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {isMentor ? "Your mentee" : "Your mentor"} since{" "}
                            {mentorship.startedAt
                              ? new Date(mentorship.startedAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {isMentor ? "Mentoring" : "Learning"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {mentorships.asMentee.filter((m) => m.status === "PENDING").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Pending Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mentorships.asMentee
                  .filter((m) => m.status === "PENDING")
                  .map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-4 rounded-lg border p-4"
                    >
                      <Avatar>
                        <AvatarImage src={request.mentor.avatarUrl || undefined} />
                        <AvatarFallback>{request.mentor.name[0] || "M"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{request.mentor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
