"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, BarChart3, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getUserSuccessStats, submitSuccessStory, type SuccessStoryStats } from "@/lib/actions/success-stories.action";

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Marketing",
  "Sales",
  "Engineering",
  "Design",
  "Consulting",
  "Legal",
  "Manufacturing",
  "Retail",
  "Media",
  "Non-profit",
  "Government",
  "Other",
];

export default function SubmitStoryPage() {
  const router = useRouter();

  const [stats, setStats] = useState<SuccessStoryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [keyLearnings, setKeyLearnings] = useState<string[]>([""]);
  const [adviceForOthers, setAdviceForOthers] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setIsLoadingStats(true);
    try {
      const result = await getUserSuccessStats();
      if (result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }

  function addLearning() {
    setKeyLearnings([...keyLearnings, ""]);
  }

  function updateLearning(index: number, value: string) {
    const updated = [...keyLearnings];
    updated[index] = value;
    setKeyLearnings(updated);
  }

  function removeLearning(index: number) {
    if (keyLearnings.length > 1) {
      setKeyLearnings(keyLearnings.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!jobTitle.trim() || !companyName.trim() || !story.trim()) {
      setError("Please fill in the required fields: Job Title, Company Name, and Your Story.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitSuccessStory({
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        industry: industry || undefined,
        location: location || undefined,
        salaryRange: salaryRange || undefined,
        title: title || undefined,
        story: story.trim(),
        keyLearnings: keyLearnings.filter((l) => l.trim()),
        adviceForOthers: adviceForOthers || undefined,
        isAnonymous,
        displayName: isAnonymous ? displayName || undefined : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        router.push(`/dashboard/community/${result.data.id}`);
      }
    } catch (err) {
      console.error("Error submitting story:", err);
      setError("Failed to submit story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/dashboard/community">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stories
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Share Your Success Story
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Inspire others by sharing your journey to landing your dream job.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>Tell us about the role you landed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Software Engineer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryRange">Salary Range (optional)</Label>
                  <Input
                    id="salaryRange"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $120k - $150k"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Your Story */}
            <Card>
              <CardHeader>
                <CardTitle>Your Story</CardTitle>
                <CardDescription>Share your journey and what helped you succeed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Story Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. From bootcamp to FAANG in 6 months"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story">Your Story *</Label>
                  <Textarea
                    id="story"
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Share your job search journey, challenges you faced, and how you overcame them..."
                    rows={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Key Learnings</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    What are the main takeaways from your experience?
                  </p>
                  {keyLearnings.map((learning, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={learning}
                        onChange={(e) => updateLearning(index, e.target.value)}
                        placeholder={`Learning ${index + 1}`}
                      />
                      {keyLearnings.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeLearning(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLearning}>
                    + Add Learning
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advice">Advice for Others</Label>
                  <Textarea
                    id="advice"
                    value={adviceForOthers}
                    onChange={(e) => setAdviceForOthers(e.target.value)}
                    placeholder="What advice would you give to someone in a similar situation?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anonymous">Post Anonymously</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your name won't be shown on the story
                    </p>
                  </div>
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                </div>

                {isAnonymous && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Career Changer"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Story
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Sidebar - Stats Preview */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Your Stats
              </CardTitle>
              <CardDescription>
                These will be auto-attached to your story
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : stats ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Applications</span>
                    <span className="font-semibold">{stats.totalApplications}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Training Sessions</span>
                    <span className="font-semibold">{stats.totalTrainingSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Score</span>
                    <span className="font-semibold">{stats.avgTrainingScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Study Time</span>
                    <span className="font-semibold">{stats.totalStudyTimeMinutes}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Questions Practiced</span>
                    <span className="font-semibold">{stats.totalQuestionsPracticed}</span>
                  </div>
                  {stats.daysToOffer !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Days to Offer</span>
                      <span className="font-semibold">{stats.daysToOffer}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Stats will be calculated when you submit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
