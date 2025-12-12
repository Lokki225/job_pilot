"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  HelpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getCareerTracks, 
  getChapterTemplates, 
  getAIProviderInfo,
  generateFullChapter,
  publishChapterToDatabase,
  populateFullDatabase,
  populateTrack,
  populateFreeChapters,
  type PopulationProgress,
} from "@/lib/actions/study-content.action";
import type { CareerTrackId } from "@/lib/services/study-content/types";
import type { CareerTrack } from "@/lib/services/study-content/types";
import type { ValidatedLesson, ValidatedQuiz, ValidatedChapterBlueprint } from "@/lib/services/study-content/schemas";
import { MarkdownRenderer } from "@/components/study/MarkdownRenderer";

type ChapterTemplate = {
  orderIndex: number;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  isPremium: boolean;
};

type GenerationState = 
  | { status: "idle" }
  | { status: "generating"; step: string; progress: number }
  | { status: "success"; data: GeneratedContent }
  | { status: "error"; message: string };

type GeneratedContent = {
  blueprint: ValidatedChapterBlueprint;
  lessons: ValidatedLesson[];
  quiz: ValidatedQuiz | null;
  generationErrors: string[];
};

export default function StudyContentAdminPage() {
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [chapters, setChapters] = useState<ChapterTemplate[]>([]);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [lessonCount, setLessonCount] = useState(5);

  // Generation state
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });

  // Preview state
  const [previewLessonIndex, setPreviewLessonIndex] = useState(0);
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // Bulk population state
  const [bulkPopulating, setBulkPopulating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<PopulationProgress | null>(null);

  useEffect(() => {
    async function loadData() {
      const [tracksRes, chaptersRes, providerRes] = await Promise.all([
        getCareerTracks(),
        getChapterTemplates(),
        getAIProviderInfo(),
      ]);

      if (tracksRes.success && tracksRes.data) setTracks(tracksRes.data);
      if (chaptersRes.success && chaptersRes.data) setChapters(chaptersRes.data);
      if (providerRes.success && providerRes.data) setProviderInfo(providerRes.data);
      
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleGenerate = async () => {
    if (!selectedTrack || !selectedChapter) return;

    setGeneration({ status: "generating", step: "Starting...", progress: 0 });

    try {
      const result = await generateFullChapter(
        selectedTrack as any,
        selectedChapter,
        lessonCount
      );

      if (result.success && result.data) {
        setGeneration({ status: "success", data: result.data });
        setPreviewLessonIndex(0);
        setShowQuizPreview(false);
      } else {
        setGeneration({ status: "error", message: result.error || "Generation failed" });
      }
    } catch (e) {
      setGeneration({ 
        status: "error", 
        message: e instanceof Error ? e.message : "Unknown error" 
      });
    }
  };

  const handleDownloadJSON = () => {
    if (generation.status !== "success") return;

    const data = {
      trackId: selectedTrack,
      chapterIndex: selectedChapter,
      generatedAt: new Date().toISOString(),
      ...generation.data,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chapter-${selectedChapter}-${selectedTrack}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublish = async () => {
    if (generation.status !== "success" || !selectedTrack) return;

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const result = await publishChapterToDatabase(
        selectedTrack as any,
        generation.data.blueprint,
        generation.data.lessons,
        generation.data.quiz
      );

      if (result.success && result.data) {
        setPublishResult({
          success: true,
          message: `Published! Chapter ID: ${result.data.chapterId}, ${result.data.lessonIds.length} lessons created`,
        });
      } else {
        setPublishResult({
          success: false,
          message: result.error || "Failed to publish",
        });
      }
    } catch (e) {
      setPublishResult({
        success: false,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBulkPopulate = async (mode: 'full' | 'free' | 'track') => {
    setBulkPopulating(true);
    setBulkProgress(null);

    try {
      let result;
      if (mode === 'full') {
        result = await populateFullDatabase();
      } else if (mode === 'free') {
        result = await populateFreeChapters();
      } else if (mode === 'track' && selectedTrack) {
        result = await populateTrack(selectedTrack as CareerTrackId);
      } else {
        setBulkPopulating(false);
        return;
      }

      if (result.data) {
        setBulkProgress(result.data);
      }
    } catch (e) {
      setBulkProgress({
        totalTracks: 0,
        totalChapters: 0,
        completedChapters: 0,
        currentTrack: '',
        currentChapter: 0,
        status: 'error',
        errors: [e instanceof Error ? e.message : 'Unknown error'],
        results: [],
      });
    } finally {
      setBulkPopulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const selectedTrackData = tracks.find(t => t.id === selectedTrack);
  const selectedChapterData = chapters.find(c => c.orderIndex === selectedChapter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Study Content Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate chapters, lessons, and quizzes using AI
          </p>
        </div>
        {providerInfo && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
            🤖 {providerInfo.provider} / {providerInfo.model}
          </div>
        )}
      </div>

      {/* Bulk Population Panel */}
      <Card className="border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                🚀 Bulk Database Population
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Auto-generate and publish all content at once (takes 60-90 mins for full DB)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkPopulate('track')}
                disabled={bulkPopulating || !selectedTrack}
                title={!selectedTrack ? "Select a track first" : "Populate selected track"}
              >
                {bulkPopulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Populate Track (7 ch)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkPopulate('free')}
                disabled={bulkPopulating}
              >
                {bulkPopulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Free Chapters (20 ch)
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkPopulate('full')}
                disabled={bulkPopulating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {bulkPopulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Full Database (35 ch)
              </Button>
            </div>
          </div>

          {/* Progress display */}
          {bulkPopulating && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating content... This will take a while. Check console for progress.</span>
              </div>
            </div>
          )}

          {bulkProgress && !bulkPopulating && (
            <div className={`mt-4 p-3 rounded-lg ${
              bulkProgress.errors.length === 0 
                ? "bg-green-50 dark:bg-green-900/20" 
                : "bg-amber-50 dark:bg-amber-900/20"
            }`}>
              <div className="flex items-center gap-2">
                {bulkProgress.errors.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  {bulkProgress.completedChapters}/{bulkProgress.totalChapters} chapters created
                </span>
              </div>
              {bulkProgress.errors.length > 0 && (
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  {bulkProgress.errors.length} errors occurred. Check console for details.
                </div>
              )}
              {bulkProgress.results.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Total lessons: {bulkProgress.results.reduce((sum, r) => sum + r.lessonCount, 0)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-4">
          {/* Track Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                1. Select Career Track
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedTrack === track.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{track.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {track.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {track.targetAudience.slice(0, 2).join(", ")}
                      </div>
                    </div>
                    {selectedTrack === track.id && (
                      <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chapter Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                2. Select Chapter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.orderIndex}
                  onClick={() => setSelectedChapter(chapter.orderIndex)}
                  disabled={!selectedTrack}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    !selectedTrack 
                      ? "opacity-50 cursor-not-allowed"
                      : selectedChapter === chapter.orderIndex
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{chapter.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {chapter.orderIndex}. {chapter.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chapter.description}
                      </div>
                    </div>
                    {chapter.isPremium && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                        Premium
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Generation Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                3. Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lessons per chapter
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {[4, 5, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setLessonCount(count)}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        lessonCount === count
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedTrack || !selectedChapter || generation.status === "generating"}
                className="w-full"
                size="lg"
              >
                {generation.status === "generating" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Chapter
                  </>
                )}
              </Button>

              {generation.status === "generating" && (
                <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                  {generation.step}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-2">
          {generation.status === "idle" && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a track and chapter, then click Generate</p>
                <p className="text-sm mt-1">Content will be previewed here</p>
              </div>
            </Card>
          )}

          {generation.status === "generating" && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="text-gray-900 dark:text-white font-medium">
                  Generating content with AI...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This may take 30-60 seconds
                </p>
              </div>
            </Card>
          )}

          {generation.status === "error" && (
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Generation Failed</h3>
                    <p className="text-sm mt-1">{generation.message}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setGeneration({ status: "idle" })}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {generation.status === "success" && (
            <div className="space-y-4">
              {/* Success Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Content Generated Successfully
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {generation.data.lessons.length} lessons + {generation.data.quiz ? "1 quiz" : "no quiz"}
                          {generation.data.generationErrors.length > 0 && (
                            <span className="text-amber-500 ml-2">
                              ({generation.data.generationErrors.length} warnings)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handlePublish}
                        disabled={isPublishing || publishResult?.success}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publishing...
                          </>
                        ) : publishResult?.success ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Published
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Publish to DB
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {publishResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      publishResult.success 
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" 
                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    }`}>
                      {publishResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lesson/Quiz Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {generation.data.lessons.map((lesson, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPreviewLessonIndex(i);
                      setShowQuizPreview(false);
                    }}
                    className={`px-4 py-2 rounded-lg border whitespace-nowrap transition-all ${
                      !showQuizPreview && previewLessonIndex === i
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm font-medium">Lesson {i + 1}</span>
                  </button>
                ))}
                {generation.data.quiz && (
                  <button
                    onClick={() => setShowQuizPreview(true)}
                    className={`px-4 py-2 rounded-lg border whitespace-nowrap transition-all ${
                      showQuizPreview
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm font-medium">📝 Quiz</span>
                  </button>
                )}
              </div>

              {/* Content Preview */}
              <Card>
                <CardContent className="p-6">
                  {!showQuizPreview && generation.data.lessons[previewLessonIndex] && (
                    <LessonPreview lesson={generation.data.lessons[previewLessonIndex]} />
                  )}
                  {showQuizPreview && generation.data.quiz && (
                    <QuizPreview quiz={generation.data.quiz} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// LESSON PREVIEW COMPONENT
// ===========================================================

function LessonPreview({ lesson }: { lesson: ValidatedLesson }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const section = lesson.content.sections[sectionIndex];

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {lesson.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {lesson.description}
        </p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>⏱️ {lesson.estimatedMinutes} min</span>
          <span>📄 {lesson.content.sections.length} sections</span>
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex gap-2 mb-4">
        {lesson.content.sections.map((_, i) => (
          <button
            key={i}
            onClick={() => setSectionIndex(i)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
              sectionIndex === i
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section && section.type === "text" && (
        <div>
          {section.data.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {section.data.title}
            </h3>
          )}
          <MarkdownRenderer content={section.data.body} />
          
          {section.data.highlights && section.data.highlights.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                💡 Key Points
              </h4>
              <ul className="space-y-1">
                {section.data.highlights.map((h, i) => (
                  <li key={i} className="text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.data.examples && section.data.examples.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                📝 Examples
              </h4>
              <div className="space-y-3">
                {section.data.examples.map((ex, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                      {ex.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {ex.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================
// QUIZ PREVIEW COMPONENT
// ===========================================================

function QuizPreview({ quiz }: { quiz: ValidatedQuiz }) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {quiz.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {quiz.description}
        </p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>❓ {quiz.questions.length} questions</span>
          <span>🎯 {quiz.passingScore}% to pass</span>
        </div>
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white mb-3">
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2 rounded border text-sm ${
                        q.correctAnswers.includes(opt.id)
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <span className="font-medium mr-2">{opt.id.toUpperCase()}.</span>
                      {opt.text}
                      {q.correctAnswers.includes(opt.id) && (
                        <CheckCircle2 className="h-4 w-4 inline ml-2" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-400">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
