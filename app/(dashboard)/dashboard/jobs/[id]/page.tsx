"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign,
  Briefcase,
  ExternalLink,
  Star,
  Clock,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Save,
  Sparkles,
  Send,
  Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  getJobApplication, 
  updateJobApplication, 
  deleteJobApplication,
  toggleFavorite 
} from '@/lib/actions/job-application.action'
import { getCoverLettersForJob } from '@/lib/actions/cover-letter.action'
import { toast } from '@/components/ui/use-toast'
import { CoverLetterGenerator } from '@/components/jobs/CoverLetterGenerator'
import { AutoApplyModal } from '@/components/jobs/AutoApplyModal'

type ApplicationStatus = 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN'

interface JobApplication {
  id: string
  jobTitle: string
  company: string
  location: string | null
  jobType: string | null
  salary: string | null
  description: string | null
  requirements: string | null
  jobPostUrl: string | null
  status: ApplicationStatus
  source: string
  isPasted: boolean
  isFavorite: boolean
  appliedDate: string | null
  interviewDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'WISHLIST', label: 'Wishlist', color: 'bg-slate-100 text-slate-700' },
  { value: 'APPLIED', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'INTERVIEWING', label: 'Interviewing', color: 'bg-purple-100 text-purple-700' },
  { value: 'OFFERED', label: 'Offered', color: 'bg-green-100 text-green-700' },
  { value: 'ACCEPTED', label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
]

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<JobApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cover letter & auto-apply modals
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false)
  const [showAutoApplyModal, setShowAutoApplyModal] = useState(false)
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<{
    id: string
    content: string
    subject: string
  } | null>(null)
  const [existingCoverLetters, setExistingCoverLetters] = useState<{
    id: string
    content: string
    subject: string
    createdAt: string
  }[]>([])
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    jobTitle: '',
    company: '',
    location: '',
    jobType: '',
    salary: '',
    description: '',
    requirements: '',
    jobPostUrl: '',
    notes: '',
    status: 'WISHLIST' as ApplicationStatus,
    appliedDate: '',
    interviewDate: '',
  })

  useEffect(() => {
    loadJob()
  }, [jobId])

  useEffect(() => {
    if (job?.id) {
      loadCoverLetters()
    }
  }, [job?.id])

  const loadCoverLetters = async () => {
    if (!job?.id) return
    setIsLoadingCoverLetters(true)
    try {
      const result = await getCoverLettersForJob(job.id)
      if (result.data) {
        setExistingCoverLetters(result.data as any[])
        // Set the most recent as the generated one for auto-apply
        if (result.data.length > 0) {
          const latest = result.data[0] as any
          setGeneratedCoverLetter({
            id: latest.id,
            content: latest.content,
            subject: latest.subject || `Application for ${job.jobTitle}`,
          })
        }
      }
    } catch (err) {
      console.error('Failed to load cover letters:', err)
    } finally {
      setIsLoadingCoverLetters(false)
    }
  }

  const loadJob = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getJobApplication(jobId)
      if (result.data) {
        setJob(result.data as JobApplication)
        setEditForm({
          jobTitle: result.data.jobTitle || '',
          company: result.data.company || '',
          location: result.data.location || '',
          jobType: result.data.jobType || '',
          salary: result.data.salary || '',
          description: result.data.description || '',
          requirements: result.data.requirements || '',
          jobPostUrl: result.data.jobPostUrl || '',
          notes: result.data.notes || '',
          status: result.data.status as ApplicationStatus,
          appliedDate: result.data.appliedDate ? result.data.appliedDate.split('T')[0] : '',
          interviewDate: result.data.interviewDate ? result.data.interviewDate.split('T')[0] : '',
        })
      } else {
        setError(result.error || 'Job not found')
      }
    } catch (err) {
      console.error('Failed to load job:', err)
      setError('Failed to load job details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateJobApplication(jobId, {
        jobTitle: editForm.jobTitle,
        company: editForm.company,
        location: editForm.location || null,
        jobType: editForm.jobType || null,
        salary: editForm.salary || null,
        description: editForm.description || null,
        requirements: editForm.requirements || null,
        jobPostUrl: editForm.jobPostUrl || null,
        notes: editForm.notes || null,
        status: editForm.status,
        appliedDate: editForm.appliedDate || null,
        interviewDate: editForm.interviewDate || null,
      })

      if (result.data) {
        setJob(result.data as JobApplication)
        setIsEditing(false)
        toast({
          title: 'Saved',
          description: 'Job application updated successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save changes',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      const result = await deleteJobApplication(jobId)
      if (result.data) {
        toast({
          title: 'Deleted',
          description: 'Job application removed',
        })
        router.push('/dashboard/jobs/applications')
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleToggleFavorite = async () => {
    if (!job) return
    
    try {
      const result = await toggleFavorite(jobId)
      if (result.data) {
        setJob({ ...job, isFavorite: !job.isFavorite })
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
    }
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge>{status}</Badge>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading job details...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Job Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">{error || 'This job application does not exist'}</p>
        <Button onClick={() => router.push('/dashboard/jobs/applications')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Applications
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              {getStatusBadge(job.status)}
              {job.isFavorite && (
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.jobTitle}</h1>
            <div className="flex items-center gap-4 mt-2 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
          >
            <Star className={`w-4 h-4 ${job.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Job Details</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={editForm.company}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Job Type</Label>
                    <Input
                      value={editForm.jobType}
                      onChange={(e) => setEditForm({ ...editForm, jobType: e.target.value })}
                      placeholder="e.g., Full-time, Contract"
                    />
                  </div>
                </div>
                <div>
                  <Label>Salary</Label>
                  <Input
                    value={editForm.salary}
                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                    placeholder="e.g., $80,000 - $100,000"
                  />
                </div>
                <div>
                  <Label>Job Post URL</Label>
                  <Input
                    value={editForm.jobPostUrl}
                    onChange={(e) => setEditForm({ ...editForm, jobPostUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {job.jobType && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.jobType}</span>
                  </div>
                )}
                {job.salary && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <DollarSign className="w-4 h-4" />
                    <span>{job.salary}</span>
                  </div>
                )}
                {job.jobPostUrl && (
                  <div className="col-span-2">
                    <a
                      href={job.jobPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                      View Original Posting
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Description</h2>
            {isEditing ? (
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={8}
                placeholder="Job description..."
              />
            ) : (
              <div className="prose prose-slate max-w-none text-slate-600 dark:text-slate-400">
                {job.description ? (
                  <p className="whitespace-pre-wrap">{job.description}</p>
                ) : (
                  <p className="text-slate-400 italic">No description available</p>
                )}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Requirements</h2>
            {isEditing ? (
              <Textarea
                value={editForm.requirements}
                onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                rows={6}
                placeholder="Job requirements..."
              />
            ) : (
              <div className="prose prose-slate max-w-none">
                {job.requirements ? (
                  <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">{job.requirements}</p>
                ) : (
                  <p className="text-slate-400 italic">No requirements listed</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Notes
            </h2>
            {isEditing ? (
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={4}
                placeholder="Add your notes about this application..."
              />
            ) : (
              <div>
                {job.notes ? (
                  <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">{job.notes}</p>
                ) : (
                  <p className="text-slate-400 italic">No notes yet. Click Edit to add notes.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status & Timeline */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Application Status</h2>
            
            {isEditing ? (
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value as ApplicationStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-4">
                {getStatusBadge(job.status)}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Important Dates</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Applied Date</Label>
                  <Input
                    type="date"
                    value={editForm.appliedDate}
                    onChange={(e) => setEditForm({ ...editForm, appliedDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Interview Date</Label>
                  <Input
                    type="date"
                    value={editForm.interviewDate}
                    onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Added</span>
                  <span className="text-slate-900 dark:text-white">{formatDate(job.createdAt)}</span>
                </div>
                {job.appliedDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Applied</span>
                    <span className="text-slate-900 dark:text-white">{formatDate(job.appliedDate)}</span>
                  </div>
                )}
                {job.interviewDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Interview</span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium">{formatDate(job.interviewDate)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Source</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{job.source}</Badge>
              {job.isPasted && (
                <Badge variant="secondary">Pasted</Badge>
              )}
            </div>
          </div>

          {/* AI Actions */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-800 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI Assistant
            </h2>
            <div className="space-y-3">
              {isLoadingCoverLetters ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                </div>
              ) : existingCoverLetters.length > 0 ? (
                <>
                  {/* Show existing cover letter info */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Cover Letter Ready
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {existingCoverLetters.length} version{existingCoverLetters.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                      {existingCoverLetters[0].content.substring(0, 100)}...
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setShowCoverLetterModal(true)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        View / Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setShowCoverLetterModal(true)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full justify-start gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => setShowAutoApplyModal(true)}
                  >
                    <Send className="w-4 h-4" />
                    Send Application
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowCoverLetterModal(true)}
                >
                  <FileText className="w-4 h-4 text-purple-600" />
                  Generate Cover Letter
                </Button>
              )}
            </div>
          </div>

          {/* External Apply */}
          {job.jobPostUrl && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(job.jobPostUrl!, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apply on Website
            </Button>
          )}
        </div>
      </div>

      {/* Cover Letter Generator Modal */}
      {job && (
        <CoverLetterGenerator
          isOpen={showCoverLetterModal}
          onClose={() => {
            setShowCoverLetterModal(false)
            loadCoverLetters() // Refresh cover letters after closing
          }}
          jobApplicationId={job.id}
          jobTitle={job.jobTitle}
          company={job.company}
          onGenerated={(coverLetter) => {
            setGeneratedCoverLetter(coverLetter)
            loadCoverLetters() // Refresh cover letters list
          }}
          onSendApplication={(coverLetter) => {
            setGeneratedCoverLetter(coverLetter)
            setShowCoverLetterModal(false)
            setShowAutoApplyModal(true)
          }}
        />
      )}

      {/* Auto Apply Modal */}
      {job && generatedCoverLetter && (
        <AutoApplyModal
          isOpen={showAutoApplyModal}
          onClose={() => setShowAutoApplyModal(false)}
          jobApplicationId={job.id}
          jobTitle={job.jobTitle}
          company={job.company}
          coverLetter={generatedCoverLetter}
          onSuccess={() => {
            loadJob() // Refresh job data after sending
          }}
        />
      )}
    </div>
  )
}