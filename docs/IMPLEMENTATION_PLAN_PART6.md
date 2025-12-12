# Job Pilot - Implementation Plan
## Part 6: Implementation Phases & Timeline

---

## Overview

This document outlines the phased implementation approach for Training Room, Study Room, and all supporting features. The plan is designed for incremental delivery with each phase building on the previous.

**Total Estimated Timeline: 10-12 weeks**

---

## Phase 1: Foundation & Database (Week 1-2)

### Goals
- Set up all database tables
- Create base server actions structure
- Implement core types and interfaces

### Tasks

#### Week 1: Database Setup
- [ ] Create migration file with all new tables (see Part 1)
- [ ] Run migrations in Supabase
- [ ] Create indexes for performance
- [ ] Set up Row Level Security (RLS) policies
- [ ] Seed initial data (achievements, study chapters structure)

```sql
-- Example RLS policies
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON training_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON training_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Week 2: Core Infrastructure
- [ ] Create TypeScript types for all new entities
- [ ] Set up base server actions structure
- [ ] Implement OpenAI service wrapper
- [ ] Create gamification service (XP, achievements)
- [ ] Set up notification system

### Deliverables
- All database tables created and secured
- TypeScript types defined
- Base server actions skeleton
- Gamification service functional

### Files to Create
```
lib/
├── types/
│   ├── study.types.ts
│   ├── training.types.ts
│   ├── company-research.types.ts
│   ├── peer-practice.types.ts
│   ├── gamification.types.ts
│   └── success-stories.types.ts
├── services/
│   ├── ai/
│   │   ├── openai-client.ts
│   │   ├── interview-questions.service.ts
│   │   └── answer-feedback.service.ts
│   └── gamification.service.ts
└── actions/
    ├── study.action.ts (skeleton)
    ├── training.action.ts (skeleton)
    └── gamification.action.ts
```

---

## Phase 2: Study Room MVP (Week 3-4)

### Goals
- Build complete Study Room UI
- Create first 3 chapters of content
- Implement progress tracking

### Tasks

#### Week 3: Study Room Core
- [ ] Create Study Room routes structure
- [ ] Build chapter and lesson components
- [ ] Implement content renderer (text, video, interactive)
- [ ] Create progress tracking system
- [ ] Build quiz system

#### Week 4: Content & Polish
- [ ] Write Chapter 1: Interview Fundamentals (6 lessons)
- [ ] Write Chapter 2: Behavioral Questions (7 lessons)
- [ ] Write Chapter 3: Technical Excellence (6 lessons)
- [ ] Create downloadable resources (cheat sheets)
- [ ] Implement chapter unlocking logic
- [ ] Add XP rewards for completions
- [ ] Dark mode styling

### Deliverables
- Functional Study Room with 3 chapters
- Progress tracking working
- Quiz system with scoring
- XP awards on completion

### Files to Create
```
app/(dashboard)/dashboard/study/
├── page.tsx
├── chapter/[chapterId]/page.tsx
├── lesson/[lessonId]/page.tsx
├── quiz/[quizId]/page.tsx
└── progress/page.tsx

components/study/
├── StudyRoomHome.tsx
├── ChapterCard.tsx
├── ChapterList.tsx
├── LessonViewer.tsx
├── ContentRenderer.tsx
├── content/
│   ├── TextSection.tsx
│   ├── VideoPlayer.tsx
│   └── InteractiveExercise.tsx
├── quiz/
│   ├── QuizContainer.tsx
│   ├── QuizQuestion.tsx
│   └── QuizResults.tsx
└── ProgressBar.tsx

