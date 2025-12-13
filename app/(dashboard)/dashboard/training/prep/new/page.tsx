"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FileText, 
  Briefcase, 
  Building2, 
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { 
  createPrepPack, 
  createPrepPackFromJobApplication,
  generatePrepPackPlan,
  getJobApplicationsForPrepPack 
} from '@/lib/actions/prep-pack.action'

interface JobApplication {
  id: string
  jobTitle: string
  company: string
  description: string | null
}

export default function NewPrepPackPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'paste' | 'select'>('paste')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Form state for paste mode
  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    jobPostText: '',
    jobPostUrl: '',
    companyWebsite: '',
  })

  useEffect(() => {
    loadJobApplications()
  }, [])

  const loadJobApplications = async () => {
    setLoadingJobs(true)
    const result = await getJobApplicationsForPrepPack()
    if (result.success && result.data) {
      setJobApplications(result.data)
    }
    setLoadingJobs(false)
  }

  const handlePasteSubmit = async () => {
    if (!formData.companyName.trim() || !formData.jobTitle.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter company name and job title',
        variant: 'destructive',
      })
      return
    }

    if (!formData.jobPostText.trim() || formData.jobPostText.length < 100) {
      toast({
        title: 'Job Description Too Short',
        description: 'Please paste the full job description (at least 100 characters)',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    // Step 1: Create prep pack
    const createResult = await createPrepPack({
      companyName: formData.companyName,
      jobTitle: formData.jobTitle,
      jobPostText: formData.jobPostText,
      jobPostUrl: formData.jobPostUrl || undefined,
      companyWebsite: formData.companyWebsite || undefined,
    })

    if (!createResult.success || !createResult.data) {
      toast({
        title: 'Error',
        description: createResult.error || 'Failed to create prep pack',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    const prepPackId = createResult.data.id

    // Step 2: Generate the plan
    setIsGenerating(true)
    const generateResult = await generatePrepPackPlan(prepPackId)

    if (!generateResult.success) {
      toast({
        title: 'Plan Generation Failed',
        description: generateResult.error || 'Failed to generate prep plan. You can try again from the detail page.',
        variant: 'destructive',
      })
      // Still redirect to the prep pack page (it's in DRAFT status)
      router.push(`/dashboard/training/prep/${prepPackId}`)
      return
    }

    toast({
      title: 'Prep Pack Created!',
      description: 'Your interview preparation plan is ready.',
    })

    router.push(`/dashboard/training/prep/${prepPackId}`)
  }

  const handleSelectSubmit = async () => {
    if (!selectedJobId) {
      toast({
        title: 'No Job Selected',
        description: 'Please select a job application',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    // Step 1: Create prep pack from job application
    const createResult = await createPrepPackFromJobApplication(selectedJobId)

    if (!createResult.success || !createResult.data) {
      toast({
        title: 'Error',
        description: createResult.error || 'Failed to create prep pack',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    const prepPackId = createResult.data.id

    // Step 2: Generate the plan
    setIsGenerating(true)
    const generateResult = await generatePrepPackPlan(prepPackId)

    if (!generateResult.success) {
      toast({
        title: 'Plan Generation Failed',
        description: generateResult.error || 'Failed to generate prep plan. You can try again from the detail page.',
        variant: 'destructive',
      })
      router.push(`/dashboard/training/prep/${prepPackId}`)
      return
    }

    toast({
      title: 'Prep Pack Created!',
      description: 'Your interview preparation plan is ready.',
    })

    router.push(`/dashboard/training/prep/${prepPackId}`)
  }

  const selectedJob = jobApplications.find(j => j.id === selectedJobId)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/training/prep">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Interview Prep Pack</h1>
          <p className="text-muted-foreground">
            Generate a personalized interview preparation plan
          </p>
        </div>
      </div>

      {/* Loading/Generating State */}
      {(isLoading || isGenerating) && (
        <Card className="border-primary">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isGenerating ? 'Generating Your Prep Plan...' : 'Creating Prep Pack...'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {isGenerating 
                ? 'AI is analyzing the job posting and creating a personalized preparation plan. This may take 30-60 seconds.'
                : 'Setting up your interview prep pack...'
              }
            </p>
            {isGenerating && (
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Extracting job requirements</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating interview questions</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <div className="h-4 w-4" />
                  <span>Building study plan</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      {!isLoading && !isGenerating && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'paste' | 'select')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="gap-2">
              <FileText className="h-4 w-4" />
              Paste Job Description
            </TabsTrigger>
            <TabsTrigger value="select" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Select from My Jobs
            </TabsTrigger>
          </TabsList>

          {/* Paste Tab */}
          <TabsContent value="paste" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>
                  Enter the company and job information, then paste the full job description.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="e.g., Google"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g., Senior Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobPostText">Job Description *</Label>
                  <Textarea
                    id="jobPostText"
                    placeholder="Paste the full job description here..."
                    className="min-h-[250px] font-mono text-sm"
                    value={formData.jobPostText}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobPostText: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the complete job posting including responsibilities, requirements, and qualifications.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobPostUrl">Job Posting URL (optional)</Label>
                    <Input
                      id="jobPostUrl"
                      placeholder="https://..."
                      value={formData.jobPostUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobPostUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Company Website (optional)</Label>
                    <Input
                      id="companyWebsite"
                      placeholder="https://company.com"
                      value={formData.companyWebsite}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/training/prep">Cancel</Link>
              </Button>
              <Button onClick={handlePasteSubmit}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Prep Pack
              </Button>
            </div>
          </TabsContent>

          {/* Select Tab */}
          <TabsContent value="select" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Select a Job Application</CardTitle>
                <CardDescription>
                  Choose from your saved job applications to create a prep pack.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : jobApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No job applications found.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add jobs from the Jobs page or paste a job description instead.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {jobApplications.map((job) => (
                      <div
                        key={job.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedJobId === job.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            selectedJobId === job.id ? 'border-primary' : 'border-muted-foreground'
                          }`}>
                            {selectedJobId === job.id && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{job.jobTitle}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{job.company}</span>
                            </div>
                            {job.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {job.description.substring(0, 150)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedJob && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Selected: <strong>{selectedJob.jobTitle}</strong> at {selectedJob.company}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/training/prep">Cancel</Link>
              </Button>
              <Button onClick={handleSelectSubmit} disabled={!selectedJobId}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Prep Pack
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
