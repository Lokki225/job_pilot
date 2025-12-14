"use client"

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Send,
  FileText,
  Wand2,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  generateCoverLetter, 
  updateCoverLetter,
  improveCoverLetter,
  getCoverLettersForJob,
  getCoverLetterTemplates,
  type CoverLetterTemplateData,
} from '@/lib/actions/cover-letter.action'
import { toast } from '@/components/ui/use-toast'

interface CoverLetterGeneratorProps {
  isOpen: boolean
  onClose: () => void
  jobApplicationId: string
  jobTitle: string
  company: string
  onGenerated?: (coverLetter: { id: string; content: string; subject: string }) => void
  onSendApplication?: (coverLetter: { id: string; content: string; subject: string }) => void
}

type Tone = 'professional' | 'friendly' | 'formal' | 'enthusiastic'

interface CoverLetter {
  id: string
  content: string
  subject: string
  tone: string
  createdAt: string
}

export function CoverLetterGenerator({
  isOpen,
  onClose,
  jobApplicationId,
  jobTitle,
  company,
  onGenerated,
  onSendApplication,
}: CoverLetterGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [tone, setTone] = useState<Tone>('professional')
  const [customInstructions, setCustomInstructions] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [templates, setTemplates] = useState<CoverLetterTemplateData[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('__default')
  
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [editedSubject, setEditedSubject] = useState('')
  const [previousLetters, setPreviousLetters] = useState<CoverLetter[]>([])
  
  const [improveFeedback, setImproveFeedback] = useState('')
  const [showImproveInput, setShowImproveInput] = useState(false)

  // Load existing cover letters for this job
  useEffect(() => {
    if (isOpen && jobApplicationId) {
      loadPreviousLetters()
      loadTemplates()
    }
  }, [isOpen, jobApplicationId])

  const loadTemplates = async () => {
    const result = await getCoverLetterTemplates()
    if (result.data) {
      setTemplates(result.data)
    }
  }

  const loadPreviousLetters = async () => {
    const result = await getCoverLettersForJob(jobApplicationId)
    if (result.data) {
      setPreviousLetters(result.data as CoverLetter[])
      // If there's a previous letter, load it
      if (result.data.length > 0) {
        const latest = result.data[0] as CoverLetter
        setCoverLetter(latest)
        setEditedContent(latest.content)
        setEditedSubject(latest.subject || '')
      }
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateCoverLetter({
        jobApplicationId,
        tone,
        customInstructions: customInstructions || undefined,
        templateId: selectedTemplateId === '__default' ? undefined : selectedTemplateId,
      })

      if (result.data) {
        const newLetter = {
          id: result.data.id || '',
          content: result.data.content,
          subject: result.data.subject || `Application for ${jobTitle}`,
          tone,
          createdAt: new Date().toISOString(),
        }
        setCoverLetter(newLetter)
        setEditedContent(newLetter.content)
        setEditedSubject(newLetter.subject)
        
        toast({
          title: 'Cover Letter Generated!',
          description: 'Review and edit as needed before sending.',
        })

        onGenerated?.(newLetter)
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Failed to generate cover letter',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Generate error:', err)
      toast({
        title: 'Error',
        description: 'Failed to generate cover letter',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImprove = async () => {
    if (!coverLetter?.id || !improveFeedback.trim()) return

    setIsImproving(true)
    try {
      const result = await improveCoverLetter({
        coverLetterId: coverLetter.id,
        feedback: improveFeedback,
      })

      if (result.data) {
        setEditedContent(result.data.content)
        setCoverLetter({ ...coverLetter, content: result.data.content })
        setImproveFeedback('')
        setShowImproveInput(false)
        
        toast({
          title: 'Cover Letter Improved!',
          description: 'The AI has updated your cover letter.',
        })
      } else {
        toast({
          title: 'Improvement Failed',
          description: result.error || 'Failed to improve cover letter',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Improve error:', err)
    } finally {
      setIsImproving(false)
    }
  }

  const handleSave = async () => {
    if (!coverLetter?.id) return

    setIsSaving(true)
    try {
      const result = await updateCoverLetter(coverLetter.id, {
        content: editedContent,
        subject: editedSubject,
      })

      if (result.data) {
        setCoverLetter({ ...coverLetter, content: editedContent, subject: editedSubject })
        toast({
          title: 'Saved',
          description: 'Cover letter updated successfully',
        })
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Copied!',
      description: 'Cover letter copied to clipboard',
    })
  }

  const handleSendApplication = () => {
    if (coverLetter) {
      onSendApplication?.({
        id: coverLetter.id,
        content: editedContent,
        subject: editedSubject,
      })
    }
  }

  const hasChanges = coverLetter && (
    editedContent !== coverLetter.content || 
    editedSubject !== coverLetter.subject
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Cover Letter Generator
          </DialogTitle>
          <DialogDescription>
            Generate a personalized cover letter for {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Generation Options */}
          {!coverLetter && (
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default">Default (AI structured)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId !== '__default' && (
                  <p className="mt-1 text-xs text-slate-500">
                    {templates.find((t) => t.id === selectedTemplateId)?.description || 'Uses the selected template structure.'}
                  </p>
                )}
              </div>

              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced Options
                </Button>
                {showAdvanced && (
                  <div className="pt-2">
                    <Label>Custom Instructions (optional)</Label>
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="E.g., Emphasize my leadership experience, mention I'm relocating..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-11 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>

              {previousLetters.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    You have {previousLetters.length} previous cover letter(s) for this job
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      const latest = previousLetters[0]
                      setCoverLetter(latest)
                      setEditedContent(latest.content)
                      setEditedSubject(latest.subject || '')
                    }}
                  >
                    Load most recent
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Generated Cover Letter */}
          {coverLetter && (
            <div className="space-y-4">
              {/* Subject Line */}
              <div>
                <Label>Email Subject</Label>
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Application for..."
                />
              </div>

              {/* Cover Letter Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Cover Letter</Label>
                  <span className="text-xs text-slate-500">
                    {editedContent.split(/\s+/).length} words
                  </span>
                </div>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* AI Improve Section */}
              {showImproveInput ? (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-3 border border-purple-100 dark:border-purple-800">
                  <Label className="text-slate-900 dark:text-white">How should I improve it?</Label>
                  <Textarea
                    value={improveFeedback}
                    onChange={(e) => setImproveFeedback(e.target.value)}
                    placeholder="E.g., Make it more concise, add more technical details, sound more confident..."
                    rows={2}
                    className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleImprove}
                      disabled={isImproving || !improveFeedback.trim()}
                      className="gap-2"
                    >
                      {isImproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Improve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowImproveInput(false)
                        setImproveFeedback('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImproveInput(!showImproveInput)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Improve with AI
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  Copy
                </Button>

                {hasChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                )}
              </div>

              {/* Send Application Button */}
              {onSendApplication && (
                <Button
                  onClick={handleSendApplication}
                  className="w-full h-11 gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <Send className="w-4 h-4" />
                  Continue to Send Application
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
