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
        toast({
          title: 'Status Updated',
          description: `Moved to ${newStatus.toLowerCase()}`,
        })
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
            <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
            <p className="text-sm text-slate-500">
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
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-slate-50 rounded-lg border p-4">
          <p className="text-sm text-slate-500">Wishlist</p>
          <p className="text-2xl font-bold">{stats.wishlist}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-600">Applied</p>
          <p className="text-2xl font-bold text-blue-700">{stats.applied}</p>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <p className="text-sm text-purple-600">Interviewing</p>
          <p className="text-2xl font-bold text-purple-700">{stats.interviewing}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-sm text-green-600">Offered</p>
          <p className="text-2xl font-bold text-green-700">{stats.offered}</p>
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
        
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
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
          <p className="text-slate-600">Loading applications...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && applications.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No applications yet</h3>
          <p className="text-slate-600 mb-4">Start tracking your job applications</p>
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
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Job</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Company</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Applied</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{app.jobTitle}</p>
                    {app.location && (
                      <p className="text-sm text-slate-500">{app.location}</p>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">{app.company}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'WISHLIST' ? 'bg-slate-100 text-slate-700' :
                      app.status === 'APPLIED' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'INTERVIEWING' ? 'bg-purple-100 text-purple-700' :
                      app.status === 'OFFERED' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
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
    </div>
  )
}