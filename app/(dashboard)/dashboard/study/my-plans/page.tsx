"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Edit,
  BookOpen,
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { StudyPlanEditor } from "@/components/study/StudyPlanEditor";
import {
  getMyStudyPlans,
  createStudyPlan,
  deleteStudyPlan,
  type CustomStudyPlanData,
} from "@/lib/actions/custom-study-plan.action";

export default function MyStudyPlansPage() {
  const [plans, setPlans] = useState<CustomStudyPlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Editor view
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setIsLoading(true);
    try {
      const res = await getMyStudyPlans();
      if (res.error) {
        setError(res.error);
      } else {
        setPlans(res.data || []);
      }
    } catch (err) {
      setError("Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreatePlan() {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await createStudyPlan({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else if (res.data) {
        toast({ title: "Created", description: "Study plan created" });
        setCreateDialogOpen(false);
        setNewTitle("");
        setNewDescription("");
        setEditingPlanId(res.data.id);
        loadPlans();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create plan", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm("Delete this study plan and all its content?")) return;
    try {
      const res = await deleteStudyPlan(planId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Deleted", description: "Study plan deleted" });
        loadPlans();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  // If editing a plan, show the editor
  if (editingPlanId) {
    return (
      <div className="container mx-auto max-w-5xl p-4 md:p-6">
        <StudyPlanEditor
          planId={editingPlanId}
          onBack={() => {
            setEditingPlanId(null);
            loadPlans();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/study">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Study Room
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              My Study Plans
            </h1>
            <p className="text-muted-foreground">Create and manage your custom study content</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Study Plan
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No study plans yet</h3>
            <p className="text-muted-foreground">Create your first custom study plan</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Study Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const totalLessons = plan.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
            const totalMinutes = plan.chapters.reduce(
              (sum, ch) => sum + ch.lessons.reduce((lSum, l) => lSum + l.estimatedMinutes, 0),
              0
            );

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{plan.title}</CardTitle>
                      {plan.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {plan.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={plan.isPublic ? "default" : "secondary"} className="ml-2 shrink-0">
                      {plan.isPublic ? (
                        <>
                          <Globe className="mr-1 h-3 w-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="mr-1 h-3 w-3" />
                          Private
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {plan.chapters.length} chapters
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {totalLessons} lessons
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {totalMinutes} min
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingPlanId(plan.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Study Plan</DialogTitle>
            <DialogDescription>
              Start a new custom study plan with your own lessons and quizzes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., JavaScript Fundamentals"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What will this study plan cover?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={isCreating || !newTitle.trim()}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
