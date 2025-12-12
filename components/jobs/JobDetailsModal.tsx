"use client"

import { 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  ExternalLink,
  Building2,
  X,
  BookmarkPlus,
  Share2,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { NormalizedJob } from '@/lib/services/job-search/types'

interface JobDetailsModalProps {
  job: NormalizedJob | null
  isOpen: boolean
  onClose: () => void
  onApply?: (job: NormalizedJob) => void
  onSave?: (job: NormalizedJob) => void
}

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onApply,
  onSave,
}: JobDetailsModalProps) {
  if (!job) return null

  const formatPostedDate = (date?: Date) => {
    if (!date) return 'Recently posted'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'ADZUNA':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'JSEARCH':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.company}`,
          text: `Check out this job: ${job.title} at ${job.company}`,
          url: job.applyUrl,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(job.applyUrl)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getSourceBadgeColor(job.source))}
                >
                  {job.source}
                </Badge>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatPostedDate(job.postedDate)}
                </span>
              </div>
              
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {job.title}
              </DialogTitle>
              
              <div className="flex items-center gap-2 mb-3">
                {job.logoUrl ? (
                  <img 
                    src={job.logoUrl} 
                    alt={job.company} 
                    className="w-8 h-8 rounded object-contain bg-white border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{job.company}</p>
                  {job.companyUrl && (
                    <a 
                      href={job.companyUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      Company website
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                  {job.remote && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                      Remote
                    </Badge>
                  )}
                </span>
                {job.jobType && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {job.jobType}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1 font-semibold text-green-700">
                    <DollarSign className="w-4 h-4" />
                    {job.salary}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="px-6 py-4 space-y-6">
            {/* Skills/Tags */}
            {job.tags && job.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Skills & Technologies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Job Description
              </h3>
              <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Requirements
                </h3>
                <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400">
                  <p className="whitespace-pre-wrap">{job.requirements}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave?.(job)}
              className="gap-2"
            >
              <BookmarkPlus className="w-4 h-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (job.applyUrl) {
                  window.open(job.applyUrl, '_blank')
                }
                onApply?.(job)
              }}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Apply Now
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default JobDetailsModal
