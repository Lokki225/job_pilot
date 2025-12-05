// app/(dashboard)/dashboard/onboarding/preferences/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, MapPin, DollarSign, Clock, Monitor, Target, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { upsertJobPreference } from '@/lib/actions/job-preferences.action'

export default function JobPreferencesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [minSalary, setMinSalary] = useState(500000)
  const [maxSalary, setMaxSalary] = useState(1000000)
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level')
  const [workTypes, setWorkTypes] = useState<string[]>([])
  const [remoteOptions, setRemoteOptions] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])

  // Input state
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    loadUserAndPreferences()
  }, [])

  const loadUserAndPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in',
        variant: 'destructive',
      })
      router.push('/login')
      return
    }

    setUserId(user.id)

    // Load existing preferences if any
    const { data: preferences } = await supabase
      .from('job_preferences')
      .select('*')
      .eq('userid', user.id)
      .single()

    if (preferences) {
      setJobTitles(preferences.jobtitles || [])
      setLocations(preferences.locations || [])
      setMinSalary(preferences.minsalary || 500000)
      setMaxSalary(preferences.maxsalary || 1000000)
      setExperienceLevel(preferences.experiencelevel || 'Mid-Level')
      setWorkTypes(preferences.worktypes || [])
      setRemoteOptions(preferences.remoteoptions || [])
      setSkills(preferences.skills || [])
    }
  }

  // Add/Remove functions
  const addJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      setJobTitles([...jobTitles, newJobTitle.trim()])
      setNewJobTitle('')
    }
  }

  const removeJobTitle = (title: string) => {
    setJobTitles(jobTitles.filter(t => t !== title))
  }

  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()])
      setNewLocation('')
    }
  }

  const removeLocation = (location: string) => {
    setLocations(locations.filter(l => l !== location))
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const toggleWorkType = (type: string) => {
    if (workTypes.includes(type)) {
      setWorkTypes(workTypes.filter(t => t !== type))
    } else {
      setWorkTypes([...workTypes, type])
    }
  }

  const toggleRemoteOption = (option: string) => {
    if (remoteOptions.includes(option)) {
      setRemoteOptions(remoteOptions.filter(o => o !== option))
    } else {
      setRemoteOptions([...remoteOptions, option])
    }
  }

  const handleSave = async () => {
    if (!userId) return

    // Validation
    if (jobTitles.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please add at least one job title',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const { success } = await upsertJobPreference({
        userId: userId,
        jobTitles: jobTitles,
        locations: locations,
        minSalary: minSalary,
        maxSalary: maxSalary,
        experienceLevel: experienceLevel,
        workTypes: workTypes,
        remoteOptions: remoteOptions,
        skills: skills,
      });

      if (!success) throw Error("Failed to save job preferences")

      toast({
        title: 'Preferences saved!',
        description: 'Your job preferences have been updated',
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push(`/dashboard?onboarding_complete=${true}`)
      }, 1500)

    } catch (error: any) {
      console.error('Save error:', error)
      toast({
        title: 'Save failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard?onboarding_complete=true')
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Set Your Job Preferences
        </h1>
        <p className="text-gray-600">
          Tell us what you're looking for and we'll match you with the best opportunities
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-8">
          
          {/* Job Titles */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Target Job Titles *
            </label>
            <p className="text-sm text-gray-600 mb-3">
              What positions are you interested in?
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addJobTitle()}
                placeholder="e.g., Frontend Developer"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <Button onClick={addJobTitle} size="icon">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {jobTitles.map((title) => (
                <span
                  key={title}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {title}
                  <button
                    onClick={() => removeJobTitle(title)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <MapPin className="w-5 h-5 text-green-600" />
              Preferred Locations
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                placeholder="e.g., Remote, Abidjan, Paris"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <Button onClick={addLocation} size="icon" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <span
                  key={location}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {location}
                  <button onClick={() => removeLocation(location)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              Salary Range (XOF/month)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Minimum</label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Maximum</label>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} XOF
            </p>
          </div>

          {/* Experience Level */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Target className="w-5 h-5 text-purple-600" />
              Experience Level
            </label>
            <div className="flex flex-wrap gap-3">
              {['Entry Level', 'Mid-Level', 'Senior', 'Lead', 'Executive'].map((level) => (
                <Button
                  key={level}
                  onClick={() => setExperienceLevel(level)}
                  variant={experienceLevel === level ? 'default' : 'outline'}
                  className={experienceLevel === level ? 'bg-purple-600' : ''}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Work Types */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Clock className="w-5 h-5 text-orange-600" />
              Work Types
            </label>
            <div className="flex flex-wrap gap-3">
              {['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'].map((type) => (
                <Button
                  key={type}
                  onClick={() => toggleWorkType(type)}
                  variant={workTypes.includes(type) ? 'default' : 'outline'}
                  className={workTypes.includes(type) ? 'bg-orange-600' : ''}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Remote Options */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Monitor className="w-5 h-5 text-indigo-600" />
              Remote Work Preferences
            </label>
            <div className="flex flex-wrap gap-3">
              {['Fully Remote', 'Hybrid', 'On-site'].map((option) => (
                <Button
                  key={option}
                  onClick={() => toggleRemoteOption(option)}
                  variant={remoteOptions.includes(option) ? 'default' : 'outline'}
                  className={remoteOptions.includes(option) ? 'bg-indigo-600' : ''}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Target className="w-5 h-5 text-pink-600" />
              Required Skills
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="e.g., React, Python"
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <Button onClick={addSkill} size="icon" className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-100 text-pink-800 rounded-full text-sm"
                >
                  {skill}
                  <button onClick={() => removeSkill(skill)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

        </CardContent>

        <CardFooter className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={isLoading || jobTitles.length === 0}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            onClick={handleSkip}
            variant="outline"
            disabled={isLoading}
          >
            Skip for Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}