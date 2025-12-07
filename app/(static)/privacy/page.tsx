import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PrivacyPage() {
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
          Privacy{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Policy</span>
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-12">Last updated: December 3, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>Account information (name, email address, password)</li>
              <li>Resume and professional information</li>
              <li>Job application details and tracking data</li>
              <li>Cover letters and other documents you create</li>
              <li>Communication with our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>Provide, maintain, and improve our services</li>
              <li>Generate personalized cover letters using AI</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns to improve user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Data Security</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit and
              at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Data Sharing</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              We do not sell your personal information. We may share your information only in the following
              circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>With your consent</li>
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. AI and Machine Learning</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We use AI technology to generate cover letters. Your data may be used to improve our AI models, but all
              data is anonymized and aggregated before use in model training. Individual documents are never shared or
              used to train models without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Data Retention</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We retain your information for as long as your account is active or as needed to provide services. If you
              request account deletion, we will delete your data within 30 days, except where required to retain it by
              law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We use cookies and similar tracking technologies to collect usage information and improve our services.
              You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Children's Privacy</h2>
            <p className="text-gray-600 dark:text-gray-300">
              JobPilot is not intended for users under 16 years of age. We do not knowingly collect information from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We may update this privacy policy from time to time. We will notify you of significant changes by email or
              through a notice on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about this Privacy Policy or our data practices, please contact us at
              privacy@jobpilot.com or visit our{" "}
              <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
