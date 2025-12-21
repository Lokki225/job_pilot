"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  getAdminDashboardAnalytics,
  type AdminDashboardAnalytics,
  type AdminTimeRange,
} from "@/lib/actions/admin-dashboard-analytics.action";
import { getMyAccess } from "@/lib/actions/rbac.action";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function fmtInt(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export default function AdminDashboardHomePage() {
  const [range, setRange] = useState<AdminTimeRange>("30d");
  const [roleLabel, setRoleLabel] = useState<string>("ADMIN");
  const [data, setData] = useState<AdminDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [range]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [accessRes, analyticsRes] = await Promise.all([
        getMyAccess(),
        getAdminDashboardAnalytics(range),
      ]);

      if (accessRes.data?.role) setRoleLabel(accessRes.data.role);

      if (analyticsRes.error || !analyticsRes.data) {
        setData(null);
        setError(analyticsRes.error || "Failed to load admin analytics");
        return;
      }

      setData(analyticsRes.data);
    } catch (err) {
      console.error("Failed to load admin analytics:", err);
      setData(null);
      setError("Failed to load admin analytics");
    } finally {
      setLoading(false);
    }
  }

  const derived = useMemo(() => {
    if (!data) return null;

    const actionsPerSignup = data.totals.signupsInRange > 0
      ? data.totals.actionsInRange / data.totals.signupsInRange
      : 0;

    const actionsPerActiveUser = data.totals.activeUsersInRange > 0
      ? data.totals.actionsInRange / data.totals.activeUsersInRange
      : 0;

    const sortedAdoption = [...data.featureAdoption].sort((a, b) => b.adoptionRate - a.adoptionRate);

    return { actionsPerSignup, actionsPerActiveUser, sortedAdoption };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">Loading admin analytics...</div>
        </div>
      </div>
    );
  }

  if (!data || !derived) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Analytics</CardTitle>
            <CardDescription>Role: {roleLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{error || "Failed to load analytics."}</div>
            <Button onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Analytics</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Role: {roleLabel}</Badge>
            <Badge variant="outline">Range: {data.range}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as AdminTimeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
            <CardDescription>All-time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{fmtInt(data.totals.totalUsers)}</div>
            <div className="mt-2 text-sm text-muted-foreground">Onboarded: {fmtInt(data.totals.onboardedUsers)} ({percent(data.totals.activationRate)})</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Signups
            </CardTitle>
            <CardDescription>In selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{fmtInt(data.totals.signupsInRange)}</div>
            <div className="mt-2 text-sm text-muted-foreground">Actions / signup: {derived.actionsPerSignup.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Active Users
            </CardTitle>
            <CardDescription>DAU proxy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{fmtInt(data.totals.activeUsersInRange)}</div>
            <div className="mt-2 text-sm text-muted-foreground">DAU today: {fmtInt(data.totals.dauToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Actions
            </CardTitle>
            <CardDescription>Visits / engagement proxy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{fmtInt(data.totals.actionsInRange)}</div>
            <div className="mt-2 text-sm text-muted-foreground">Actions / active user: {derived.actionsPerActiveUser.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Growth & Activity
              </CardTitle>
              <CardDescription>Signups vs active users vs actions (daily)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends.signupsByDay.map((p, idx) => ({
                    date: p.date.slice(5),
                    signups: p.count,
                    activeUsers: data.trends.activeUsersByDay[idx]?.count ?? 0,
                    actions: data.trends.actionsByDay[idx]?.count ?? 0,
                  }))}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="actionsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="signups" stroke="#3b82f6" fill="url(#signupGradient)" name="Signups" />
                    <Area type="monotone" dataKey="activeUsers" stroke="#22c55e" fill="url(#activeGradient)" name="Active Users" />
                    <Area type="monotone" dataKey="actions" stroke="#8b5cf6" fill="url(#actionsGradient)" name="Actions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI / Feature Adoption
              </CardTitle>
              <CardDescription>% of total users who used each feature in the selected range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {derived.sortedAdoption.map((item) => (
                <div key={item.feature} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.feature}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtInt(item.users)} users, {fmtInt(item.events)} events
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{percent(item.adoptionRate)}</div>
                  </div>
                  <Progress value={item.adoptionRate * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Event Logs Volume
              </CardTitle>
              <CardDescription>Events in range: {fmtInt(data.totals.eventsInRange)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trends.eventsByDay.map((p) => ({ date: p.date.slice(5), events: p.count }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="events" name="Events" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Admin Queues
              </CardTitle>
              <CardDescription>Pending reviews requiring admin action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">Mentor KYC submitted</div>
                <Badge variant={data.totals.mentorKycSubmitted > 0 ? "destructive" : "secondary"}>{fmtInt(data.totals.mentorKycSubmitted)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Role applications submitted</div>
                <Badge variant={data.totals.roleAppsSubmitted > 0 ? "destructive" : "secondary"}>{fmtInt(data.totals.roleAppsSubmitted)}</Badge>
              </div>
              <div className="grid gap-2 pt-2">
                <Button asChild>
                  <Link href="/dashboard/admin/mentor-kyc">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Review Mentor KYC
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/admin/study-content">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Study Content Gen
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Top Events
              </CardTitle>
              <CardDescription>Most frequent `event_logs.event` in range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events logged in this range.</div>
              ) : (
                data.topEvents.map((row) => (
                  <div key={row.event} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm">{row.event}</div>
                    <Badge variant="outline" className="shrink-0">{fmtInt(row.count)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Notes
              </CardTitle>
              <CardDescription>How metrics are computed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>
                <Badge variant="outline" className="mr-2">Active users</Badge>
                Union of users seen in activity tables (events, applications, training, resumes, study, community).
              </div>
              <div>
                <Badge variant="outline" className="mr-2">Actions</Badge>
                Count of activity rows in the selected range (proxy for visits/engagement).
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
