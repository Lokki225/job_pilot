import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Check } from "lucide-react"

export default function PricingPage() {
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

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Simple, Transparent{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Pricing</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 text-center max-w-2xl mx-auto">
          Choose the plan that works best for you. No hidden fees.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-600 dark:text-gray-300">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">5 AI-generated cover letters per month</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Basic application tracking</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Email support</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-blue-600 dark:border-blue-400 shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>For serious job seekers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-gray-600 dark:text-gray-300">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Unlimited AI-generated cover letters</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Advanced application tracking</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Resume optimization tips</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Priority email support</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For teams and organizations</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">Custom</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Everything in Pro</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Team collaboration features</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Custom integrations</span>
              </div>
              <div className="flex gap-2 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Dedicated account manager</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
