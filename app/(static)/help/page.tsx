import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"

export default function HelpPage() {
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
          Help & <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">FAQ</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 text-center max-w-2xl mx-auto">
          Find answers to common questions about JobPilot
        </p>

        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="item-1" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">How does JobPilot generate cover letters?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              JobPilot uses advanced AI technology to analyze job descriptions and your resume, then creates
              personalized cover letters that highlight your relevant skills and experience. The AI is trained on
              thousands of successful applications to ensure professional quality.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">Can I edit the generated cover letters?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              All generated cover letters are fully editable. You can customize them to add personal touches, specific
              examples, or adjust the tone to match your style.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">How many cover letters can I generate?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              The free plan allows 5 cover letters per month. Pro plan users get unlimited generations. You can upgrade
              or downgrade your plan at any time.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">How does application tracking work?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              JobPilot helps you organize all your job applications in one place. Track status (applied, interviewing,
              rejected, offer), add notes, set reminders, and keep all related documents together for easy reference.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">Is my data secure?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              Yes! We take data security seriously. All your personal information and documents are encrypted and stored
              securely. We never share your data with third parties. Read our{" "}
              <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </Link>{" "}
              for more details.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">Can I cancel my subscription anytime?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              Yes, you can cancel your subscription at any time from your account settings. Your access will continue
              until the end of your current billing period.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7" className="bg-white dark:bg-slate-800 rounded-lg px-6 border">
            <AccordionTrigger className="text-left">Do you offer refunds?</AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-300">
              We offer a 30-day money-back guarantee. If you're not satisfied with JobPilot within the first 30 days,
              contact us for a full refund.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-12 text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">Still have questions?</p>
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
