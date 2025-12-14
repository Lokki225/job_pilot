"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Loader2,
  Shield,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  getCoverLetterTemplates,
  createCoverLetterTemplate,
  updateCoverLetterTemplate,
  deleteCoverLetterTemplate,
  seedSystemTemplates,
  checkIsAdmin,
  type CoverLetterTemplateData,
} from "@/lib/actions/cover-letter.action";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

const CATEGORY_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Technology", label: "Technology" },
  { value: "Creative", label: "Creative" },
  { value: "Career Change", label: "Career Change" },
  { value: "Entry Level", label: "Entry Level" },
  { value: "Executive", label: "Executive" },
  { value: "Custom", label: "Custom" },
];

export function TemplatesSection() {
  const [templates, setTemplates] = useState<CoverLetterTemplateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterTemplateData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTone, setFormTone] = useState("professional");
  const [formCategory, setFormCategory] = useState("General");
  const [formIsSystem, setFormIsSystem] = useState(false);

  // Expanded templates
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [templatesRes, adminRes] = await Promise.all([
        getCoverLetterTemplates(),
        checkIsAdmin(),
      ]);

      if (templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      setIsAdmin(adminRes.isAdmin);
    } catch (err) {
      console.error("Error loading templates:", err);
      setError("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormContent("");
    setFormTone("professional");
    setFormCategory("General");
    setFormIsSystem(false);
  }

  function openCreate() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEdit(template: CoverLetterTemplateData) {
    setSelectedTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormContent(template.content);
    setFormTone(template.tone);
    setFormCategory(template.category || "General");
    setFormIsSystem(template.isSystem);
    setIsEditOpen(true);
  }

  function openPreview(template: CoverLetterTemplateData) {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  }

  async function handleCreate() {
    if (!formName.trim() || !formContent.trim()) {
      toast({ title: "Error", description: "Name and content are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCoverLetterTemplate({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        content: formContent,
        tone: formTone,
        category: formCategory,
        isSystem: isAdmin && formIsSystem,
      });

      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template created successfully" });
        setIsCreateOpen(false);
        loadData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!selectedTemplate || !formName.trim() || !formContent.trim()) {
      toast({ title: "Error", description: "Name and content are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateCoverLetterTemplate(selectedTemplate.id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        content: formContent,
        tone: formTone,
        category: formCategory,
      });

      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template updated successfully" });
        setIsEditOpen(false);
        loadData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await deleteCoverLetterTemplate(id);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template deleted" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  }

  async function handleSeedTemplates() {
    setIsSubmitting(true);
    try {
      const res = await seedSystemTemplates();
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: `Created ${res.data?.created || 0} system templates` });
        loadData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to seed templates", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyContent(content: string) {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Template content copied to clipboard" });
  }

  const systemTemplates = templates.filter((t) => t.isSystem);
  const userTemplates = templates.filter((t) => !t.isSystem);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cover Letter Templates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use templates as a starting point for your cover letters
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={handleSeedTemplates} disabled={isSubmitting}>
              <Shield className="mr-2 h-4 w-4" />
              Seed System Templates
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Shield className="h-4 w-4" />
            System Templates ({systemTemplates.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isAdmin={isAdmin}
                isExpanded={expandedId === template.id}
                onToggleExpand={() => setExpandedId(expandedId === template.id ? null : template.id)}
                onPreview={() => openPreview(template)}
                onEdit={() => openEdit(template)}
                onDelete={() => handleDelete(template.id)}
                onCopy={() => handleCopyContent(template.content)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Templates */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <User className="h-4 w-4" />
          My Templates ({userTemplates.length})
        </h3>
        {userTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No custom templates yet</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isAdmin={isAdmin}
                isExpanded={expandedId === template.id}
                onToggleExpand={() => setExpandedId(expandedId === template.id ? null : template.id)}
                onPreview={() => openPreview(template)}
                onEdit={() => openEdit(template)}
                onDelete={() => handleDelete(template.id)}
                onCopy={() => handleCopyContent(template.content)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Create a new cover letter template</DialogDescription>
          </DialogHeader>
          <TemplateForm
            name={formName}
            setName={setFormName}
            description={formDescription}
            setDescription={setFormDescription}
            content={formContent}
            setContent={setFormContent}
            tone={formTone}
            setTone={setFormTone}
            category={formCategory}
            setCategory={setFormCategory}
            isSystem={formIsSystem}
            setIsSystem={setFormIsSystem}
            showIsSystem={isAdmin}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template details</DialogDescription>
          </DialogHeader>
          <TemplateForm
            name={formName}
            setName={setFormName}
            description={formDescription}
            setDescription={setFormDescription}
            content={formContent}
            setContent={setFormContent}
            tone={formTone}
            setTone={setFormTone}
            category={formCategory}
            setCategory={setFormCategory}
            isSystem={formIsSystem}
            setIsSystem={setFormIsSystem}
            showIsSystem={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">{selectedTemplate?.tone}</Badge>
              {selectedTemplate?.category && <Badge variant="outline">{selectedTemplate.category}</Badge>}
              {selectedTemplate?.isSystem && (
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                  System
                </Badge>
              )}
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap text-sm">{selectedTemplate?.content}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedTemplate && handleCopyContent(selectedTemplate.content)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  isAdmin,
  isExpanded,
  onToggleExpand,
  onPreview,
  onEdit,
  onDelete,
  onCopy,
}: {
  template: CoverLetterTemplateData;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const canEdit = !template.isSystem || isAdmin;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {template.tone}
          </Badge>
          {template.category && (
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
          )}
          {template.isSystem && (
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs">
              System
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <button
          onClick={onToggleExpand}
          className="mb-2 flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          <span>Preview content</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isExpanded && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded border bg-muted/50 p-2 text-xs">
            <pre className="whitespace-pre-wrap">{template.content.slice(0, 500)}...</pre>
          </div>
        )}
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Used {template.usageCount} times</p>
      </CardContent>
    </Card>
  );
}

function TemplateForm({
  name,
  setName,
  description,
  setDescription,
  content,
  setContent,
  tone,
  setTone,
  category,
  setCategory,
  isSystem,
  setIsSystem,
  showIsSystem,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  isSystem: boolean;
  setIsSystem: (v: boolean) => void;
  showIsSystem: boolean;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          placeholder="e.g., Professional Standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          placeholder="Brief description of when to use this template"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Template Content</Label>
        <Textarea
          id="content"
          placeholder="Write your cover letter template here. Use placeholders like [JOB_TITLE], [COMPANY], [YOUR_NAME], etc."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Tip: Use placeholders like [JOB_TITLE], [COMPANY], [YOUR_NAME], [SKILLS], etc. that can be replaced when using the template.
        </p>
      </div>
      {showIsSystem && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isSystem"
            checked={isSystem}
            onChange={(e) => setIsSystem(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isSystem" className="text-sm font-normal">
            Make this a system template (visible to all users)
          </Label>
        </div>
      )}
    </div>
  );
}
