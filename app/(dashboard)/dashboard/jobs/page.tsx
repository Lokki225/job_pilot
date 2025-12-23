"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, 
  Plus, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Search,
  Sparkles,
  Clock,
  Zap,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JobCard } from '@/components/jobs/JobCard'
import { JobSearchBar, type JobSearchFilters } from '@/components/jobs/JobSearchBar'
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal'
import { JobPasteModal } from '@/components/jobs/JobPasteModal'
import { searchJobsAction } from '@/lib/actions/job-search.action'
import { getJobRecommendations, refreshJobRecommendations, markRecommendedJobSaved } from '@/lib/actions/job-recommendations.action'
import {
  createSavedJobSearch,
  deleteSavedJobSearch,
  getSavedJobSearches,
  updateSavedJobSearch,
} from '@/lib/actions/saved-job-searches.action'
import type { NormalizedJob, JobSearchParams } from '@/lib/services/job-search'
import { createJobApplication } from '@/lib/actions/job-application.action'
import { type ParsedJob } from '@/lib/utils/job-parser'
import { toast } from '@/components/ui/use-toast'

type SavedSearchFrequency = 'hourly' | 'daily' | 'weekly'

function normalizeSavedSearchFrequency(value: any): SavedSearchFrequency {
  if (value === 'hourly' || value === 'daily' || value === 'weekly') return value
  return 'daily'
}

