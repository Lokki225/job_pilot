// app/(dashboard)/layout.tsx
"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Briefcase, FileText, Settings, Menu, X, ChevronLeft, ChevronRight, User, BookOpen, Sparkles, Mic, Trophy, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageSelector } from "@/components/ui/language-selector"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationToastProvider } from "@/components/notifications"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

const navigationItems = [
  { key: "nav.dashboard", href: "/dashboard", icon: Home },
  { key: "nav.jobs", href: "/dashboard/jobs", icon: Briefcase },
  { key: "nav.coverLetters", href: "/dashboard/letters", icon: FileText },
  { key: "nav.studyRoom", href: "/dashboard/study", icon: BookOpen },
  { key: "nav.trainingRoom", href: "/dashboard/training", icon: Mic },
  { key: "nav.community", href: "/dashboard/community/hub", icon: Trophy },
  { key: "nav.notifications", href: "/dashboard/notifications", icon: Bell },
  { key: "nav.contentGen", href: "/dashboard/admin/study-content", icon: Sparkles },
  { key: "nav.settings", href: "/dashboard/settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter();
  const [session, setSession] = useState<any>()
  const { t } = useLanguage()

  const fetchSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
  }
  
  // Close mobile sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
    fetchSession()

  }, [pathname])

  const getPageTitle = (path: string): string => {
    if (path.startsWith("/dashboard/community")) {
      return t("nav.community");
    }
    // First try to find a matching navigation item
    const navItem = navigationItems.find(item => path.startsWith(item.href));
    if (navItem) return t(navItem.key);

    // If no match, try to derive from URL
    const lastSegment = path.split('/').pop() || '';
    if (lastSegment) {
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
    }

    console.log(lastSegment);
    

    // Fallback
    return "Dashboard";
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile sidebar backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          !sidebarOpen && "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-white shadow-lg transition-all duration-300 ease-in-out dark:bg-slate-800",
          isCollapsed ? "w-16" : "w-64",
          !sidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Toggle */}
          <div className="flex h-16 items-center justify-between border-b px-4 dark:border-slate-700">
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  JobPilot AI
                </span>
              </Link>
            )}
            <div className="flex items-center">
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-slate-700"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-slate-700 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {navigationItems.map((item) => {
              const isActive =
                item.key === "nav.community"
                  ? pathname.startsWith("/dashboard/community")
                  : pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md p-2 text-sm font-medium",
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-white",
                    isCollapsed ? "justify-center" : "px-3"
                  )}
                  title={isCollapsed ? t(item.key) : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 group-hover:text-gray-500 dark:text-gray-400"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="ml-3">{t(item.key)}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t p-2 dark:border-slate-700">
            <Link 
              href="/dashboard/profile"
              className={cn(
                "flex items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors",
                isCollapsed ? "justify-center" : "px-2"
              )}
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                {session?.user?.user_metadata?.full_name ? (
                  <span className="text-sm font-medium">
                    {session.user.user_metadata.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              {!isCollapsed && (
                <div className="ml-3 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                    {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {t('nav.viewProfile')}
                  </p>
                </div>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Top navigation */}
        <header className="flex h-16 flex-shrink-0 items-center border-b bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:px-6">
          <button
            type="button"
            className="mr-4 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-slate-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getPageTitle(pathname)}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <LanguageSelector variant="compact" />
              <ThemeToggle />
              {session ? (<Button onClick={() => {
                logout();
                router.push("/login");
              }}>
                {t('common.logout')}
              </Button>): null}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">
          <NotificationToastProvider>
            {children}
          </NotificationToastProvider>
        </main>
      </div>
    </div>
  )
}