import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"
        >
          JobPilot
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          About{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">JobPilot</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 text-center max-w-2xl mx-auto">
          We're on a mission to help job seekers land their dream jobs with AI-powered tools.
        </p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Our Story</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 dark:text-gray-300 space-y-4">
              <p>
                JobPilot was founded in 2024 by a team of career coaches and AI engineers who saw the challenges job
                seekers face in today's competitive market.
              </p>
              <p>
                We believe that everyone deserves access to tools that help them present their best selves to potential
                employers. That's why we built JobPilot - to democratize access to personalized, professional
                application materials.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 dark:text-gray-300">
              <p>
                To empower job seekers with AI-powered tools that save time, reduce stress, and increase their chances
                of landing their dream job.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Choose JobPilot?</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 dark:text-gray-300 space-y-3">
              <div className="flex gap-3">
                <div className="text-blue-600 dark:text-blue-400 font-bold">✓</div>
                <div>
                  <strong>AI-Powered:</strong> Our advanced AI creates personalized cover letters tailored to each job.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-blue-600 dark:text-blue-400 font-bold">✓</div>
                <div>
                  <strong>Time-Saving:</strong> Generate professional applications in minutes, not hours.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-blue-600 dark:text-blue-400 font-bold">✓</div>
                <div>
                  <strong>Track Everything:</strong> Keep all your applications organized in one place.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started for Free</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
