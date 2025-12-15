"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Clock, Database, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  getJobApplicationsAnalytics,
  type JobApplicationsAnalytics,
} from "@/lib/actions/job-applications-analytics.action"
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function formatDays(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-"
  if (value < 1) return "< 1"
  return Math.round(value).toString()
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<JobApplicationsAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        const result = await getJobApplicationsAnalytics()
        if (result.data) {
          setAnalytics(result.data)
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load analytics",
            variant: "destructive",
          })
        }
      } catch (err) {
        console.error("Failed to load job applications analytics:", err)
        toast({
          title: "Error",
          description: "Failed to load analytics",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const funnelData = useMemo(() => {
    if (!analytics) return []
    return [
      { stage: "Wishlist", count: analytics.funnel.wishlist },
      { stage: "Applied", count: analytics.funnel.applied },
      { stage: "Interviewing", count: analytics.funnel.interviewing },
      { stage: "Offered", count: analytics.funnel.offered },
    ]
  }, [analytics])

  const totals = useMemo(() => {
    if (!analytics) return { total: 0, appliedRate: 0, interviewRate: 0, offerRate: 0 }
    const total =
      analytics.funnel.wishlist +
      analytics.funnel.applied +
      analytics.funnel.interviewing +
      analytics.funnel.offered

    const appliedRate = total > 0 ? (analytics.funnel.applied / total) * 100 : 0
    const interviewRate = total > 0 ? (analytics.funnel.interviewing / total) * 100 : 0
    const offerRate = total > 0 ? (analytics.funnel.offered / total) * 100 : 0

    return { total, appliedRate, interviewRate, offerRate }
  }, [analytics])

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Application funnel, timing, and sources
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Total Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totals.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Applied Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {Math.round(totals.appliedRate)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Interview Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {Math.round(totals.interviewRate)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Offer Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {Math.round(totals.offerRate)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {isLoading ? (
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time to next stage (avg days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">Wishlist → Applied</div>
              <Badge variant="secondary">{formatDays(analytics?.timeToNextStageDaysAvg.wishlistToApplied ?? null)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">Applied → Interview</div>
              <Badge variant="secondary">{formatDays(analytics?.timeToNextStageDaysAvg.appliedToInterview ?? null)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">Interview → Offer</div>
              <Badge variant="secondary">{formatDays(analytics?.timeToNextStageDaysAvg.interviewToOffer ?? null)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best-performing sources</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.topSources?.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {analytics.topSources.map((s) => (
                <div
                  key={s.source}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div className="truncate font-medium">{s.source}</div>
                  <Badge variant="outline">{s.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">No data yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
