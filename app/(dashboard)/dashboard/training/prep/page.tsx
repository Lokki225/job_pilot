"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  FileText, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Loader2,
  MoreVertical,
  Trash2,
  ArrowRight,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { getPrepPacks, deletePrepPack, type PrepPackSummary } from '@/lib/actions/prep-pack.action'

export default function PrepPackListPage() {
  const router = useRouter()
  const [prepPacks, setPrepPacks] = useState<PrepPackSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPrepPacks()
  }, [])

  const loadPrepPacks = async () => {
    setIsLoading(true)
    const result = await getPrepPacks()
    if (result.success && result.data) {
      setPrepPacks(result.data)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load prep packs',
        variant: 'destructive',
      })
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deletePrepPack(id)
    if (result.success) {
      setPrepPacks(prev => prev.filter(p => p.id !== id))
      toast({ title: 'Prep pack deleted' })
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      case 'GENERATING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Generating...</Badge>
      case 'READY':
        return <Badge className="bg-green-600">Ready</Badge>
      case 'ARCHIVED':
        return <Badge variant="secondary">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Prep Packs</h1>
          <p className="text-muted-foreground">
            AI-generated interview preparation plans tailored to specific job postings
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/training/prep/new">
            <Plus className="h-4 w-4 mr-2" />
            New Prep Pack
          </Link>
        </Button>
      </div>

      {/* Empty State */}
      {prepPacks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No prep packs yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first interview prep pack by pasting a job description or selecting from your saved job applications.
            </p>
            <Button asChild>
              <Link href="/dashboard/training/prep/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Prep Pack
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prep Pack Grid */}
      {prepPacks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prepPacks.map((pack) => (
            <Card 
              key={pack.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => router.push(`/dashboard/training/prep/${pack.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1">{pack.jobTitle}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="line-clamp-1">{pack.companyName}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(pack.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  {getStatusBadge(pack.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(pack.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {pack.status === 'READY' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{pack.progressPercent}%</span>
                    </div>
                    <Progress value={pack.progressPercent} className="h-2" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{pack.totalSteps} steps in plan</span>
                    </div>
                  </div>
                )}

                {pack.status === 'DRAFT' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Ready to generate plan</span>
                  </div>
                )}

                {pack.status === 'GENERATING' && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating your plan...</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Details</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/training">
              <Briefcase className="h-4 w-4 mr-2" />
              Training Room
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/jobs">
              <FileText className="h-4 w-4 mr-2" />
              My Job Applications
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
