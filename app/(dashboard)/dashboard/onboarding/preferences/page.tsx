// app/(dashboard)/dashboard/onboarding/preferences/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, MapPin, DollarSign, Star, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const jobTitles = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "Product Manager",
  "DevOps Engineer",
  "Data Scientist",
  "Mobile Developer"
]

const locations = [
  "Remote",
  "On-site",
  "Hybrid",
  "Abidjan, CI",
  "Lagos, NG",
  "Nairobi, KE",
  "Cape Town, ZA"
]

export default function PreferencesPage() {
  const router = useRouter()
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [salaryRange, setSalaryRange] = useState<[number, number]>([300000, 1500000])
  const [experienceLevel, setExperienceLevel] = useState<number>(2)

  const toggleTitle = (title: string) => {
    setSelectedTitles(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically save the preferences to your database
    console.log({
      jobTitles: selectedTitles,
      locations: selectedLocations,
      salaryRange,
      experienceLevel
    })
    router.push("/dashboard")
  }

  const experienceLevels = [
    { level: 1, label: "Entry Level" },
    { level: 2, label: "Mid Level" },
    { level: 3, label: "Senior" },
    { level: 4, label: "Lead" },
    { level: 5, label: "Executive" }
  ]

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Job Preferences</h1>
          <p className="mt-2 text-muted-foreground">
            Let's customize your job search experience
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
              <CardDescription>
                Tell us what kind of jobs you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Job Titles */}
              <div>
                <div className="flex items-center mb-4">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                  <Label className="text-base">Job Titles</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobTitles.map((title) => (
                    <Button
                      key={title}
                      type="button"
                      variant={selectedTitles.includes(title) ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => toggleTitle(title)}
                    >
                      {title}
                      {selectedTitles.includes(title) && (
                        <Check className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <div className="flex items-center mb-4">
                  <MapPin className="h-5 w-5 mr-2 text-green-600" />
                  <Label className="text-base">Preferred Locations</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {locations.map((location) => (
                    <Button
                      key={location}
                      type="button"
                      variant={selectedLocations.includes(location) ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => toggleLocation(location)}
                    >
                      {location}
                      {selectedLocations.includes(location) && (
                        <Check className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <div className="flex items-center mb-4">
                  <DollarSign className="h-5 w-5 mr-2 text-yellow-600" />
                  <Label className="text-base">Expected Salary (XOF/month)</Label>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{salaryRange[0].toLocaleString()} XOF</span>
                    <span>{salaryRange[1].toLocaleString()}+ XOF</span>
                  </div>
                  <Slider
                    value={salaryRange}
                    onValueChange={(value) => setSalaryRange(value as [number, number])}
                    min={100000}
                    max={3000000}
                    step={50000}
                    minStepsBetweenThumbs={1}
                  />
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <div className="flex items-center mb-4">
                  <Star className="h-5 w-5 mr-2 text-purple-600" />
                  <Label className="text-base">Experience Level</Label>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {experienceLevels.map(({ level, label }) => (
                    <Button
                      key={level}
                      type="button"
                      variant={experienceLevel === level ? "default" : "outline"}
                      className={cn(
                        "flex-col h-auto py-3",
                        experienceLevel === level && "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={() => setExperienceLevel(level)}
                    >
                      <div className="flex space-x-1 mb-1">
                        {[...Array(level)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Button type="submit">Complete Setup</Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}