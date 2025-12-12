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
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JobCard } from '@/components/jobs/JobCard'
import { JobSearchBar, type JobSearchFilters } from '@/components/jobs/JobSearchBar'
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal'
import { JobPasteModal } from '@/components/jobs/JobPasteModal'
import { searchJobsAction } from '@/lib/actions/job-search.action'
import { getJobRecommendations, refreshJobRecommendations } from '@/lib/actions/job-recommendations.action'
import type { NormalizedJob, JobSearchParams } from '@/lib/services/job-search'
import { createJobApplication } from '@/lib/actions/job-application.action'
import { type ParsedJob } from '@/lib/utils/job-parser'
import { toast } from '@/components/ui/use-toast'

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

  // Load cached recommendations on mount
  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setRecommendationsLoading(true)
    try {
      const result = await getJobRecommendations()
      if (result.data) {
        setTopPicks(result.data.topPicks)
        setOriginalTopPicksCount(result.data.topPicks.length)
        setJobs(result.data.jobs)
        setTotalJobs(result.data.jobs.length)
        setIsFromCache(result.data.fromCache)
        setLastRefreshed(result.data.lastRefreshed)
        setSavedJobIds(new Set()) // Reset saved jobs on fresh load
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const handleRefreshRecommendations = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshJobRecommendations()
      if (result.data) {
        setTopPicks(result.data.topPicks)
        setOriginalTopPicksCount(result.data.topPicks.length)
        setJobs(result.data.jobs)
        setTotalJobs(result.data.jobs.length)
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

  const handleSearch = async (filters: JobSearchFilters) => {
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
        setJobs(result.data.jobs)
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
        setJobs(prev => [...prev, ...result.data!.jobs])
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
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Search</h1>
            <p className="text-sm text-slate-500">
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
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Briefcase className="w-4 h-4" />
            My Applications
          </Button>
        </div>
      </div>

      {/* Top Picks Section - Cached Daily */}
      {!hasSearched && (
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Top Picks for You</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {isFromCache && <Clock className="w-3 h-3" />}
                  {lastRefreshed 
                    ? `Updated ${new Date(lastRefreshed).toLocaleDateString()}`
                    : 'Personalized based on your profile'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshRecommendations}
              disabled={isRefreshing || recommendationsLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {recommendationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="ml-2 text-slate-600">Loading recommendations...</span>
            </div>
          ) : topPicks.length > 0 ? (
            <div className="grid gap-3">
              {topPicks.map((job, index) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
                  onClick={() => handleViewDetails(job)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                          #{index + 1} Match
                        </Badge>
                        {job.remote && (
                          <Badge variant="outline" className="text-xs">Remote</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                      <p className="text-sm text-slate-600">{job.company} • {job.location}</p>
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up! 🎉</h3>
              <p className="text-slate-600 mb-4">
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

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <JobSearchBar 
          onSearch={(filters) => {
            setHasSearched(true)
            handleSearch(filters)
          }} 
          isLoading={isLoading}
          initialFilters={lastSearch || undefined}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Search Error</h3>
            <p className="text-sm text-red-700">{error}</p>
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
          <p className="text-slate-600">Searching jobs...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
          <p className="text-slate-600 mb-4">Try adjusting your search filters</p>
        </div>
      )}

      {/* Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
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
      />
    </div>
  )
}