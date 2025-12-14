"use client"

import { useState } from 'react'
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Edit,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type ApplicationStatus = 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN'

export interface JobApplication {
  id: string
  jobTitle: string
  company: string
  location: string | null
  status: ApplicationStatus
  appliedAt: Date | null
  createdAt: Date
  jobPostUrl: string | null
  salary: string | null
  isFavorite: boolean
}

interface ApplicationKanbanProps {
  applications: JobApplication[]
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void
  onDelete: (id: string) => void
  onViewDetails: (application: JobApplication) => void
  onToggleFavorite: (id: string) => void
}

const COLUMNS: { status: ApplicationStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'WISHLIST', label: 'Wishlist', icon: Star, color: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' },
  { status: 'APPLIED', label: 'Applied', icon: Clock, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' },
  { status: 'INTERVIEWING', label: 'Interviewing', icon: Briefcase, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' },
  { status: 'OFFERED', label: 'Offered', icon: CheckCircle, color: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' },
  { status: 'REJECTED', label: 'Rejected', icon: XCircle, color: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' },
]

export function ApplicationKanban({
  applications,
  onStatusChange,
  onDelete,
  onViewDetails,
  onToggleFavorite,
}: ApplicationKanbanProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const getApplicationsByStatus = (status: ApplicationStatus) => {
    return applications.filter(app => app.status === status)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    if (draggedItem) {
      onStatusChange(draggedItem, status)
      setDraggedItem(null)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(column => {
        const columnApps = getApplicationsByStatus(column.status)
        const Icon = column.icon
        
        return (
          <div
            key={column.status}
            className={cn(
              "shrink-0 w-72 rounded-xl border-2 p-3",
              column.color
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{column.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {columnApps.length}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {columnApps.map(app => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  className={cn(
                    "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing",
                    "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all",
                    draggedItem === app.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 
                        className="font-medium text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => onViewDetails(app)}
                      >
                        {app.jobTitle}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{app.company}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-label="Application actions" variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails(app)}>
                          <Edit className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {app.jobPostUrl && (
                          <DropdownMenuItem onClick={() => window.open(app.jobPostUrl!, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Job Post
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onToggleFavorite(app.id)}>
                          <Star className={cn("w-4 h-4 mr-2", app.isFavorite && "fill-yellow-400 text-yellow-400")} />
                          {app.isFavorite ? 'Remove Favorite' : 'Add Favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(app.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {app.location && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{app.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {app.salary && (
                      <Badge variant="outline" className="text-xs">
                        {app.salary}
                      </Badge>
                    )}
                    {app.appliedAt && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(app.appliedAt)}
                      </div>
                    )}
                  </div>

                  {app.isFavorite && (
                    <Star className="absolute top-2 right-8 w-3 h-3 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
              ))}

              {columnApps.length === 0 && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  Drop applications here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ApplicationKanban
