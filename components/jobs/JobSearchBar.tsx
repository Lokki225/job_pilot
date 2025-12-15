"use client"

import { useEffect, useState } from 'react'
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface JobSearchFilters {
  query: string
  location: string
  jobType: string
  datePosted: string
  remote: boolean
  sortBy: 'relevance' | 'date' | 'salary'
}

interface JobSearchBarProps {
  onSearch: (filters: JobSearchFilters) => void
  isLoading?: boolean
  initialFilters?: Partial<JobSearchFilters>
}

const defaultFilters: JobSearchFilters = {
  query: '',
  location: '',
  jobType: '',
  datePosted: 'month',
  remote: false,
  sortBy: 'relevance',
}

export function JobSearchBar({ 
  onSearch, 
  isLoading = false,
  initialFilters = {}
}: JobSearchBarProps) {
  const [filters, setFilters] = useState<JobSearchFilters>({
    ...defaultFilters,
    ...initialFilters,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setFilters({
      ...defaultFilters,
      ...initialFilters,
    })
  }, [
    initialFilters.query,
    initialFilters.location,
    initialFilters.jobType,
    initialFilters.datePosted,
    initialFilters.remote,
    initialFilters.sortBy,
  ])

  const handleSearch = () => {
    onSearch(filters)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const updateFilter = <K extends keyof JobSearchFilters>(
    key: K, 
    value: JobSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const activeFilterCount = [
    filters.jobType,
    filters.datePosted !== 'month' ? filters.datePosted : '',
    filters.remote,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Job title, keywords, or company..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-12"
          />
        </div>

        {/* Location Input */}
        <div className="relative sm:w-64">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="City, state, or remote"
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-12"
          />
        </div>

        {/* Filter Button */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="h-12 gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 bg-blue-600 text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 dark:text-white">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Job Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Job Type
                </label>
                <Select
                  value={filters.jobType}
                  onValueChange={(value) => updateFilter('jobType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Posted */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Date Posted
                </label>
                <Select
                  value={filters.datePosted}
                  onValueChange={(value) => updateFilter('datePosted', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                    <SelectItem value="any">Any time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remote Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Remote only
                </label>
                <button
                  aria-label="Remote only"
                  onClick={() => updateFilter('remote', !filters.remote)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    filters.remote ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      filters.remote ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Apply Filters */}
              <Button 
                onClick={() => {
                  setShowAdvanced(false)
                  handleSearch()
                }}
                className="w-full"
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          disabled={isLoading}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Active filters:</span>
          
          {filters.jobType && filters.jobType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.jobType}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('jobType', '')}
              />
            </Badge>
          )}
          
          {filters.datePosted && filters.datePosted !== 'month' && (
            <Badge variant="secondary" className="gap-1">
              {filters.datePosted === 'today' ? 'Today' : 
               filters.datePosted === 'week' ? 'Past week' : 
               filters.datePosted === 'any' ? 'Any time' : 'Past month'}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('datePosted', 'month')}
              />
            </Badge>
          )}
          
          {filters.remote && (
            <Badge variant="secondary" className="gap-1">
              Remote only
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('remote', false)}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Sort by:</span>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => {
              updateFilter('sortBy', value as any)
              handleSearch()
            }}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Best Match</SelectItem>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default JobSearchBar