export default function JobsPage() {
  const router = useRouter()
  
  // State
  const [jobs, setJobs] = useState<NormalizedJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalJobs, setTotalJobs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  
  // Recommendations state (cached daily)
  const [topPicks, setTopPicks] = useState<NormalizedJob[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [originalTopPicksCount, setOriginalTopPicksCount] = useState(0)
  
  // Modal states
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<NormalizedJob | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  // Search state
  const [lastSearch, setLastSearch] = useState<JobSearchFilters | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isTopPicksCollapsed, setIsTopPicksCollapsed] = useState(false)

  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(true)
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState<string>('')
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false)
  const [newSavedSearchName, setNewSavedSearchName] = useState('')
  const [newSavedSearchIsEnabled, setNewSavedSearchIsEnabled] = useState(true)
  const [newSavedSearchNotifyOnMatch, setNewSavedSearchNotifyOnMatch] = useState(true)
  const [newSavedSearchFrequency, setNewSavedSearchFrequency] = useState<SavedSearchFrequency>('daily')

  const [isEditSavedSearchDialogOpen, setIsEditSavedSearchDialogOpen] = useState(false)
  const [editSavedSearchName, setEditSavedSearchName] = useState('')
  const [editSavedSearchIsEnabled, setEditSavedSearchIsEnabled] = useState(true)
  const [editSavedSearchNotifyOnMatch, setEditSavedSearchNotifyOnMatch] = useState(true)
  const [editSavedSearchFrequency, setEditSavedSearchFrequency] = useState<SavedSearchFrequency>('daily')

  const getJobKey = useCallback((job: NormalizedJob) => {
    return `${job.source || 'unknown'}:${job.id}`
  }, [])

  const dedupeJobs = useCallback((items: NormalizedJob[]) => {
    const seen = new Set<string>()
    const out: NormalizedJob[] = []
    for (const job of items) {
      const key = `${job.source || 'unknown'}:${job.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(job)
    }
    return out
  }, [])

  const handleSearch = useCallback(async (filters: JobSearchFilters) => {
    setIsLoading(true)
    setError(null)
    setLastSearch(filters)
    setCurrentPage(1)
    
    try {
      const params: JobSearchParams = {
        query: filters.query || 'developer',
        location: filters.location || undefined,
        jobType: filters.jobType && filters.jobType !== 'all' ? filters.jobType : undefined,
        datePosted: filters.datePosted as any,
        remote: filters.remote,
        sortBy: filters.sortBy,
        page: 1,
        resultsPerPage: 20,
      }
      
      const result = await searchJobsAction(params)
      
      if (result.data) {
        const nextJobs = dedupeJobs(result.data.jobs)
        setJobs(nextJobs)
        setTotalJobs(result.data.total)
        setHasMore(result.data.hasMore)
      } else {
        setError(result.error || 'Failed to search jobs')
        setJobs([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search jobs. Please check your API keys are configured.')
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }, [dedupeJobs])

  useEffect(() => {
    ;(async () => {
      try {
        const result = await getSavedJobSearches()
        if (result.data) {
          setSavedSearches(result.data)
        } else if (result.error) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          })
        }
      } catch (err) {
        console.error('Failed to load saved searches:', err)
      } finally {
        setSavedSearchesLoading(false)
      }
    })()
  }, [])

  const normalizeFilters = useCallback((raw: any): JobSearchFilters => {
    return {
      query: raw?.query ?? '',
      location: raw?.location ?? '',
      jobType: raw?.jobType ?? '',
      datePosted: raw?.datePosted ?? 'month',
      remote: Boolean(raw?.remote),
      sortBy: raw?.sortBy ?? 'relevance',
    }
  }, [])

  const handleApplySavedSearch = useCallback(
    async (searchId: string) => {
      const found = savedSearches.find((s) => s.id === searchId)
      if (!found) return

      setHasSearched(true)
      await handleSearch(normalizeFilters(found.filters))
    },
    [handleSearch, normalizeFilters, savedSearches]
  )

  const handleOpenSaveSearchDialog = useCallback(() => {
    if (!lastSearch) {
      toast({
        title: 'Nothing to save',
        description: 'Run a search first, then save it.',
        variant: 'destructive',
      })
      return
    }

    const defaultName =
      (lastSearch.query || 'Search') + (lastSearch.location ? ` • ${lastSearch.location}` : '')
    setNewSavedSearchName(defaultName)
    setNewSavedSearchIsEnabled(true)
    setNewSavedSearchNotifyOnMatch(true)
    setNewSavedSearchFrequency('daily')
    setIsSaveSearchDialogOpen(true)
  }, [lastSearch])

  const handleOpenEditSavedSearchDialog = useCallback(() => {
    if (!selectedSavedSearchId) return

    const found = savedSearches.find((s) => s.id === selectedSavedSearchId)
    if (!found) return

    setEditSavedSearchName(found.name || '')
    setEditSavedSearchIsEnabled(Boolean(found.isEnabled))
    setEditSavedSearchNotifyOnMatch(Boolean(found.notifyOnMatch))
    setEditSavedSearchFrequency(normalizeSavedSearchFrequency(found.frequency))
    setIsEditSavedSearchDialogOpen(true)
  }, [savedSearches, selectedSavedSearchId])

  const handleSaveSearch = useCallback(async () => {
    if (!lastSearch) return
    const name = newSavedSearchName.trim()
    if (!name) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this saved search.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await createSavedJobSearch({
        name,
        filters: lastSearch as any,
        isEnabled: newSavedSearchIsEnabled,
        frequency: newSavedSearchFrequency,
        notifyOnMatch: newSavedSearchNotifyOnMatch,
      })

      if (result.data) {
        setSavedSearches((prev) => [result.data, ...prev])
        setIsSaveSearchDialogOpen(false)
        setSelectedSavedSearchId(result.data.id)
        toast({
          title: 'Saved',
          description: 'Search saved successfully.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save search',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Failed to save search:', err)
      toast({
        title: 'Error',
        description: 'Failed to save search',
        variant: 'destructive',
      })
    }
  }, [
    lastSearch,
    newSavedSearchFrequency,
    newSavedSearchIsEnabled,
    newSavedSearchName,
    newSavedSearchNotifyOnMatch,
  ])

  const handleUpdateSelectedSavedSearch = useCallback(async () => {
    if (!selectedSavedSearchId) return

    const name = editSavedSearchName.trim()
    if (!name) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this saved search.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await updateSavedJobSearch(selectedSavedSearchId, {
        name,
        isEnabled: editSavedSearchIsEnabled,
        notifyOnMatch: editSavedSearchNotifyOnMatch,
        frequency: editSavedSearchFrequency,
      })

      if (result.data) {
        setSavedSearches((prev) => prev.map((s) => (s.id === result.data.id ? result.data : s)))
        setIsEditSavedSearchDialogOpen(false)
        toast({
          title: 'Updated',
          description: 'Saved search updated.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update saved search',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Failed to update saved search:', err)
      toast({
        title: 'Error',
        description: 'Failed to update saved search',
        variant: 'destructive',
      })
    }
  }, [
    editSavedSearchFrequency,
    editSavedSearchIsEnabled,
    editSavedSearchName,
    editSavedSearchNotifyOnMatch,
    selectedSavedSearchId,
  ])

  const handleDeleteSelectedSavedSearch = useCallback(async () => {
    if (!selectedSavedSearchId) return

    try {
      const result = await deleteSavedJobSearch(selectedSavedSearchId)
      if (result.data) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== selectedSavedSearchId))
        setSelectedSavedSearchId('')
        toast({
          title: 'Deleted',
          description: 'Saved search deleted.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete saved search',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Failed to delete saved search:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete saved search',
        variant: 'destructive',
      })
    }
  }, [selectedSavedSearchId])

  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true)
    try {
      const result = await getJobRecommendations()
      if (result.data) {
        setTopPicks(dedupeJobs(result.data.topPicks))
        setOriginalTopPicksCount(result.data.topPicks.length)
        const nextJobs = dedupeJobs(result.data.jobs)
        setJobs(nextJobs)
        setTotalJobs(nextJobs.length)
        setIsFromCache(result.data.fromCache)
        setLastRefreshed(result.data.lastRefreshed)
        setSavedJobIds(new Set()) // Reset saved jobs on fresh load
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setRecommendationsLoading(false)
    }
  }, [dedupeJobs])

  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  const handleRefreshRecommendations = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshJobRecommendations()
      if (result.data) {
        setTopPicks(dedupeJobs(result.data.topPicks))
        setOriginalTopPicksCount(result.data.topPicks.length)
        const nextJobs = dedupeJobs(result.data.jobs)
        setJobs(nextJobs)
        setTotalJobs(nextJobs.length)
        setIsFromCache(false)
        setLastRefreshed(result.data.lastRefreshed)
        setSavedJobIds(new Set()) // Reset saved jobs on refresh
        toast({
          title: 'Recommendations Updated',
          description: 'Found new jobs matching your profile',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to refresh recommendations',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Failed to refresh recommendations:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLoadMore = async () => {
    if (!lastSearch || isLoading) return
    
    setIsLoading(true)
    const nextPage = currentPage + 1
    
    try {
      const params: JobSearchParams = {
        query: lastSearch.query || 'developer',
        location: lastSearch.location || undefined,
        jobType: lastSearch.jobType && lastSearch.jobType !== 'all' ? lastSearch.jobType : undefined,
        datePosted: lastSearch.datePosted as any,
        remote: lastSearch.remote,
        sortBy: lastSearch.sortBy,
        page: nextPage,
        resultsPerPage: 20,
      }
      
      const result = await searchJobsAction(params)
      
      if (result.data) {
        setJobs(prev => dedupeJobs([...prev, ...result.data!.jobs]))
        setCurrentPage(nextPage)
        setHasMore(result.data.hasMore)
      }
    } catch (err) {
      console.error('Load more error:', err)
      toast({
        title: 'Error',
        description: 'Failed to load more jobs',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (job: NormalizedJob) => {
    setSelectedJob(job)
    setShowDetailsModal(true)
  }

  const handleSaveJob = async (job: NormalizedJob, isFromTopPicks: boolean = false) => {
    try {
      const result = await createJobApplication({
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        jobType: job.jobType || null,
        salary: job.salary || null,
        description: job.description,
        requirements: job.requirements || null,
        jobPostUrl: job.applyUrl,
        status: 'WISHLIST',
        source: 'OTHER',
        isPasted: false,
        isFavorite: true,
        externalJobId: job.id,
        externalSource: job.source,
        externalData: job.rawData,
      })
      
      if (result.data) {
        // Remove from topPicks if it was from recommendations
        if (isFromTopPicks) {
          setTopPicks(prev => prev.filter(j => j.id !== job.id))
          setSavedJobIds(prev => new Set([...prev, job.id]))
          // Mark as saved in the backend to persist across refreshes
          await markRecommendedJobSaved(job.id)
        }
        
        toast({
          title: 'Job Saved!',
          description: 'Added to your wishlist',
        })
      } else {
        throw new Error(result.error || 'Failed to save job')
      }
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: 'Error',
        description: 'Failed to save job',
        variant: 'destructive',
      })
    }
  }

  const handleViewSimilar = (similarJob: NormalizedJob) => {
    setSelectedJob(similarJob)
    // Modal stays open, just switches to the new job
  }

  const handleJobParsed = async (parsedJob: ParsedJob) => {
    try {
      const result = await createJobApplication({
        jobTitle: parsedJob.jobTitle,
        company: parsedJob.company,
        location: parsedJob.location,
        jobType: parsedJob.jobType,
        salary: parsedJob.salary,
        description: parsedJob.description,
        requirements: parsedJob.requirements,
        jobPostUrl: parsedJob.jobPostUrl,
        status: 'WISHLIST',
        source: 'PASTED',
        isPasted: true,
        isFavorite: false,
      })
      
      if (result.data) {
        toast({
          title: 'Job Added!',
          description: 'Saved to your applications',
        })
        router.push('/dashboard/jobs/applications')
      } else {
        throw new Error(result.error || 'Failed to save job')
      }
    } catch (err) {
      console.error('Save parsed job error:', err)
      toast({
        title: 'Error',
        description: 'Failed to save job',
        variant: 'destructive',
      })
    }
  }

  const handleFindSimilar = (parsedJob: ParsedJob) => {
    handleSearch({
      query: parsedJob.jobTitle,
      location: parsedJob.location || '',
      jobType: parsedJob.jobType || '',
      datePosted: 'month',
      remote: false,
      sortBy: 'relevance'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Job Search</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalJobs > 0 ? `${totalJobs} jobs found` : 'Search for your next opportunity'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPasteModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Paste Job
          </Button>
          <Button
            onClick={() => router.push('/dashboard/jobs/applications')}
            className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600"
          >
            <Briefcase className="w-4 h-4" />
            My Applications
          </Button>
        </div>
      </div>

      {/* Top Picks Section - Cached Daily */}
      {!hasSearched && (
        <div className="bg-linear-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsTopPicksCollapsed(!isTopPicksCollapsed)}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Picks for You</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {isFromCache && <Clock className="w-3 h-3" />}
                  {lastRefreshed 
                    ? `Updated ${new Date(lastRefreshed).toLocaleDateString()}`
                    : 'Personalized based on your profile'
                  }
                  {topPicks.length > 0 && ` • ${topPicks.length} jobs`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRefreshRecommendations()
                }}
                disabled={isRefreshing || recommendationsLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isTopPicksCollapsed ? '-rotate-90' : ''}`} />
            </div>
          </div>

          {!isTopPicksCollapsed && (
            <div className="mt-4">
              {recommendationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="ml-2 text-slate-600 dark:text-slate-400">Loading recommendations...</span>
                </div>
              ) : topPicks.length > 0 ? (
                <div className="grid gap-3">
                  {topPicks.map((job, index) => (
                    <div
                      key={getJobKey(job)}
                      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer"
                      onClick={() => handleViewDetails(job)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90">
                              #{index + 1} Match
                            </Badge>
                            {job.remote && (
                              <Badge variant="outline" className="text-xs">Remote</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{job.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{job.company} • {job.location}</p>
                          {job.salary && (
                            <p className="text-sm text-green-600 font-medium mt-1">{job.salary}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveJob(job, true)
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : savedJobIds.size > 0 && originalTopPicksCount > 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">All Caught Up! 🎉</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    You've saved all {savedJobIds.size} of today's recommended jobs.
                    <br />
                    Come back tomorrow for fresh recommendations!
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/jobs/applications')}
                      className="gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      View Saved Jobs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRefreshRecommendations}
                      disabled={isRefreshing}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Get More Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Complete your profile to get personalized recommendations</p>
                  <Button
                    variant="link"
                    onClick={() => router.push('/dashboard/profile')}
                    className="mt-2"
                  >
                    Update Profile
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
            <Select
              value={selectedSavedSearchId || undefined}
              onValueChange={async (value) => {
                setSelectedSavedSearchId(value)
                await handleApplySavedSearch(value)
              }}
              disabled={savedSearchesLoading || savedSearches.length === 0}
            >
              <SelectTrigger className="w-full sm:w-72" size="sm">
                <SelectValue
                  placeholder={
                    savedSearchesLoading
                      ? 'Loading saved searches...'
                      : savedSearches.length === 0
                        ? 'No saved searches'
                        : 'Saved searches'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {savedSearches.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSaveSearchDialog}
                disabled={!lastSearch}
              >
                Save search
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditSavedSearchDialog}
                disabled={!selectedSavedSearchId}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelectedSavedSearch}
                disabled={!selectedSavedSearchId}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
        <JobSearchBar 
          onSearch={(filters) => {
            setHasSearched(true)
            handleSearch(filters)
          }} 
          isLoading={isLoading}
          initialFilters={lastSearch || undefined}
        />
      </div>

      <Dialog open={isSaveSearchDialogOpen} onOpenChange={setIsSaveSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save search</DialogTitle>
            <DialogDescription>Save your current filters and get job alerts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={newSavedSearchName}
                onChange={(e) => setNewSavedSearchName(e.target.value)}
                placeholder="e.g. React Remote"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</div>
              <Select value={newSavedSearchFrequency} onValueChange={(value) => setNewSavedSearchFrequency(normalizeSavedSearchFrequency(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Enabled</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Include this search in job alerts</div>
              </div>
              <Switch checked={newSavedSearchIsEnabled} onCheckedChange={setNewSavedSearchIsEnabled} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Notify on match</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Send an in-app notification when new jobs match</div>
              </div>
              <Switch checked={newSavedSearchNotifyOnMatch} onCheckedChange={setNewSavedSearchNotifyOnMatch} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSavedSearchDialogOpen} onOpenChange={setIsEditSavedSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit saved search</DialogTitle>
            <DialogDescription>Update your saved search name and alert settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={editSavedSearchName}
                onChange={(e) => setEditSavedSearchName(e.target.value)}
                placeholder="Saved search name"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</div>
              <Select value={editSavedSearchFrequency} onValueChange={(value) => setEditSavedSearchFrequency(normalizeSavedSearchFrequency(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Enabled</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Include this search in job alerts</div>
              </div>
              <Switch checked={editSavedSearchIsEnabled} onCheckedChange={setEditSavedSearchIsEnabled} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Notify on match</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Send an in-app notification when new jobs match</div>
              </div>
              <Switch checked={editSavedSearchNotifyOnMatch} onCheckedChange={setEditSavedSearchNotifyOnMatch} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSavedSearchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSelectedSavedSearch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-400">Search Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => lastSearch && handleSearch(lastSearch)}
              className="mt-2 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Searching jobs...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No jobs found</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Try adjusting your search filters</p>
        </div>
      )}

      {/* Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={getJobKey(job)}
              job={job}
              onSave={() => handleSaveJob(job)}
              onViewDetails={() => handleViewDetails(job)}
              onApply={() => {
                if (job.applyUrl) {
                  window.open(job.applyUrl, '_blank')
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && jobs.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Jobs'
            )}
          </Button>
        </div>
      )}

      {/* Modals */}
      <JobPasteModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onJobParsed={handleJobParsed}
        onFindSimilar={handleFindSimilar}
      />

      <JobDetailsModal
        job={selectedJob}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedJob(null)
        }}
        onApply={() => {
          if (selectedJob?.applyUrl) {
            window.open(selectedJob.applyUrl, '_blank')
          }
        }}
        onSave={() => selectedJob && handleSaveJob(selectedJob)}
        onViewSimilar={handleViewSimilar}
      />
    </div>
  )
}