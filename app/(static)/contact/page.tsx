import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

export default function ContactPage() {
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

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Contact <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Us</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 text-center">
          Have a question or feedback? We'd love to hear from you.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>We'll get back to you as soon as possible</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Tell us more..." rows={6} />
              </div>

              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">Or reach us directly at:</p>
          <p className="text-lg font-medium text-blue-600 dark:text-blue-400">support@jobpilot.com</p>
        </div>
      </main>
    </div>
  )
}
