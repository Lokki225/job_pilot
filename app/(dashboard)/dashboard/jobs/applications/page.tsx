"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, 
  Plus, 
  Loader2, 
  Search,
  LayoutGrid,
  List,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApplicationKanban, type JobApplication, type ApplicationStatus } from '@/components/jobs/ApplicationKanban'
import { OfferCongratulationsModal } from '@/components/jobs/OfferCongratulationsModal'
import { 
  listJobApplications, 
  updateApplicationStatus,
  deleteJobApplication,
  toggleFavorite
} from '@/lib/actions/job-application.action'
import { toast } from '@/components/ui/use-toast'

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showOfferCongratsModal, setShowOfferCongratsModal] = useState(false)
  const [offeredJob, setOfferedJob] = useState<{ jobTitle: string; company: string } | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setIsLoading(true)
    try {
      const result = await listJobApplications({})
      
      if (result.data) {
        const mapped = result.data.map((app: any) => ({
          id: app.id,
          jobTitle: app.jobTitle,
          company: app.company,
          location: app.location,
          status: app.status as ApplicationStatus,
          appliedAt: app.appliedAt ? new Date(app.appliedAt) : null,
          createdAt: new Date(app.createdAt),
          jobPostUrl: app.jobPostUrl,
          salary: app.salary,
          isFavorite: app.isFavorite,
        }))
        setApplications(mapped)
      }
    } catch (err) {
      console.error('Failed to load applications:', err)
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    // Optimistic update
    setApplications(prev => 
      prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
    )

    try {
      const result = await updateApplicationStatus(id, newStatus)
      
      if (!result.data) {
        // Revert on error
        loadApplications()
        toast({
          title: 'Error',
          description: result.error || 'Failed to update status',
          variant: 'destructive',
        })
      } else {
        // Show congratulations modal if moved to OFFERED or ACCEPTED
        const app = applications.find(a => a.id === id)
        if ((newStatus === 'OFFERED' || newStatus === 'ACCEPTED') && app) {
          setOfferedJob({ jobTitle: app.jobTitle, company: app.company })
          setShowOfferCongratsModal(true)
        } else {
          toast({
            title: 'Status Updated',
            description: `Moved to ${newStatus.toLowerCase()}`,
          })
        }
      }
    } catch (err) {
      loadApplications()
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    // Optimistic update
    setApplications(prev => prev.filter(app => app.id !== id))

    try {
      const result = await deleteJobApplication(id)
      
      if (!result.data) {
        loadApplications()
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Deleted',
          description: 'Application removed',
        })
      }
    } catch (err) {
      loadApplications()
      toast({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive',
      })
    }
  }

  const handleToggleFavorite = async (id: string) => {
    // Optimistic update
    setApplications(prev => 
      prev.map(app => app.id === id ? { ...app, isFavorite: !app.isFavorite } : app)
    )

    try {
      const result = await toggleFavorite(id)
      
      if (!result.data) {
        loadApplications()
      }
    } catch (err) {
      loadApplications()
    }
  }

  const handleViewDetails = (application: JobApplication) => {
    router.push(`/dashboard/jobs/${application.id}`)
  }

  const filteredApplications = applications.filter(app => 
    app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const stats = {
    total: applications.length,
    wishlist: applications.filter(a => a.status === 'WISHLIST').length,
    applied: applications.filter(a => a.status === 'APPLIED').length,
    interviewing: applications.filter(a => a.status === 'INTERVIEWING').length,
    offered: applications.filter(a => a.status === 'OFFERED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/jobs')}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Applications</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {stats.total} applications tracked
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/jobs')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Wishlist</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.wishlist}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Applied</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.applied}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400">Interviewing</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.interviewing}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Offered</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.offered}</p>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-1"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-1"
          >
            <List className="w-4 h-4" />
            List
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading applications...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && applications.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No applications yet</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Start tracking your job applications</p>
          <Button onClick={() => router.push('/dashboard/jobs')}>
            <Plus className="w-4 h-4 mr-2" />
            Find Jobs
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && applications.length > 0 && viewMode === 'kanban' && (
        <ApplicationKanban
          applications={filteredApplications}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* List View */}
      {!isLoading && applications.length > 0 && viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Job</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Company</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Applied</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="p-4">
                    <p className="font-medium text-slate-900 dark:text-white">{app.jobTitle}</p>
                    {app.location && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{app.location}</p>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{app.company}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'WISHLIST' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' :
                      app.status === 'APPLIED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      app.status === 'INTERVIEWING' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                      app.status === 'OFFERED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(app)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Offer Congratulations Modal */}
      {offeredJob && (
        <OfferCongratulationsModal
          isOpen={showOfferCongratsModal}
          onClose={() => {
            setShowOfferCongratsModal(false)
            setOfferedJob(null)
          }}
          jobTitle={offeredJob.jobTitle}
          company={offeredJob.company}
        />
      )}
    </div>
  )
}