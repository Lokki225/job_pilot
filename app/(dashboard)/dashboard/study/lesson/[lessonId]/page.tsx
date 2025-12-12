"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MarkdownRenderer, TipBox } from "@/components/study/MarkdownRenderer";
import { 
  ArrowLeft, 
  ArrowRight,
  Clock, 
  CheckCircle2, 
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { LessonDetailData, ContentSection } from "@/lib/types/study.types";
import { getLessonDetail, completeLesson, updateLessonProgress } from "@/lib/actions/study.action";

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  const [data, setData] = useState<LessonDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    async function loadLessonData() {
      try {
        const result = await getLessonDetail(lessonId);
        
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
          // Start progress tracking
          await updateLessonProgress({
            lessonId,
            status: "IN_PROGRESS",
            progressPercentage: 0,
          });
        }
      } catch (err) {
        console.error("Error loading lesson data:", err);
        setError("Failed to load lesson");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadLessonData();
  }, [lessonId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || "Lesson not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/study">Back to Study Room</Link>
        </Button>
      </div>
    );
  }

  if (!data.lesson.content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BookOpen className="h-12 w-12 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">This lesson has no content yet</p>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/study/chapter/${data.chapter.id}`}>Back to Chapter</Link>
        </Button>
      </div>
    );
  }

  const sections = data.lesson.content.sections;
  const totalSections = sections.length;
  const currentSection = sections[currentSectionIndex];
  const progressPercentage = Math.round(((currentSectionIndex + 1) / totalSections) * 100);
  const isLastSection = currentSectionIndex === totalSections - 1;

  const handleNext = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const result = await completeLesson(lessonId);
      if (result.error) {
        console.error("Error completing lesson:", result.error);
      }
      
      // Navigate to next lesson or back to chapter
      if (data.nextLesson) {
        router.push(`/dashboard/study/lesson/${data.nextLesson.id}`);
      } else {
        router.push(`/dashboard/study/chapter/${data.chapter.id}`);
      }
    } catch (err) {
      console.error("Error completing lesson:", err);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex items-center justify-between">
            <Link 
              href={`/dashboard/study/chapter/${data.chapter.id}`}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{data.chapter.title}</span>
              <span className="sm:hidden">Back</span>
            </Link>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{data.lesson.estimatedMinutes} min</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={progressPercentage} className="flex-1 h-2" />
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {currentSectionIndex + 1} / {totalSections}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Lesson Title */}
        <div className="mb-8">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
            {data.chapter.icon} {data.chapter.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {data.lesson.title}
          </h1>
        </div>

        {/* Content Section */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-8">
          <CardContent className="py-8 px-6 sm:px-8">
            <ContentRenderer section={currentSection} />
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLastSection ? (
            <Button 
              onClick={handleComplete} 
              disabled={isCompleting}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isCompleting ? "Completing..." : "Complete & Continue"}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentRenderer({ section }: { section: ContentSection }) {
  if (section.type === "text") {
    return <TextSectionRenderer data={section.data} />;
  }
  
  // TODO: Add other content type renderers
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Content type "{section.type}" coming soon</p>
    </div>
  );
}

function TextSectionRenderer({ data }: { data: { title?: string; body: string; highlights?: string[]; examples?: { title: string; content: string }[] } }) {
  return (
    <div>
      {data.title && (
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          {data.title}
        </h2>
      )}
      
      {/* Beautiful Markdown Content */}
      <MarkdownRenderer content={data.body} />

      {/* Key Points / Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <TipBox title="💡 Key Points">
          <ul className="space-y-2 mt-2">
            {data.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </TipBox>
      )}

      {/* Examples */}
      {data.examples && data.examples.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📝</span> Examples
          </h4>
          <div className="space-y-4">
            {data.examples.map((example, i) => (
              <div 
                key={i} 
                className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {example.title}
                </h5>
                <p className="text-gray-600 dark:text-gray-400 pl-8">{example.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
