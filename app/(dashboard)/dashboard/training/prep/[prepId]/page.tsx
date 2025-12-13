"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Building2, 
  Briefcase,
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  BookOpen,
  Target,
  MessageSquare,
  Lightbulb,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Star,
  Mic
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from '@/components/ui/use-toast'
import { 
  getPrepPack, 
  generatePrepPackPlan,
  markStepComplete,
  type PrepPackDetail 
} from '@/lib/actions/prep-pack.action'
import type { GeneratedPrepPlan, PrepPlanStep, PrepPlanSession, STARStory } from '@/lib/services/training/prep-pack-ai.service'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export default function PrepPackDetailPage() {
  const router = useRouter()
  const params = useParams()
  const prepId = params.prepId as string

  const [prepPack, setPrepPack] = useState<PrepPackDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadPrepPack()
  }, [prepId])

  const loadPrepPack = async () => {
    setIsLoading(true)
    const result = await getPrepPack(prepId)
    if (result.success && result.data) {
      setPrepPack(result.data)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load prep pack',
        variant: 'destructive',
      })
      router.push('/dashboard/training/prep')
    }
    setIsLoading(false)
  }

  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    const result = await generatePrepPackPlan(prepId)
    if (result.success) {
      toast({ title: 'Plan generated successfully!' })
      loadPrepPack()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to generate plan',
        variant: 'destructive',
      })
    }
    setIsGenerating(false)
  }

  const handleMarkComplete = async (stepId: string) => {
    const result = await markStepComplete(prepId, stepId)
    if (result.success && result.data) {
      const newProgress = result.data.progressPercent
      setPrepPack(prev => prev ? {
        ...prev,
        completedSteps: [...prev.completedSteps, stepId],
        progressPercent: newProgress,
      } : null)
    }
  }

  const isStepComplete = (stepId: string) => {
    return prepPack?.completedSteps?.includes(stepId) || false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!prepPack) {
    return null
  }

  const plan = prepPack.prepPlan as GeneratedPrepPlan | null
  const extractedData = prepPack.extractedData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/training/prep">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{prepPack.jobTitle}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Building2 className="h-4 w-4" />
              <span>{prepPack.companyName}</span>
            </div>
          </div>
        </div>
        {prepPack.status === 'READY' && (
          <Button onClick={() => router.push(`/dashboard/training/session/new?prepPackId=${prepId}`)}>
            <Mic className="h-4 w-4 mr-2" />
            Start Training Session
          </Button>
        )}
      </div>

      {/* Status Banner for Draft */}
      {prepPack.status === 'DRAFT' && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">Ready to Generate Plan</p>
                <p className="text-sm text-muted-foreground">
                  Click the button to analyze the job posting and create your personalized prep plan.
                </p>
              </div>
            </div>
            <Button onClick={handleGeneratePlan} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generating State */}
      {prepPack.status === 'GENERATING' && (
        <Card className="border-primary">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold">Generating Your Prep Plan...</h3>
            <p className="text-muted-foreground">This may take 30-60 seconds.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show if READY */}
      {prepPack.status === 'READY' && plan && (
        <>
          {/* Progress Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Preparation Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {prepPack.completedSteps.length} of {plan.overview.totalSteps} steps completed
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">{prepPack.progressPercent}%</span>
                </div>
              </div>
              <Progress value={prepPack.progressPercent} className="h-3" />
              <div className="flex flex-wrap gap-2 mt-4">
                {plan.overview.keyFocusAreas.map((area, i) => (
                  <Badge key={i} variant="secondary">{area}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="study">Study</TabsTrigger>
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Checklist Items</span>
                    </div>
                    <p className="text-2xl font-bold">{plan.checklist.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm">Study Topics</span>
                    </div>
                    <p className="text-2xl font-bold">{plan.studyTopics.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">Practice Sessions</span>
                    </div>
                    <p className="text-2xl font-bold">{plan.practiceSessions.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Est. Time</span>
                    </div>
                    <p className="text-2xl font-bold">{Math.round(plan.overview.estimatedTotalMinutes / 60)}h</p>
                  </CardContent>
                </Card>
              </div>

              {/* Interview Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Interview Tips for {prepPack.companyName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.interviewTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Extracted Skills */}
              {extractedData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Skills Identified</CardTitle>
                    <CardDescription>Skills extracted from the job posting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {extractedData.requiredSkills
                            .filter(s => s.importance === 'required')
                            .map((skill, i) => (
                              <Badge key={i} variant={skill.category === 'technical' ? 'default' : 'secondary'}>
                                {skill.skill}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      {extractedData.techStack.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Tech Stack</h4>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.techStack.map((tech, i) => (
                              <Badge key={i} variant="outline">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preparation Checklist</CardTitle>
                  <CardDescription>
                    Complete these tasks before your interview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.checklist.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      isComplete={isStepComplete(item.id)}
                      onComplete={() => handleMarkComplete(item.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Study Tab */}
            <TabsContent value="study" className="space-y-4 mt-6">
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/study">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Open Study Room
                  </Link>
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Study Topics</CardTitle>
                  <CardDescription>
                    Review these topics based on job requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.studyTopics.map((topic) => (
                    <StudyTopicItem
                      key={topic.id}
                      item={topic}
                      isComplete={isStepComplete(topic.id)}
                      onComplete={() => handleMarkComplete(topic.id)}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* STAR Stories */}
              <Card>
                <CardHeader>
                  <CardTitle>STAR Stories to Prepare</CardTitle>
                  <CardDescription>
                    Prepare these stories for behavioral questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {plan.starStories.map((story) => (
                      <AccordionItem key={story.id} value={story.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{story.skillTargeted}</Badge>
                            <span className="text-left">{story.promptQuestion}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <STARStoryGuide story={story} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Practice Tab */}
            <TabsContent value="practice" className="space-y-4 mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {plan.practiceSessions.map((session) => (
                  <PracticeSessionCard
                    key={session.id}
                    session={session}
                    prepPackId={prepId}
                    isComplete={isStepComplete(session.id)}
                    onComplete={() => handleMarkComplete(session.id)}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-4 mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <QuestionBankCard
                  title="Behavioral Questions"
                  icon={<MessageSquare className="h-5 w-5" />}
                  questions={plan.questionBank.behavioral}
                />
                <QuestionBankCard
                  title="Technical Questions"
                  icon={<Target className="h-5 w-5" />}
                  questions={plan.questionBank.technical}
                />
                <QuestionBankCard
                  title="Situational Questions"
                  icon={<Lightbulb className="h-5 w-5" />}
                  questions={plan.questionBank.situational}
                />
                <QuestionBankCard
                  title={`${prepPack.companyName}-Specific Questions`}
                  icon={<Building2 className="h-5 w-5" />}
                  questions={plan.questionBank.companySpecific}
                />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

// Sub-components

function ChecklistItem({ 
  item, 
  isComplete, 
  onComplete 
}: { 
  item: PrepPlanStep
  isComplete: boolean
  onComplete: () => void 
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isComplete ? 'bg-green-500/5 border-green-500/20' : ''}`}>
      <button
        onClick={onComplete}
        disabled={isComplete}
        className="mt-0.5"
      >
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
            {item.title}
          </span>
          <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
            {item.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{item.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  )
}

function StudyTopicItem({ 
  item, 
  isComplete, 
  onComplete 
}: { 
  item: PrepPlanStep
  isComplete: boolean
  onComplete: () => void 
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isComplete ? 'bg-green-500/5 border-green-500/20' : ''}`}>
      <button onClick={onComplete} disabled={isComplete} className="mt-0.5">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <BookOpen className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
            {item.title}
          </span>
          <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
            {item.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{item.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  )
}

function STARStoryGuide({ story }: { story: STARStory }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h5 className="font-medium text-blue-600 dark:text-blue-400 text-sm mb-1">Situation</h5>
          <p className="text-sm text-muted-foreground">{story.situationHint}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <h5 className="font-medium text-purple-600 dark:text-purple-400 text-sm mb-1">Task</h5>
          <p className="text-sm text-muted-foreground">{story.taskHint}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <h5 className="font-medium text-green-600 dark:text-green-400 text-sm mb-1">Action</h5>
          <p className="text-sm text-muted-foreground">{story.actionHint}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <h5 className="font-medium text-orange-600 dark:text-orange-400 text-sm mb-1">Result</h5>
          <p className="text-sm text-muted-foreground">{story.resultHint}</p>
        </div>
      </div>
    </div>
  )
}

function PracticeSessionCard({ 
  session, 
  prepPackId,
  isComplete, 
  onComplete 
}: { 
  session: PrepPlanSession
  prepPackId: string
  isComplete: boolean
  onComplete: () => void 
}) {
  const router = useRouter()

  const handleStart = () => {
    const params = new URLSearchParams({
      prepPackId,
      type: session.sessionType,
      prepStepId: session.id,
      focusAreas: session.focusAreas.join(','),
      difficulty: session.difficulty,
    })
    router.push(`/dashboard/training/session/new?${params.toString()}`)
  }

  return (
    <Card className={isComplete ? 'border-green-500/20 bg-green-500/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <CardDescription>{session.description}</CardDescription>
          </div>
          {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {session.focusAreas.map((area, i) => (
            <Badge key={i} variant="outline">{area}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{session.questionCount} questions</span>
          <span>{session.estimatedMinutes} min</span>
          <Badge>{session.difficulty}</Badge>
        </div>
        <Button 
          className="w-full" 
          variant={isComplete ? 'outline' : 'default'}
          onClick={handleStart}
        >
          <Play className="h-4 w-4 mr-2" />
          {isComplete ? 'Practice Again' : 'Start Session'}
        </Button>
      </CardContent>
    </Card>
  )
}

function QuestionBankCard({ 
  title, 
  icon, 
  questions 
}: { 
  title: string
  icon: React.ReactNode
  questions: string[] 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{questions.length}</Badge>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
