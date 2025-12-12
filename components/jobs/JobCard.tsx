"use client"

import { useState } from 'react'
import { 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Star, 
  BookmarkPlus, 
  ExternalLink,
  Building2,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NormalizedJob } from '@/lib/services/job-search/types'

interface JobCardProps {
  job: NormalizedJob
  matchScore?: number
  isSaved?: boolean
  onSave?: (jobId: string) => void
  onApply?: (job: NormalizedJob) => void
  onViewDetails?: (job: NormalizedJob) => void
  variant?: 'default' | 'compact'
}

export function JobCard({
  job,
  matchScore,
  isSaved = false,
  onSave,
  onApply,
  onViewDetails,
  variant = 'default'
}: JobCardProps) {
  const [saved, setSaved] = useState(isSaved)

  const handleSave = () => {
    setSaved(!saved)
    onSave?.(job.id)
  }

  const formatPostedDate = (date?: Date | string) => {
    if (!date) return 'Recently posted'
    
    const parsedDate = typeof date === 'string' ? new Date(date) : date
    if (isNaN(parsedDate.getTime())) return 'Recently posted'
    
    const now = new Date()
    const diffMs = now.getTime() - parsedDate.getTime()
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

  if (variant === 'compact') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {job.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{job.company}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
              {job.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary}
                </span>
              )}
            </div>
          </div>
          {matchScore && (
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
              {matchScore}%
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {job.title}
            </h3>
            {matchScore && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                {matchScore}% Match
              </span>
            )}
            <Badge 
              variant="outline" 
              className={cn("text-xs", getSourceBadgeColor(job.source))}
            >
              {job.source}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            {job.logoUrl ? (
              <img 
                src={job.logoUrl} 
                alt={job.company} 
                className="w-6 h-6 rounded object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-slate-400" />
            )}
            <p className="text-slate-600 dark:text-slate-300 font-medium">{job.company}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
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
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {job.salary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatPostedDate(job.postedDate)}
            </span>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSave()
          }}
          className={cn(
            "p-2 rounded-lg transition-all",
            saved
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          )}
        >
          <BookmarkPlus className="w-5 h-5" />
        </button>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
        {job.description}
      </p>

      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 5 && (
            <span className="px-3 py-1 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-xs">
              +{job.tags.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            if (job.applyUrl) {
              window.open(job.applyUrl, '_blank')
            }
            onApply?.(job)
          }}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          Apply Now
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails?.(job)
          }}
        >
          View Details
        </Button>
      </div>
    </div>
  )
}

export default JobCard
