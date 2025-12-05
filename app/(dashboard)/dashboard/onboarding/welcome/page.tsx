// app/(dashboard)/dashboard/onboarding/welcome/page.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Rocket, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const router = useRouter()
  const { toast } = useToast()

  const handleContinue = () => {
    router.push("/dashboard/onboarding/resume")
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-2xl overflow-hidden border-0 shadow-xl">
        <div className="relative h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
            <Rocket className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="mt-4 text-3xl font-bold tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">JobPilot AI</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Let's get you set up in just 2 minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 py-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Find Relevant Jobs Automatically</h3>
                <p className="text-sm text-muted-foreground">
                  We'll match you with the best job opportunities based on your skills and preferences.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Generate Tailored Cover Letters</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI will create personalized cover letters that highlight your strengths for each application.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Track Your Applications</h3>
                <p className="text-sm text-muted-foreground">
                  Keep all your job applications organized in one place with our intuitive dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Pro Tip:</span> Complete your profile to get the most accurate job matches.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-gray-50 px-6 py-4 dark:bg-slate-800/50">
          <Button 
            onClick={handleContinue}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
          >
            Get Started
            <Rocket className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}