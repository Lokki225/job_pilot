import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          JobPilot
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Land Your Dream Job with
            <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              AI-Powered Applications
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            JobPilot helps you create personalized cover letters and track your job applications in one place. 
            Save time and increase your chances of getting hired.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/register">
                Start for Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 dark:text-white">How JobPilot Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Upload Your CV",
                description: "Easily upload and parse your resume to extract key information.",
                icon: "📄"
              },
              {
                title: "Generate Cover Letters",
                description: "AI-powered cover letters tailored to each job application.",
                icon: "✍️"
              },
              {
                title: "Track Applications",
                description: "Manage all your job applications in one organized dashboard.",
                icon: "📊"
              }
            ].map((feature, index) => (
              <div key={index} className="p-6 rounded-xl bg-gray-50 dark:bg-slate-800">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to streamline your job search?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of job seekers who found their dream job with JobPilot.
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6">
            Get Started - It's Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-slate-700">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} JobPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}