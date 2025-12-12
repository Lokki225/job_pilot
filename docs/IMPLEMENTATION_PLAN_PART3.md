# Job Pilot - Implementation Plan
## Part 3: Training Room (AI Voice Interviews)

---

## Training Room Overview

The Training Room is an **AI-powered voice interview simulator** where users practice answering interview questions and receive real-time feedback. It uses Web Speech API for voice recognition and OpenAI for question generation and answer analysis.

---

## Session Types

| Type | Duration | Questions | Use Case |
|------|----------|-----------|----------|
| **Quick Practice** | 15 min | 5 | Daily warm-up |
| **Full Mock Interview** | 45-60 min | 15-20 | Complete simulation |
| **Targeted Practice** | 20-30 min | 8-10 | Focus on weaknesses |
| **Company Prep** | 30-45 min | 10-15 | Company-specific |

---

## Voice AI Implementation

### Technology Stack
```
Voice Recognition: Web Speech API (browser-native, free)
Text-to-Speech: Web Speech API or OpenAI TTS
AI Processing: OpenAI GPT-4 for questions & feedback
Fallback: Text input always available
```

### Voice Hook

```typescript
// hooks/useVoiceInterview.ts

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVoiceInterviewOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  language?: string;
}

export function useVoiceInterview(options: UseVoiceInterviewOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = options.language || 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          options.onTranscript(finalTranscript, true);
        } else if (interimTranscript) {
          options.onTranscript(interimTranscript, false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        options.onError(event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [options.language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        options.onError('Failed to start voice recognition');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Get a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.includes('Natural')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
```

---

## AI Services

### Question Generation

```typescript
// lib/services/ai/interview-questions.service.ts

interface GenerateQuestionParams {
  sessionType: 'quick' | 'full_mock' | 'targeted' | 'company_prep';
  questionType: 'behavioral' | 'technical' | 'situational' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
  jobTitle?: string;
  companyName?: string;
  companyContext?: CompanyResearchData;
  previousQuestions?: string[];
  focusAreas?: string[];
  userWeakAreas?: string[];
}

export async function generateInterviewQuestion(params: GenerateQuestionParams) {
  const systemPrompt = `You are an expert interviewer conducting a ${params.sessionType} session.
Role: ${params.jobTitle || 'Professional'}
${params.companyName ? `Company: ${params.companyName}` : ''}
Difficulty: ${params.difficulty}
Question Type: ${params.questionType}
${params.focusAreas?.length ? `Focus Areas: ${params.focusAreas.join(', ')}` : ''}
${params.userWeakAreas?.length ? `User needs practice with: ${params.userWeakAreas.join(', ')}` : ''}

${params.companyContext ? `Company Context:
- Values: ${params.companyContext.coreValues?.join(', ')}
- Culture: ${params.companyContext.companyCulture}
- Recent News: ${params.companyContext.recentNews?.[0]?.summary}
` : ''}

Generate ONE interview question. Avoid these already-asked questions:
${params.previousQuestions?.join('\n') || 'None'}

