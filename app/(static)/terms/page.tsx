import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TermsPage() {
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
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Terms &{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Conditions</span>
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-12">Last updated: December 3, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-300">
              By accessing and using JobPilot, you accept and agree to be bound by the terms and provision of this
              agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Use License</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              Permission is granted to use JobPilot for personal, non-commercial use to generate cover letters and track
              job applications. This license includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>Creating and editing cover letters using our AI tools</li>
              <li>Tracking your job applications</li>
              <li>Storing your personal documents securely</li>
              <li>Accessing support resources</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. User Account</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept
              responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Subscription and Payment</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Paid subscriptions are billed on a recurring basis. You may cancel your subscription at any time. Refunds
              are provided within 30 days of initial purchase only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Prohibited Uses</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">You agree not to use JobPilot to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malicious code or viruses</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for commercial purposes without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Intellectual Property</h2>
            <p className="text-gray-600 dark:text-gray-300">
              The content you create using JobPilot belongs to you. JobPilot retains ownership of the platform,
              software, and underlying technology.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Disclaimer</h2>
            <p className="text-gray-600 dark:text-gray-300">
              JobPilot is provided "as is" without warranty of any kind. We do not guarantee employment outcomes or the
              success of applications created using our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-300">
              JobPilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages
              resulting from your use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We reserve the right to modify these terms at any time. We will notify users of significant changes via
              email or through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Contact</h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about these Terms & Conditions, please contact us at legal@jobpilot.com
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
