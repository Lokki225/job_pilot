"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
  FileText,
  BookOpen,
  HelpCircle,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Code2,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/use-toast";
import {
  getStudyPlan,
  updateStudyPlan,
  createChapter,
  updateChapter,
  deleteChapter,
  createLesson,
  updateLesson,
  deleteLesson,
  saveQuiz,
  deleteQuiz,
  type CustomStudyPlanData,
  type CustomStudyChapterData,
  type CustomStudyLessonData,
  type QuizQuestion,
} from "@/lib/actions/custom-study-plan.action";

interface StudyPlanEditorProps {
  planId: string;
  onBack: () => void;
}

export function StudyPlanEditor({ planId, onBack }: StudyPlanEditorProps) {
  const [plan, setPlan] = useState<CustomStudyPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const markdownComponents: Components = {
    pre: ({ node, children, ...props }) => (
      <pre
        className="my-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-100 p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
        {...props}
      >
        {children}
      </pre>
    ),
    code: ({ node, className, children, ...props }) => {
      const isInline = !className || !String(className).includes("language-");

      return (
        <code
          className={`${
            isInline
              ? "rounded bg-slate-100 px-1 py-0.5 font-mono text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-50"
              : "font-mono text-sm text-slate-900 dark:text-slate-50"
          }${className ? ` ${className}` : ""}`}
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  // Edit states
  const [editingPlanTitle, setEditingPlanTitle] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planIsPublic, setPlanIsPublic] = useState(false);
  const [planCoverImageUrl, setPlanCoverImageUrl] = useState("");

  // Chapter dialog
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<CustomStudyChapterData | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterDescription, setChapterDescription] = useState("");

  // Lesson editor
  const [editingLesson, setEditingLesson] = useState<CustomStudyLessonData | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonMinutes, setLessonMinutes] = useState(10);
  const [showPreview, setShowPreview] = useState(false);
  const [lessonChapterId, setLessonChapterId] = useState<string | null>(null);

  // Quiz editor
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizPassingScore, setQuizPassingScore] = useState<number | "">(70);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Expanded chapters
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  async function loadPlan() {
    setIsLoading(true);
    try {
      const res = await getStudyPlan(planId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPlan(res.data);
        setPlanTitle(res.data.title);
        setPlanDescription(res.data.description || "");
        setPlanIsPublic(!!res.data.isPublic);
        setPlanCoverImageUrl(res.data.coverImageUrl || "");
        // Expand all chapters by default
        setExpandedChapters(new Set(res.data.chapters.map((c) => c.id)));
      }
    } catch (err) {
      setError("Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }

  // Markdown toolbar actions
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = "") => {
      const textarea = document.getElementById("lesson-content") as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = lessonContent.substring(start, end);
      const newText =
        lessonContent.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        lessonContent.substring(end);

      setLessonContent(newText);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selectedText.length
        );
      }, 0);
    },
    [lessonContent]
  );

  // Plan title save
  async function handleSavePlanTitle() {
    if (!plan) return;
    setIsSaving(true);
    try {
      const res = await updateStudyPlan(plan.id, {
        title: planTitle,
        description: planDescription,
        isPublic: planIsPublic,
        coverImageUrl: planCoverImageUrl.trim() ? planCoverImageUrl.trim() : null,
      });
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        setPlan({
          ...plan,
          title: planTitle,
          description: planDescription,
          isPublic: planIsPublic,
          coverImageUrl: planCoverImageUrl.trim() ? planCoverImageUrl.trim() : null,
        });
        setEditingPlanTitle(false);
        toast({ title: "Saved", description: "Plan updated" });
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Chapter CRUD
  async function handleSaveChapter() {
    if (!plan || !chapterTitle.trim()) return;
    setIsSaving(true);
    try {
      if (editingChapter) {
        const res = await updateChapter(editingChapter.id, {
          title: chapterTitle,
          description: chapterDescription,
        });
        if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
          toast({ title: "Saved", description: "Chapter updated" });
          loadPlan();
        }
      } else {
        const res = await createChapter(plan.id, {
          title: chapterTitle,
          description: chapterDescription,
        });
        if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
          toast({ title: "Created", description: "Chapter created" });
          loadPlan();
        }
      }
      setChapterDialogOpen(false);
      setEditingChapter(null);
      setChapterTitle("");
      setChapterDescription("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!confirm("Delete this chapter and all its lessons?")) return;
    try {
      const res = await deleteChapter(chapterId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: "Chapter deleted" });
        loadPlan();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  // Lesson CRUD
  function openNewLesson(chapterId: string) {
    setLessonChapterId(chapterId);
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonMinutes(10);
    setShowPreview(false);
  }

  function openEditLesson(lesson: CustomStudyLessonData) {
    setLessonChapterId(lesson.chapterId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content);
    setLessonMinutes(lesson.estimatedMinutes);
    setShowPreview(false);
  }

  async function handleSaveLesson() {
    if (!lessonChapterId || !lessonTitle.trim() || !lessonContent.trim()) return;
    setIsSaving(true);
    try {
      if (editingLesson) {
        const res = await updateLesson(editingLesson.id, {
          title: lessonTitle,
          content: lessonContent,
          estimatedMinutes: lessonMinutes,
        });
        if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
          toast({ title: "Saved", description: "Lesson updated" });
          loadPlan();
        }
      } else {
        const res = await createLesson(lessonChapterId, {
          title: lessonTitle,
          content: lessonContent,
          estimatedMinutes: lessonMinutes,
        });
        if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
          toast({ title: "Created", description: "Lesson created" });
          loadPlan();
        }
      }
      setLessonChapterId(null);
      setEditingLesson(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    try {
      const res = await deleteLesson(lessonId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: "Lesson deleted" });
        loadPlan();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  // Quiz CRUD
  function openQuizEditor(lesson: CustomStudyLessonData) {
    setQuizLessonId(lesson.id);
    if (lesson.quiz) {
      setQuizTitle(lesson.quiz.title || "");
      setQuizPassingScore(typeof lesson.quiz.passingScore === "number" ? lesson.quiz.passingScore : 70);
      setQuizQuestions(lesson.quiz.questions || []);
    } else {
      setQuizTitle("");
      setQuizPassingScore(70);
      setQuizQuestions([]);
    }
    setQuizDialogOpen(true);
  }

  function addQuizQuestion() {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: crypto.randomUUID(),
        question: "",
        type: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: 0,
        explanation: "",
      },
    ]);
  }

  function updateQuizQuestion(index: number, updates: Partial<QuizQuestion>) {
    setQuizQuestions(
      quizQuestions.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  }

  function removeQuizQuestion(index: number) {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  }

  async function handleSaveQuiz() {
    if (!quizLessonId || quizQuestions.length === 0) return;
    setIsSaving(true);
    try {
      const res = await saveQuiz(quizLessonId, {
        title: quizTitle,
        passingScore: quizPassingScore === "" ? 70 : quizPassingScore,
        questions: quizQuestions,
      });
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Saved", description: "Quiz saved" });
        setQuizDialogOpen(false);
        loadPlan();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuiz(lessonId: string) {
    if (!confirm("Delete this quiz?")) return;
    try {
      const res = await deleteQuiz(lessonId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: "Quiz deleted" });
        loadPlan();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }


  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500">{error || "Plan not found"}</p>
        <Button className="mt-4" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  // If editing a lesson, show the lesson editor
  if (lessonChapterId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingLesson ? "Edit Lesson" : "New Lesson"}
          </h2>
          <Button
            variant="ghost"
            onClick={() => {
              setLessonChapterId(null);
              setEditingLesson(null);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g., Introduction to React Hooks"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Minutes</Label>
              <Input
                type="number"
                min={1}
                value={lessonMinutes}
                onChange={(e) => setLessonMinutes(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          {/* Markdown Toolbar */}
          <div className="flex flex-wrap items-center gap-1 rounded-t-lg border bg-muted/50 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("**", "**")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("*", "*")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-6 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("# ")}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("## ")}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("### ")}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-6 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("- ")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("1. ")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("`", "`")}
              title="Inline Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("```\n", "\n```")}
              title="Code Block"
            >
              <Code2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("> ")}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("[", "](url)")}
              title="Link"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {/* Editor / Preview */}
          <div className="grid gap-4 lg:grid-cols-2">
            {!showPreview && (
              <div className="space-y-2">
                <Label>Content (Markdown)</Label>
                <Textarea
                  id="lesson-content"
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write your lesson content here using Markdown..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none max-h-[500px] overflow-y-auto rounded-lg border bg-card p-4 text-slate-900 dark:text-slate-50">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {lessonContent || "*Start typing to see preview...*"}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLessonChapterId(null);
                setEditingLesson(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveLesson} disabled={isSaving || !lessonTitle.trim() || !lessonContent.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Lesson
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back to Plans
        </Button>
      </div>

      {/* Plan Title */}
      <Card>
        <CardHeader>
          {editingPlanTitle ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Title</Label>
                <Input
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Image URL (optional)</Label>
                <Input
                  value={planCoverImageUrl}
                  onChange={(e) => setPlanCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Public plan</Label>
                  <p className="text-sm text-muted-foreground">
                    Public plans appear in Community Plans and can be liked/commented.
                  </p>
                </div>
                <Switch checked={planIsPublic} onCheckedChange={setPlanIsPublic} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSavePlanTitle} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingPlanTitle(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                {plan.description && (
                  <CardDescription className="mt-1">{plan.description}</CardDescription>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={plan.isPublic ? "default" : "secondary"}>
                    {plan.isPublic ? "Public" : "Private"}
                  </Badge>
                  {plan.coverImageUrl && (
                    <Badge variant="outline">Cover set</Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingPlanTitle(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Chapters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Chapters</h3>
          <Button
            onClick={() => {
              setEditingChapter(null);
              setChapterTitle("");
              setChapterDescription("");
              setChapterDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Chapter
          </Button>
        </div>

        {plan.chapters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No chapters yet</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingChapter(null);
                  setChapterTitle("");
                  setChapterDescription("");
                  setChapterDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Chapter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plan.chapters.map((chapter, chapterIndex) => (
              <Card key={chapter.id}>
                <Collapsible
                  open={expandedChapters.has(chapter.id)}
                  onOpenChange={(open) => {
                    const newSet = new Set(expandedChapters);
                    if (open) {
                      newSet.add(chapter.id);
                    } else {
                      newSet.delete(chapter.id);
                    }
                    setExpandedChapters(newSet);
                  }}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedChapters.has(chapter.id) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div>
                            <CardTitle className="text-base">
                              Chapter {chapterIndex + 1}: {chapter.title}
                            </CardTitle>
                            {chapter.description && (
                              <CardDescription className="mt-0.5">
                                {chapter.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge variant="secondary">{chapter.lessons.length} lessons</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingChapter(chapter);
                              setChapterTitle(chapter.title);
                              setChapterDescription(chapter.description || "");
                              setChapterDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteChapter(chapter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {chapter.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {lessonIndex + 1}. {lesson.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.estimatedMinutes} min
                                  {lesson.quiz && " • Has Quiz"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant={lesson.quiz ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => openQuizEditor(lesson)}
                              >
                                <HelpCircle className={`mr-2 h-4 w-4 ${lesson.quiz ? "text-primary" : ""}`} />
                                {lesson.quiz ? "Edit Quiz" : "Add Quiz"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditLesson(lesson)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDeleteLesson(lesson.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => openNewLesson(chapter.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Lesson
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChapter ? "Edit Chapter" : "New Chapter"}</DialogTitle>
            <DialogDescription>
              {editingChapter ? "Update chapter details" : "Add a new chapter to your study plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chapter Title</Label>
              <Input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="e.g., Getting Started with JavaScript"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={chapterDescription}
                onChange={(e) => setChapterDescription(e.target.value)}
                placeholder="Brief description of what this chapter covers"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChapter} disabled={isSaving || !chapterTitle.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingChapter ? "Save Changes" : "Create Chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Editor</DialogTitle>
            <DialogDescription>Create questions for this lesson</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quiz Title (optional)</Label>
                <Input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g., Knowledge Check"
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={quizPassingScore}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setQuizPassingScore("");
                      return;
                    }

                    const next = Number.parseInt(raw, 10);
                    if (Number.isNaN(next)) {
                      setQuizPassingScore("");
                      return;
                    }

                    setQuizPassingScore(next);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions ({quizQuestions.length})</Label>
                <Button size="sm" variant="outline" onClick={addQuizQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              {quizQuestions.map((q, qIndex) => (
                <Card key={q.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Label>Question {qIndex + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeQuizQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={q.question}
                      onChange={(e) => updateQuizQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question"
                      rows={2}
                    />
                    <div className="space-y-2">
                      <Label className="text-xs">Options (click to mark correct)</Label>
                      {(q.options || ["", "", "", ""]).map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                              q.correctAnswer === optIndex
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-gray-300"
                            }`}
                            onClick={() => updateQuizQuestion(qIndex, { correctAnswer: optIndex })}
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...(q.options || [])];
                              newOptions[optIndex] = e.target.value;
                              updateQuizQuestion(qIndex, { options: newOptions });
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Explanation (optional)</Label>
                      <Input
                        value={q.explanation || ""}
                        onChange={(e) => updateQuizQuestion(qIndex, { explanation: e.target.value })}
                        placeholder="Explain the correct answer"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {quizQuestions.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  No questions yet. Click "Add Question" to get started.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            {quizLessonId && plan.chapters.some((c) => c.lessons.some((l) => l.id === quizLessonId && l.quiz)) && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteQuiz(quizLessonId);
                  setQuizDialogOpen(false);
                }}
              >
                Delete Quiz
              </Button>
            )}
            <Button variant="outline" onClick={() => setQuizDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuiz} disabled={isSaving || quizQuestions.length === 0}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