Response format (JSON):
{
  "question": "Your interview question",
  "questionType": "${params.questionType}",
  "context": "Brief context for why this is asked",
  "hints": ["Hint 1", "Hint 2"],
  "expectedElements": ["Key element 1", "Key element 2"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the next interview question.' }
    ],
    temperature: 0.8,
    max_tokens: 500
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

### Answer Analysis & Feedback

```typescript
// lib/services/ai/answer-feedback.service.ts

interface AnalyzeAnswerParams {
  question: string;
  questionType: string;
  answer: string;
  jobTitle?: string;
  companyContext?: CompanyResearchData;
  expectedElements?: string[];
}

interface AnswerFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  revisedAnswer: string;
  starAnalysis?: {
    situation: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
    task: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
    action: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
    result: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
  };
  communication: {
    clarity: number;
    conciseness: number;
    relevance: number;
    specificity: number;
  };
  keywordsUsed: string[];
  keywordsMissing: string[];
}

export async function analyzeAnswer(params: AnalyzeAnswerParams): Promise<AnswerFeedback> {
  const systemPrompt = `You are an expert interview coach analyzing a candidate's answer.

Question: ${params.question}
Question Type: ${params.questionType}
${params.jobTitle ? `Target Role: ${params.jobTitle}` : ''}
${params.expectedElements?.length ? `Expected Elements: ${params.expectedElements.join(', ')}` : ''}

Evaluate the answer on:
1. Overall effectiveness (0-100)
2. STAR method usage (for behavioral questions)
3. Communication: clarity, conciseness, relevance, specificity (each 0-100)
4. Key strengths (2-3)
5. Areas for improvement (2-3)
6. Actionable tips
7. Provide an improved version of the answer

Be constructive and encouraging while being honest about areas to improve.

Response format (JSON):
{
  "overallScore": 75,
  "strengths": ["Clear structure", "Good example"],
  "weaknesses": ["Could be more specific", "Missing metrics"],
  "improvementTips": ["Add numbers to quantify impact", "Be more concise"],
  "revisedAnswer": "Improved version of the answer...",
  "starAnalysis": {
    "situation": { "present": true, "quality": "strong", "feedback": "..." },
    "task": { "present": true, "quality": "adequate", "feedback": "..." },
    "action": { "present": true, "quality": "weak", "feedback": "..." },
    "result": { "present": false, "quality": "weak", "feedback": "..." }
  },
  "communication": {
    "clarity": 80,
    "conciseness": 65,
    "relevance": 85,
    "specificity": 70
  },
  "keywordsUsed": ["leadership", "team"],
  "keywordsMissing": ["impact", "metrics", "outcome"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Candidate's Answer:\n\n${params.answer}` }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

---

## Route Structure

```
app/(dashboard)/dashboard/training/
├── page.tsx                          # Training Room home
├── session/
│   ├── new/
│   │   └── page.tsx                  # Configure new session
│   └── [sessionId]/
│       ├── page.tsx                  # Active session
│       └── results/
│           └── page.tsx              # Session results
├── history/
│   └── page.tsx                      # Past sessions
├── stats/
│   └── page.tsx                      # Analytics dashboard
└── company/
    ├── page.tsx                      # Company research list
    ├── new/
    │   └── page.tsx                  # Add company research
    └── [companyId]/
        ├── page.tsx                  # Company detail
        └── practice/
            └── page.tsx              # Company-specific session
```

---

## Components

```
components/training/
├── TrainingHome.tsx                  # Home dashboard
├── SessionConfig/
│   ├── SessionConfigForm.tsx         # Session setup
│   ├── SessionTypeSelector.tsx       # Type selection
│   ├── FocusAreaSelector.tsx         # Focus areas
│   └── DifficultySelector.tsx        # Difficulty
├── Simulator/
│   ├── InterviewSimulator.tsx        # Main simulator
│   ├── QuestionDisplay.tsx           # Current question
│   ├── VoiceInput.tsx                # Voice recording
│   ├── TextInput.tsx                 # Text fallback
│   ├── VoiceVisualizer.tsx           # Audio waveform
│   ├── Timer.tsx                     # Question timer
│   ├── ProgressBar.tsx               # Session progress
│   └── HelpPanel.tsx                 # Tips & hints
├── Feedback/
│   ├── FeedbackPanel.tsx             # Inline feedback
│   ├── ScoreCircle.tsx               # Score display
│   ├── STARBreakdown.tsx             # STAR analysis
│   ├── CommunicationScores.tsx       # Communication radar
│   ├── ImprovementTips.tsx           # Tips list
│   └── RevisedAnswer.tsx             # AI improvement
├── Results/
│   ├── SessionResults.tsx            # Full results page
│   ├── QuestionReview.tsx            # Review Q&A
│   ├── SkillRadar.tsx                # Radar chart
│   └── NextSteps.tsx                 # Recommendations
├── History/
│   ├── SessionHistory.tsx            # All sessions
│   ├── SessionCard.tsx               # Session preview
│   └── HistoryFilters.tsx            # Filter controls
└── Stats/
    ├── StatsDashboard.tsx            # Main stats
    ├── ProgressChart.tsx             # Score over time
    ├── SkillBreakdown.tsx            # Per-skill stats
    ├── WeakAreasCard.tsx             # Areas to improve
    ├── StreakDisplay.tsx             # Practice streak
    └── RecommendedPractice.tsx       # What to practice
```

---

## Server Actions

```typescript
// lib/actions/training.action.ts

// Start new training session
export async function startTrainingSession(params: {
  sessionType: 'quick' | 'full_mock' | 'targeted' | 'company_prep';
  companyId?: string;
  companyName?: string;
  jobTitle?: string;
  jobApplicationId?: string;
  focusAreas?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<{
  data: { sessionId: string; firstQuestion: InterviewQuestion } | null;
  error: string | null;
}>;

// Get next question
export async function getNextQuestion(sessionId: string): Promise<{
  data: InterviewQuestion | null;
  isComplete: boolean;
  error: string | null;
}>;

// Submit answer and get feedback
export async function submitAnswer(params: {
  sessionId: string;
  questionId: string;
  answer: string;
  answerDurationSeconds: number;
  audioUrl?: string;
}): Promise<{
  data: AnswerFeedback | null;
  error: string | null;
}>;

// Complete session
export async function completeSession(sessionId: string): Promise<{
  data: SessionResults | null;
  error: string | null;
}>;

// Get session history
export async function getTrainingHistory(params?: {
  limit?: number;
  offset?: number;
  sessionType?: string;
}): Promise<{
  data: TrainingSession[] | null;
  total: number;
  error: string | null;
}>;

// Get interview stats
export async function getInterviewStats(): Promise<{
  data: UserInterviewStats | null;
  error: string | null;
}>;
```

---

## UI Mockups

### Session Start
```
┌────────────────────────────────────────────────────────────┐
│  🎯 Start Training Session                                 │
│                                                            │
│  Session Type:                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │ ⚡ Quick   │ │ 📋 Full    │ │ 🎯 Target  │ │ 🏢 Comp  ││
│  │ 15 min     │ │ 45-60 min  │ │ 20-30 min  │ │ 30-45min ││
│  │ 5 Qs       │ │ 15-20 Qs   │ │ 8-10 Qs    │ │ 10-15 Qs ││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
│                                                            │
│  Focus Areas (select up to 3):                             │
│  ☑️ Behavioral  ☐ Technical  ☐ Communication  ☐ Problem    │
│                                                            │
│  Difficulty:  ○ Easy  ● Medium  ○ Hard                     │
│                                                            │
│  Target Role: [Software Engineer          ▼]               │
│                                                            │
│                    [Start Session →]                       │
└────────────────────────────────────────────────────────────┘
```

### Active Session (Voice)
```
┌────────────────────────────────────────────────────────────┐
│  Question 3 of 10                    ⏱️ 2:34    [Pause]    │
│  ━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  👤 Interviewer                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ "Tell me about a time when you had to work with a     ││
│  │  difficult team member. How did you handle it?"       ││
│  └────────────────────────────────────────────────────────┘│
│                          🔊 [Replay Question]              │
│                                                            │
│  💡 Tip: Use the STAR method for behavioral questions     │
│                                                            │
│  ────────────────────────────────────────────────────────  │
│                                                            │
│  🎤 Your Answer                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │                                                        ││
│  │              🎙️ Recording...                          ││
│  │         ▁▂▃▅▆▇█▇▆▅▃▂▁▂▃▅▆▇█▇▆▅▃▂▁                    ││
│  │                                                        ││
│  │         "In my previous role at..."                   ││
│  │                                                        ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│     [⏹️ Stop & Submit]     [💬 Type Instead]              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Feedback Display
```
┌────────────────────────────────────────────────────────────┐
│  ✨ Answer Feedback                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ┌─────────┐                                         │
│        │   78    │  Great effort!                          │
│        │  /100   │                                         │
│        └─────────┘                                         │
│                                                            │
│  ✅ Strengths                      ⚠️ To Improve           │
│  • Clear situation setup           • Add specific metrics  │
│  • Good action detail              • Clarify the result    │
│  • Professional tone               • Be more concise       │
│                                                            │
│  📊 STAR Analysis                                          │
│  ┌─────────────────────────────────────────────────────────┐
│  │ S: ████████████ Strong  "Clear project context"       │
│  │ T: ████████░░░░ Adequate "Could specify your role"    │
│  │ A: ████████████ Strong  "Detailed steps taken"        │
│  │ R: ████░░░░░░░░ Weak    "Missing measurable outcome"  │
│  └─────────────────────────────────────────────────────────┘
│                                                            │
│  💡 Tips                                                   │
│  1. Add numbers: "reduced conflicts by 40%"                │
│  2. Mention what you learned from the experience           │
│                                                            │
│  📝 [Show Improved Version]                                │
│                                                            │
│           [Next Question →]    [Practice Similar]          │
└────────────────────────────────────────────────────────────┘
```

---

*Continue to Part 4: Company Research, Peer Practice, Calendar*
