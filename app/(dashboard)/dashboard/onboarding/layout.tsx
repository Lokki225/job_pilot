// app/(dashboard)/dashboard/onboarding/layout.tsx
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
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