lib/actions/study.action.ts (full implementation)
```

### Content Structure (JSON)
```json
{
  "chapters": [
    {
      "id": "chapter-1",
      "title": "Interview Fundamentals",
      "lessons": [
        {
          "id": "lesson-1-1",
          "title": "The Interview Landscape",
          "content": {
            "sections": [
              { "type": "text", "data": { "body": "..." } },
              { "type": "video", "data": { "videoUrl": "..." } },
              { "type": "quiz", "data": { "questions": [...] } }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## Phase 3: Training Room Core (Week 5-6)

### Goals
- Build voice-based interview simulator
- Implement AI question generation
- Create feedback system

### Tasks

#### Week 5: Voice & Simulator
- [ ] Implement useVoiceInterview hook
- [ ] Build InterviewSimulator component
- [ ] Create session configuration UI
- [ ] Implement AI question generation service
- [ ] Build question display and answer input

#### Week 6: Feedback & Results
- [ ] Implement AI answer analysis service
- [ ] Build feedback panel (scores, STAR analysis)
- [ ] Create session results page
- [ ] Build session history view
- [ ] Implement stats dashboard
- [ ] Add XP rewards for training

### Deliverables
- Voice-based interview simulator working
- AI generates contextual questions
- Real-time feedback on answers
- Session history and stats
- Text fallback for unsupported browsers

### Files to Create
```
app/(dashboard)/dashboard/training/
├── page.tsx
├── session/
│   ├── new/page.tsx
│   └── [sessionId]/
│       ├── page.tsx
│       └── results/page.tsx
├── history/page.tsx
└── stats/page.tsx

components/training/
├── TrainingHome.tsx
├── SessionConfig/
│   └── SessionConfigForm.tsx
├── Simulator/
│   ├── InterviewSimulator.tsx
│   ├── QuestionDisplay.tsx
│   ├── VoiceInput.tsx
│   └── TextInput.tsx
├── Feedback/
│   ├── FeedbackPanel.tsx
│   ├── STARBreakdown.tsx
│   └── ScoreCircle.tsx
├── Results/
│   └── SessionResults.tsx
└── Stats/
    └── StatsDashboard.tsx

hooks/useVoiceInterview.ts
lib/actions/training.action.ts
lib/services/ai/interview-questions.service.ts
lib/services/ai/answer-feedback.service.ts
```

---

## Phase 4: Company Research (Week 7)

### Goals
- Build company research feature (Free + Pro)
- Integrate with Training Room

### Tasks

- [ ] Create company research routes and components
- [ ] Build manual entry form (Free tier)
- [ ] Implement AI research service (Pro tier)
- [ ] Create company detail view
- [ ] Integrate with Training Room for company-specific sessions
- [ ] Add premium gate for AI research

### Deliverables
- Manual company research entry
- AI-powered research (Pro)
- Company-specific training sessions
- Company intel displayed during prep

### Files to Create
```
app/(dashboard)/dashboard/training/company/
├── page.tsx
├── new/page.tsx
└── [companyId]/
    ├── page.tsx
    └── practice/page.tsx

components/training/company/
├── CompanyResearchList.tsx
├── AddCompanyForm.tsx
├── AIResearchButton.tsx
├── CompanyDetail/
│   ├── CompanyHeader.tsx
│   ├── MissionValues.tsx
│   ├── InterviewIntel.tsx
│   └── UserNotes.tsx
└── StartCompanyPractice.tsx

lib/actions/company-research.action.ts
lib/services/ai/company-research.service.ts
```

---

## Phase 5: Integration & Triggers (Week 8)

### Goals
- Connect Study → Training flow
- Implement journey triggers
- Dashboard integration

### Tasks

- [ ] Create first application trigger modal
- [ ] Create study completion → training trigger
- [ ] Add interview preparation banner
- [ ] Build dashboard widgets (continue learning, practice reminder)
- [ ] Integrate Training Room with job applications
- [ ] Add "Prepare for Interview" button on applications

### Deliverables
- Seamless user journey from apply → learn → practice
- Smart triggers at key moments
- Dashboard shows learning/training progress

### Files to Create/Modify
```
components/shared/
├── FirstApplicationModal.tsx
├── ReadyToTrainModal.tsx
├── InterviewPrepBanner.tsx
└── DashboardWidgets/
    ├── ContinueLearning.tsx
    ├── PracticeReminder.tsx
    └── UpcomingInterviews.tsx

// Modify existing
app/(dashboard)/dashboard/page.tsx (add widgets)
components/jobs/ApplicationCard.tsx (add prep button)
```

---

## Phase 6: Peer Practice & Calendar (Week 9)

### Goals
- Implement peer matching system
- Build calendar integration
- Interview detection and reminders

### Tasks

#### Peer Practice
- [ ] Create peer practice profile system
- [ ] Implement matching algorithm
- [ ] Build request/accept flow
- [ ] Create session scheduling
- [ ] Add feedback system

#### Calendar Integration
- [ ] Implement Google Calendar OAuth
- [ ] Build calendar sync service
- [ ] Create interview detection
- [ ] Implement reminder system
- [ ] Build upcoming interviews view

### Deliverables
- Users can find and match with practice partners
- Calendar connected and interviews detected
- Smart reminders before interviews

### Files to Create
```
app/(dashboard)/dashboard/peer-practice/
├── page.tsx
├── profile/page.tsx
├── find/page.tsx
├── requests/page.tsx
└── session/[sessionId]/page.tsx

app/(dashboard)/dashboard/calendar/
├── page.tsx
└── connect/page.tsx

components/peer-practice/
├── PeerPracticeHome.tsx
├── ProfileSetup/
├── FindPartners/
├── Requests/
└── Feedback/

components/calendar/
├── CalendarConnect.tsx
├── DetectedInterviews.tsx
└── InterviewCountdown.tsx

lib/services/calendar/
├── google-calendar.service.ts
└── reminder.service.ts

lib/services/peer-matching.service.ts
lib/actions/peer-practice.action.ts
lib/actions/calendar.action.ts
```

---

## Phase 7: Success Stories & Gamification UI (Week 10)

### Goals
- Build success stories feature
- Create gamification UI elements
- Achievement system visualization

### Tasks

- [ ] Create success stories feed
- [ ] Build story submission flow
- [ ] Implement story detail view
- [ ] Build achievements page
- [ ] Create XP/level display components
- [ ] Add achievement unlock animations
- [ ] Build streak display

### Deliverables
- Success stories feed live
- Users can submit stories after landing jobs
- Full gamification UI (XP, levels, achievements, streaks)

### Files to Create
```
app/(dashboard)/dashboard/success-stories/
├── page.tsx
├── [storyId]/page.tsx
└── submit/page.tsx

app/(dashboard)/dashboard/achievements/
└── page.tsx

components/success-stories/
├── SuccessStoriesFeed.tsx
├── StoryCard.tsx
├── StoryDetail.tsx
├── StorySubmissionForm.tsx
└── FeaturedStories.tsx

components/gamification/
├── XPDisplay.tsx
├── LevelProgress.tsx
├── AchievementGrid.tsx
├── AchievementCard.tsx
├── AchievementUnlockedModal.tsx
├── StreakDisplay.tsx
└── XPGainAnimation.tsx

lib/actions/success-stories.action.ts
```

---

## Phase 8: Premium & Polish (Week 11-12)

### Goals
- Implement premium tier gating
- Complete remaining Study Room content
- Performance optimization
- Bug fixes and polish

### Tasks

#### Week 11: Premium & Content
- [ ] Implement premium check service
- [ ] Add feature gates throughout app
- [ ] Build upgrade prompts and modals
- [ ] Write remaining 4 Study Room chapters
- [ ] Create all downloadable resources

#### Week 12: Polish & Launch
- [ ] Performance optimization
- [ ] Mobile responsiveness review
- [ ] Error handling improvements
- [ ] Loading states and animations
- [ ] User testing and bug fixes
- [ ] Documentation

### Deliverables
- Premium tier fully functional
- All 7 Study Room chapters complete
- Polished, production-ready features

### Files to Create
```
components/premium/
├── FeatureGate.tsx
├── UpgradePrompt.tsx
├── UsageLimitAlert.tsx
├── PricingCard.tsx
└── UpgradeModal.tsx

lib/services/premium.service.ts
```

---

## Implementation Checklist Summary

### Phase 1 (Week 1-2): Foundation
- [ ] Database migrations
- [ ] TypeScript types
- [ ] Server actions skeleton
- [ ] Gamification service

### Phase 2 (Week 3-4): Study Room
- [ ] Study Room routes & UI
- [ ] 3 chapters of content
- [ ] Progress tracking
- [ ] Quiz system

### Phase 3 (Week 5-6): Training Room
- [ ] Voice interview hook
- [ ] Interview simulator
- [ ] AI questions & feedback
- [ ] Session history & stats

### Phase 4 (Week 7): Company Research
- [ ] Manual entry (Free)
- [ ] AI research (Pro)
- [ ] Company-specific training

### Phase 5 (Week 8): Integration
- [ ] Journey triggers
- [ ] Dashboard widgets
- [ ] Application → Training flow

### Phase 6 (Week 9): Peer & Calendar
- [ ] Peer matching
- [ ] Practice scheduling
- [ ] Calendar OAuth
- [ ] Interview reminders

### Phase 7 (Week 10): Stories & Gamification
- [ ] Success stories
- [ ] Achievement UI
- [ ] XP/Level display

### Phase 8 (Week 11-12): Premium & Polish
- [ ] Premium gating
- [ ] Remaining content
- [ ] Performance & polish

---

## Environment Variables Required

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=

# New - Add these
TAVILY_API_KEY=              # For company research web search
GOOGLE_CLIENT_ID=            # For calendar OAuth
GOOGLE_CLIENT_SECRET=        # For calendar OAuth

# Optional
STRIPE_SECRET_KEY=           # For premium payments
STRIPE_WEBHOOK_SECRET=       # For subscription webhooks
```

---

## Success Metrics

### User Engagement
- Study Room completion rate (target: 60%+ complete chapter 1)
- Training sessions per week (target: 2+ for active users)
- Return visit rate (target: 40%+ weekly return)

### Learning Outcomes
- Average training score improvement (target: +15 points over 4 weeks)
- STAR method usage rate (target: 80%+ in behavioral questions)

### Business Metrics
- Free → Premium conversion (target: 5-8%)
- User retention at 30 days (target: 40%)
- Success story submissions (target: 10%+ of users who land jobs)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI costs spike | Monitor usage, implement rate limiting, cache responses |
| Voice API browser support | Always provide text fallback |
| Calendar sync issues | Manual interview entry option |
| Content creation time | Start with AI-generated content, refine iteratively |
| Performance issues | Lazy load components, optimize database queries |

---

## Next Steps

1. **Start with Phase 1** - Set up database and core infrastructure
2. **Create detailed tickets** - Break each phase into specific tasks
3. **Set up monitoring** - Track API usage, errors, performance
4. **Begin content creation** - Start writing Study Room lessons in parallel

---

*End of Implementation Plan*

**Document Version**: 1.0
**Created**: December 2024
**Author**: AI Assistant for Job Pilot
