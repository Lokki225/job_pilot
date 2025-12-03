// app/(dashboard)/dashboard/onboarding/layout.tsx
"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getAuthUser } from "@/lib/auth"
import { getCurrentSession } from "@/lib/auth/session"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const session = await getCurrentSession()
      if (!session) {
        router.push('/login')
        return
      }
      // User is authenticated, you can access user properties here
    }

    checkUser()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            JobPilot AI
          </h1>
        </div>
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
