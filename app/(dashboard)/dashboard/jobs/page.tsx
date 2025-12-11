"use client"

import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Briefcase, Clock, Star, Filter, SlidersHorizontal, X, ChevronDown, BookmarkPlus, ExternalLink, Sparkles, Clipboard, Loader2, CheckCircle2, ArrowRight, Plus } from 'lucide-react';

export default function JobSearchUI() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pastedJobText, setPastedJobText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedJob, setExtractedJob] = useState<ExtractedJobType | null>(null);
  type FilterCategory = 'jobType' | 'experience' | 'salary' | 'location';
  type ExtractedJobType = {
    title: string;
    company: string;
    location: string;
    type: string;
    experience: string;
    salary: string;
    skills: string[];
    description: string;
    };

  const [selectedFilters, setSelectedFilters] = useState<{
    jobType: string[];
    experience: string[];
    salary: string[];
    location: string[];
  }>({
    jobType: [],
    experience: [],
    salary: [],
    location: []
  });
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [sortBy, setSortBy] = useState('relevance');

  const jobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      type: 'Full-time',
      salary: '$120k - $160k',
      experience: 'Senior',
      match: 95,
      postedTime: '2 days ago',
      skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
      description: 'Leading frontend team building next-gen SaaS products...'
    },
    {
      id: 2,
      title: 'React Developer',
      company: 'StartupXYZ',
      location: 'Remote',
      type: 'Full-time',
      salary: '$100k - $140k',
      experience: 'Mid-level',
      match: 92,
      postedTime: '1 week ago',
      skills: ['React', 'JavaScript', 'CSS', 'REST APIs'],
      description: 'Join our fast-growing team to revolutionize e-commerce...'
    },
    {
      id: 3,
      title: 'Full Stack Engineer',
      company: 'InnovateLabs',
      location: 'New York, NY',
      type: 'Full-time',
      salary: '$130k - $170k',
      experience: 'Senior',
      match: 88,
      postedTime: '3 days ago',
      skills: ['React', 'Python', 'PostgreSQL', 'Docker'],
      description: 'Build scalable microservices for millions of users...'
    },
    {
      id: 4,
      title: 'Frontend Software Engineer',
      company: 'DesignFirst Co.',
      location: 'Austin, TX',
      type: 'Contract',
      salary: '$90k - $120k',
      experience: 'Mid-level',
      match: 85,
      postedTime: '5 days ago',
      skills: ['React', 'Vue.js', 'Tailwind', 'Figma'],
      description: 'Create beautiful, accessible user interfaces...'
    },
    {
      id: 5,
      title: 'Lead Frontend Architect',
      company: 'Enterprise Solutions',
      location: 'Seattle, WA',
      type: 'Full-time',
      salary: '$150k - $200k',
      experience: 'Lead',
      match: 82,
      postedTime: '1 day ago',
      skills: ['React', 'Architecture', 'Team Leadership', 'Performance'],
      description: 'Architect and scale our frontend platform...'
    }
  ];

  const filterOptions = {
    jobType: ['Full-time', 'Part-time', 'Contract', 'Freelance'],
    experience: ['Entry', 'Mid-level', 'Senior', 'Lead'],
    salary: ['< $80k', '$80k - $120k', '$120k - $160k', '> $160k'],
    location: ['Remote', 'San Francisco', 'New York', 'Austin', 'Seattle']
  };

  const toggleSaveJob = (jobId: any) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleFilter = (category: FilterCategory, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      jobType: [],
      experience: [],
      salary: [],
      location: []
    });
  };

  const extractJobData = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate AI extraction (replace with actual Claude API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock extracted data
      const extracted = {
        title: 'IT Operations Associate',
        company: 'Wave Mobile Money',
        location: 'Abidjan, Côte d\'Ivoire',
        type: 'Full-time',
        experience: 'Mid-level',
        salary: 'Not specified',
        skills: ['Network Administration', 'IT Support', 'SQL', 'Google Workspace', 'VOIP/SIP'],
        description: 'Manage IT infrastructure and support operations across Wave offices in Africa...'
      };
      
      setExtractedJob(extracted);
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const findSimilarJobs = () => {
    // This would trigger the API search with extracted job data
    console.log('Searching for similar jobs to:', extractedJob);
    setShowPasteModal(false);
    setPastedJobText('');
    setExtractedJob(null);
    // Here you would update the jobs list with API results
  };

  const activeFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Paste Job Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clipboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Find Similar Jobs</h2>
                  <p className="text-blue-100 text-sm">Paste any job posting to find matches</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPastedJobText('');
                  setExtractedJob(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {!extractedJob ? (
                <>
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Copy the entire job posting from LinkedIn, Indeed, or any website</li>
                      <li>Paste it in the text area below</li>
                      <li>Click "Extract Job Details" to analyze it with AI</li>
                      <li>Review the extracted information</li>
                      <li>Get similar job recommendations</li>
                    </ol>
                  </div>

                  {/* Text Area */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Paste Job Posting
                    </label>
                    <textarea
                      value={pastedJobText}
                      onChange={(e) => setPastedJobText(e.target.value)}
                      placeholder="Paste the complete job posting here... Include title, company, description, requirements, etc."
                      className="w-full h-64 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {pastedJobText.length} characters • The more details you provide, the better the matches
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={extractJobData}
                    disabled={!pastedJobText.trim() || isProcessing}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Extract Job Details
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Extracted Job Preview */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-1">Job Details Extracted Successfully!</h3>
                      <p className="text-sm text-green-700">Review the information below and click "Find Similar Jobs"</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{extractedJob.title}</h3>
                        <p className="text-lg text-slate-700 font-medium mb-1">{extractedJob.company}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {extractedJob.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {extractedJob.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {extractedJob.salary}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {extractedJob.skills.map(skill => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
                      <p className="text-sm text-slate-600">{extractedJob.description}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setExtractedJob(null);
                        setPastedJobText('');
                      }}
                      className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={findSimilarJobs}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      Find Similar Jobs
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 top-0 z-40 shadow-sm rounded-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Job Matches</h1>
                <p className="text-sm text-slate-500">Based on your search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowPasteModal(true)}
                    className="px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center gap-2"
                    >
                    <Plus className="w-4 h-4" />
                    Paste Job
                </button>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                5 / 5 Free Searches
              </span>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Upgrade Pro
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search job titles, companies, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {(Object.entries(filterOptions) as [FilterCategory, string[]][]).map(([category, options]) => (
                <div key={category} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0">
                  <h4 className="text-sm font-medium text-slate-700 mb-2 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="space-y-2">
                    {options.map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedFilters[category].includes(option)}
                          onChange={() => toggleFilter(category, option)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Listings */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{jobs.length}</span> jobs found
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relevance">Best Match</option>
                  <option value="recent">Most Recent</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </div>

            {/* Job Cards */}
            <div className="space-y-4">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {job.match}% Match
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium mb-1">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.postedTime}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSaveJob(job.id)}
                      className={`p-2 rounded-lg transition-all ${
                        savedJobs.has(job.id)
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <BookmarkPlus className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-slate-600 text-sm mb-3 line-clamp-2">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      Apply Now
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-6 text-center">
              <button className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                Load More Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}