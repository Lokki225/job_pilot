"use client"

import { useState } from 'react'
import { 
  Clipboard, 
  X, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  MapPin,
  Briefcase,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseJobPosting, type ParsedJob } from '@/lib/utils/job-parser'

interface JobPasteModalProps {
  isOpen: boolean
  onClose: () => void
  onJobParsed: (job: ParsedJob) => void
  onFindSimilar?: (job: ParsedJob) => void
}

export function JobPasteModal({
  isOpen,
  onClose,
  onJobParsed,
  onFindSimilar,
}: JobPasteModalProps) {
  const [pastedText, setPastedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedJob, setParsedJob] = useState<ParsedJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExtract = () => {
    if (!pastedText.trim()) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const result = parseJobPosting(pastedText)
      
      if (result.jobTitle && result.company) {
        setParsedJob(result)
      } else {
        setError('Could not extract job details. Please ensure the text contains a job title and company name.')
      }
    } catch (err) {
      setError('An error occurred while parsing the job posting')
      console.error('Parse error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveJob = () => {
    if (parsedJob) {
      onJobParsed(parsedJob)
      handleReset()
      onClose()
    }
  }

  const handleFindSimilar = () => {
    if (parsedJob) {
      onFindSimilar?.(parsedJob)
      handleReset()
      onClose()
    }
  }

  const handleReset = () => {
    setPastedText('')
    setParsedJob(null)
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Paste Job Posting
              </DialogTitle>
              <p className="text-blue-100 text-sm">
                Paste any job posting to save or find similar jobs
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!parsedJob ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Copy the entire job posting from LinkedIn, Indeed, or any website</li>
                  <li>Paste it in the text area below</li>
                  <li>Click "Extract Job Details" to analyze it</li>
                  <li>Review the extracted information</li>
                  <li>Save to your applications or find similar jobs</li>
                </ol>
              </div>

              {/* Text Area */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste Job Posting
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the complete job posting here... Include title, company, description, requirements, etc."
                  className="w-full h-64 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  {pastedText.length} characters • The more details you provide, the better the extraction
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleExtract}
                disabled={!pastedText.trim() || isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Extract Job Details
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">
                    Job Details Extracted Successfully!
                  </h3>
                  <p className="text-sm text-green-700">
                    Review the information below and save or find similar jobs
                  </p>
                </div>
              </div>

              {/* Extracted Job Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {parsedJob.jobTitle}
                    </h3>
                    <p className="text-lg text-slate-700 font-medium mb-1">
                      {parsedJob.company}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      {parsedJob.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {parsedJob.location}
                        </span>
                      )}
                      {parsedJob.jobType && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {parsedJob.jobType}
                        </span>
                      )}
                      {parsedJob.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {parsedJob.salary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {parsedJob.requirements && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Requirements
                    </h4>
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {parsedJob.requirements}
                    </p>
                  </div>
                )}

                {parsedJob.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-slate-600 line-clamp-4">
                      {parsedJob.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleSaveJob}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Save to Applications
                </Button>
                {onFindSimilar && (
                  <Button
                    onClick={handleFindSimilar}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Find Similar Jobs
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default JobPasteModal
