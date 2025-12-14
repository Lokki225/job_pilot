"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Heart,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Lock,
  Flag,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CommunityGuidelinesPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/community/hub">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Community Guidelines
          </h1>
          <p className="text-muted-foreground">
            Rules and best practices for our job seeker community
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Our Community Values
          </CardTitle>
          <CardDescription>
            The Job Pilot community is built on mutual support and respect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We're all here for the same reason: to help each other succeed in our job search
            journeys. Whether you're looking for your first job, making a career change, or
            climbing the ladder, this community is here to support you.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Supportive</p>
                <p className="text-sm text-muted-foreground">
                  Lift each other up, celebrate wins, and offer encouragement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Constructive</p>
                <p className="text-sm text-muted-foreground">
                  Share actionable advice and helpful feedback
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Respectful</p>
                <p className="text-sm text-muted-foreground">
                  Treat everyone with dignity regardless of background
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Safe</p>
                <p className="text-sm text-muted-foreground">
                  Protect privacy and maintain a harassment-free space
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Do's - Encouraged Behavior
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Share your experiences and insights</p>
                <p className="text-sm text-muted-foreground">
                  Your journey can help others facing similar challenges
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Ask questions and seek advice</p>
                <p className="text-sm text-muted-foreground">
                  No question is too basic - we all started somewhere
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Provide constructive feedback</p>
                <p className="text-sm text-muted-foreground">
                  When reviewing resumes or giving advice, be specific and helpful
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Celebrate others' successes</p>
                <p className="text-sm text-muted-foreground">
                  A job offer for one is a win for the whole community
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Share resources and opportunities</p>
                <p className="text-sm text-muted-foreground">
                  Job postings, useful articles, and learning resources are welcome
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-200">
                ✓
              </Badge>
              <div>
                <p className="font-medium">Report inappropriate content</p>
                <p className="text-sm text-muted-foreground">
                  Help us maintain a safe space by flagging violations
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Don'ts - Prohibited Behavior
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Harassment or bullying</p>
                <p className="text-sm text-muted-foreground">
                  Personal attacks, threats, or intimidation of any kind
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Discrimination</p>
                <p className="text-sm text-muted-foreground">
                  Content targeting race, gender, religion, nationality, disability, or orientation
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Spam or self-promotion</p>
                <p className="text-sm text-muted-foreground">
                  Excessive promotion of products, services, or external links
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Sharing confidential information</p>
                <p className="text-sm text-muted-foreground">
                  Don't share NDA-protected info, proprietary data, or others' personal details
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Scams or misleading content</p>
                <p className="text-sm text-muted-foreground">
                  Fake job postings, pyramid schemes, or deceptive advice
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 bg-red-50 text-red-700 border-red-200">
                ✗
              </Badge>
              <div>
                <p className="font-medium">Inappropriate content</p>
                <p className="text-sm text-muted-foreground">
                  NSFW material, excessive profanity, or off-topic content
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            Reporting & Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you see content that violates these guidelines, please report it using the
            report button on any post or message. Our moderation team reviews all reports
            and takes appropriate action.
          </p>
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Enforcement Actions</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="secondary">1st Offense</Badge>
                <span className="text-muted-foreground">Warning and content removal</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">2nd Offense</Badge>
                <span className="text-muted-foreground">Temporary posting restriction</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">3rd Offense</Badge>
                <span className="text-muted-foreground">Extended suspension</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="destructive">Severe Violations</Badge>
                <span className="text-muted-foreground">Immediate permanent ban</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Appeals can be submitted by contacting our support team. We review all appeals
            within 48 hours.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Privacy & Safety Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">•</span>
              <span>
                <strong>Protect your personal information:</strong> Don't share your full
                address, phone number, or financial details publicly
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">•</span>
              <span>
                <strong>Be cautious with job offers:</strong> Legitimate employers won't ask
                for payment or sensitive info upfront
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">•</span>
              <span>
                <strong>Verify before you trust:</strong> Research companies and individuals
                before sharing personal details
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">•</span>
              <span>
                <strong>Use anonymous posting wisely:</strong> For sensitive topics, consider
                using our anonymous posting feature
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          These guidelines were last updated on December 2024. By using the Job Pilot
          community, you agree to follow these guidelines.
        </p>
        <p className="mt-2">
          Questions? Contact us at{" "}
          <a href="mailto:support@jobpilot.com" className="text-primary hover:underline">
            support@jobpilot.com
          </a>
        </p>
      </div>
    </div>
  );
}
