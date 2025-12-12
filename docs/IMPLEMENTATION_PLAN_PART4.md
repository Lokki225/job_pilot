# Job Pilot - Implementation Plan
## Part 4: Company Research, Peer Practice & Calendar Integration

---

## Company Research Feature

### Two-Tier Approach

| Tier | Method | Features |
|------|--------|----------|
| **Free** | User pastes research | Manual entry, organize notes |
| **Pro** | AI auto-research | Web scraping, news, Glassdoor, auto-update |

### AI Research Service

```typescript
// lib/services/ai/company-research.service.ts

interface CompanyResearchResult {
  missionStatement: string;
  coreValues: string[];
  companyCulture: string;
  industry: string;
  companySize: string;
  foundedYear?: number;
  headquarters?: string;
  mainProducts: string[];
  keyAchievements: string[];
  recentNews: { title: string; date: string; summary: string; url?: string }[];
  leadershipTeam: { name: string; title: string; linkedin?: string }[];
  commonInterviewQuestions: string[];
  interviewProcess: string;
  glassdoorRating?: number;
  glassdoorSummary?: string;
  companyChallenges: string[];
  growthOpportunities: string[];
}

export async function researchCompany(params: {
  companyName: string;
  companyWebsite?: string;
  jobTitle?: string;
}): Promise<CompanyResearchResult> {
  // Step 1: Web search for company info
  const companyInfo = await searchWeb(`${params.companyName} company about mission values culture`);
  
  // Step 2: Search for interview experiences
  const interviewInfo = await searchWeb(`${params.companyName} interview questions glassdoor process`);
  
  // Step 3: Search recent news
  const newsInfo = await searchWeb(`${params.companyName} news 2024`);
  
  // Step 4: Synthesize with GPT-4
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a company research analyst. Extract and synthesize company information from search results.
Be factual. If information isn't available, use null.

Output JSON format:
{
  "missionStatement": "...",
  "coreValues": ["value1", "value2"],
  "companyCulture": "Description...",
  "industry": "...",
  "companySize": "startup|small|medium|large|enterprise",
  "mainProducts": ["product1", "product2"],
  "keyAchievements": ["achievement1"],
  "recentNews": [{"title": "...", "date": "2024-01-15", "summary": "..."}],
  "leadershipTeam": [{"name": "...", "title": "CEO"}],
  "commonInterviewQuestions": ["question1", "question2"],
  "interviewProcess": "Description of typical process...",
  "glassdoorRating": 4.2,
  "glassdoorSummary": "Summary of employee reviews...",
  "companyChallenges": ["challenge1"],
  "growthOpportunities": ["opportunity1"]
}`
      },
      {
        role: 'user',
        content: `Company: ${params.companyName}
${params.companyWebsite ? `Website: ${params.companyWebsite}` : ''}
${params.jobTitle ? `Target Role: ${params.jobTitle}` : ''}

Search Results:
${JSON.stringify({ companyInfo, interviewInfo, newsInfo })}`
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

// Web search using Tavily API (or similar)
async function searchWeb(query: string) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: 8
    })
  });
  return response.json();
}
```

### Company Research Components

```
components/training/company/
├── CompanyResearchList.tsx       # All companies
├── CompanyResearchCard.tsx       # Company preview
├── AddCompanyForm.tsx            # Manual entry (Free)
├── AIResearchButton.tsx          # Trigger AI research (Pro)
├── ResearchProgress.tsx          # AI research loading
├── CompanyDetail/
│   ├── CompanyHeader.tsx         # Name, industry, basics
│   ├── MissionValues.tsx         # Mission & values
│   ├── CultureSection.tsx        # Culture info
│   ├── ProductsSection.tsx       # Products/services
│   ├── NewsTimeline.tsx          # Recent news
│   ├── LeadershipGrid.tsx        # Leadership team
│   ├── InterviewIntel.tsx        # Questions & process
│   └── UserNotes.tsx             # Custom notes
└── StartCompanyPractice.tsx      # Launch session
```

### Server Actions

```typescript
// lib/actions/company-research.action.ts

export async function getCompanyResearchList();
export async function getCompanyResearch(companyId: string);
export async function createCompanyResearch(data: CreateCompanyInput);
export async function triggerAIResearch(params: { companyName: string; website?: string });
export async function updateCompanyResearch(id: string, updates: Partial<CompanyResearch>);
export async function deleteCompanyResearch(companyId: string);
export async function refreshAIResearch(companyId: string); // Re-run AI research
```

---

## Peer Practice System

### Matching Algorithm

```typescript
// lib/services/peer-matching.service.ts

interface PeerMatch {
  userId: string;
  displayName: string;
  matchScore: number;
  matchReasons: string[];
  sharedIndustries: string[];
  sharedRoles: string[];
  availableTimes: TimeSlot[];
  experienceLevel: string;
  languages: string[];
  avgRating: number;
  totalSessions: number;
}

export async function findPeerMatches(userId: string): Promise<PeerMatch[]> {
  const userProfile = await getPeerProfile(userId);
  const availablePeers = await getAvailablePeers(userId);
  
  const matches = availablePeers.map(peer => {
    let score = 0;
    const reasons: string[] = [];
    
    // Industry match (30 pts max)
    const sharedIndustries = userProfile.industries.filter(i => 
      peer.industries.includes(i)
    );
    if (sharedIndustries.length) {
      score += Math.min(sharedIndustries.length * 10, 30);
      reasons.push(`Shared industries: ${sharedIndustries.join(', ')}`);
    }
    
    // Role match (30 pts max)
    const sharedRoles = userProfile.targetRoles.filter(r => 
      peer.targetRoles.includes(r)
    );
    if (sharedRoles.length) {
      score += Math.min(sharedRoles.length * 10, 30);
      reasons.push('Similar target roles');
    }
    
    // Experience level (20 pts)
    if (userProfile.experienceLevel === peer.experienceLevel) {
      score += 20;
      reasons.push('Same experience level');
    }
    
    // Schedule overlap (20 pts max)
    const scheduleOverlap = findScheduleOverlap(
      userProfile.preferredTimes,
      peer.preferredTimes,
      userProfile.timezone,
      peer.timezone
    );
    if (scheduleOverlap.length) {
      score += Math.min(scheduleOverlap.length * 5, 20);
      reasons.push(`${scheduleOverlap.length} matching time slots`);
    }
    
    return {
      ...peer,
      matchScore: score,
      matchReasons: reasons,
      sharedIndustries,
      sharedRoles,
      availableTimes: scheduleOverlap
    };
  });
  
  return matches
    .filter(m => m.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}
```

### Peer Practice Routes

```
app/(dashboard)/dashboard/peer-practice/
├── page.tsx                    # Home
├── profile/
│   └── page.tsx                # Setup profile
├── find/
│   └── page.tsx                # Find partners
├── requests/
│   └── page.tsx                # Requests inbox
├── session/
│   └── [sessionId]/
│       ├── page.tsx            # Session details
│       └── feedback/
│           └── page.tsx        # Post-session feedback
└── history/
    └── page.tsx                # Past sessions
```

### Peer Practice Components

```
components/peer-practice/
├── PeerPracticeHome.tsx        # Dashboard
├── ProfileSetup/
│   ├── ProfileForm.tsx         # Setup form
│   ├── AvailabilityPicker.tsx  # Time slots
│   └── IndustrySelector.tsx    # Industries
├── FindPartners/
│   ├── MatchList.tsx           # Matches grid
│   ├── MatchCard.tsx           # Single match
│   ├── MatchFilters.tsx        # Filter controls
│   └── RequestModal.tsx        # Send request
├── Requests/
│   ├── RequestInbox.tsx        # All requests
│   ├── IncomingRequest.tsx     # Accept/decline
│   └── OutgoingRequest.tsx     # Pending sent
├── Session/
│   ├── SessionDetails.tsx      # Upcoming session
│   ├── VideoRoom.tsx           # WebRTC call
│   ├── SessionGuide.tsx        # How to run it
│   └── SessionTimer.tsx        # Timer
└── Feedback/
    ├── FeedbackForm.tsx        # Rate partner
    └── FeedbackHistory.tsx     # Past feedback
```

### Server Actions

```typescript
// lib/actions/peer-practice.action.ts

export async function getPeerProfile();
export async function updatePeerProfile(data: UpdateProfileInput);
export async function setAvailability(available: boolean);

export async function findMatches(): Promise<PeerMatch[]>;
export async function sendPracticeRequest(params: {
  toUserId: string;
  proposedTimes: Date[];
  message?: string;
  focusArea?: string;
});

export async function getRequests(): Promise<{
  incoming: PracticeRequest[];
  outgoing: PracticeRequest[];
}>;
export async function respondToRequest(requestId: string, accept: boolean, selectedTime?: Date);

export async function getUpcomingSessions();
export async function getPeerSessionDetails(sessionId: string);
export async function submitSessionFeedback(params: {
  sessionId: string;
  rating: number;
  feedback: string;
});
```

---

## Calendar Integration

### Google Calendar OAuth Flow

```typescript
// lib/services/calendar/google-calendar.service.ts

import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

// Generate auth URL
export function getGoogleAuthUrl(userId: string) {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass user ID for callback
    prompt: 'consent'
  });
}

// Exchange code for tokens
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Sync calendar and detect interviews
export async function syncCalendarAndDetectInterviews(userId: string) {
  const connection = await getCalendarConnection(userId);
  if (!connection) throw new Error('No calendar connected');
  
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Get events from next 30 days
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: thirtyDaysLater.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  // Detect interview events
  const interviewKeywords = [
    'interview', 'phone screen', 'technical interview',
    'behavioral interview', 'hiring', 'recruiter call',
    'final round', 'onsite', 'virtual onsite'
  ];
  
  const detectedInterviews = events.data.items?.filter(event => {
    const title = event.summary?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    return interviewKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
  }) || [];
  
  // Parse and save detected interviews
  for (const event of detectedInterviews) {
    await upsertDetectedInterview({
      userId,
      calendarEventId: event.id,
      companyName: extractCompanyName(event),
      scheduledAt: event.start?.dateTime || event.start?.date,
      durationMinutes: calculateDuration(event),
      location: event.location || event.hangoutLink,
      description: event.description
    });
  }
  
  // Update last sync time
  await updateCalendarConnection(connection.id, {
    last_sync_at: new Date().toISOString()
  });
  
  return detectedInterviews.length;
}

function extractCompanyName(event: any): string {
  // Try to extract company name from title or description
  const title = event.summary || '';
  // Common patterns: "Interview with [Company]", "[Company] Interview"
  const patterns = [
    /interview (?:with|at) ([A-Za-z0-9\s]+)/i,
    /([A-Za-z0-9\s]+) interview/i,
    /call with ([A-Za-z0-9\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].trim();
  }
  
  return 'Unknown Company';
}
```

### Interview Reminder System

```typescript
// lib/services/calendar/reminder.service.ts

interface InterviewReminder {
  interviewId: string;
  userId: string;
  companyName: string;
  scheduledAt: Date;
  reminderType: '5_days' | '2_days' | '1_day' | '2_hours';
}

// Called by cron job or scheduled function
export async function processInterviewReminders() {
  const now = new Date();
  
  // Get all upcoming interviews that need reminders
  const interviews = await getInterviewsNeedingReminders();
  
  for (const interview of interviews) {
    const hoursUntil = (interview.scheduled_at.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntil = hoursUntil / 24;
    
    // 5 days reminder
    if (daysUntil <= 5 && daysUntil > 4 && !interview.reminder_5_days_sent) {
      await sendReminder(interview, '5_days');
      await markReminderSent(interview.id, 'reminder_5_days_sent');
    }
    
    // 2 days reminder
    if (daysUntil <= 2 && daysUntil > 1 && !interview.reminder_2_days_sent) {
      await sendReminder(interview, '2_days');
      await markReminderSent(interview.id, 'reminder_2_days_sent');
    }
    
    // 1 day reminder
    if (daysUntil <= 1 && hoursUntil > 12 && !interview.reminder_1_day_sent) {
      await sendReminder(interview, '1_day');
      await markReminderSent(interview.id, 'reminder_1_day_sent');
    }
    
    // 2 hours reminder
    if (hoursUntil <= 2 && hoursUntil > 1 && !interview.reminder_2_hours_sent) {
      await sendReminder(interview, '2_hours');
      await markReminderSent(interview.id, 'reminder_2_hours_sent');
    }
  }
}

async function sendReminder(interview: any, type: string) {
  const messages = {
    '5_days': {
      title: `Interview in 5 days!`,
      body: `Your interview at ${interview.company_name} is coming up. Start preparing now!`,
      actionUrl: `/dashboard/training/company/${interview.company_research_id || 'new'}?company=${interview.company_name}`
    },
    '2_days': {
      title: `Interview in 2 days!`,
      body: `Time for a mock interview session for ${interview.company_name}.`,
      actionUrl: `/dashboard/training/session/new?company=${interview.company_name}`
    },
    '1_day': {
      title: `Interview tomorrow!`,
      body: `Final prep for your ${interview.company_name} interview. Review your notes!`,
      actionUrl: `/dashboard/training/company/${interview.company_research_id}`
    },
    '2_hours': {
      title: `Interview in 2 hours!`,
      body: `Get ready! Quick tips: breathe, be confident, you've prepared for this.`,
      actionUrl: `/dashboard/training/company/${interview.company_research_id}`
    }
  };
  
  const message = messages[type];
  
  // Create in-app notification
  await createNotification({
    userId: interview.user_id,
    type: 'interview_reminder',
    title: message.title,
    message: message.body,
    actionUrl: message.actionUrl,
    data: { interviewId: interview.id, reminderType: type }
  });
  
  // Send email (optional)
  // await sendEmail(interview.user_id, message);
}
```

### Calendar Components

```
components/calendar/
├── CalendarConnect.tsx           # Connect calendar button
├── ConnectedCalendars.tsx        # Manage connections
├── DetectedInterviews.tsx        # List of detected interviews
├── InterviewCard.tsx             # Single interview
├── InterviewTimeline.tsx         # Timeline view
├── ReminderSettings.tsx          # Configure reminders
└── InterviewCountdown.tsx        # Countdown widget
```

### Calendar Routes

```
app/(dashboard)/dashboard/calendar/
├── page.tsx                      # Calendar home
├── connect/
│   └── page.tsx                  # Connect calendar
└── interviews/
    └── [interviewId]/
        └── page.tsx              # Interview detail
```

### Server Actions

```typescript
// lib/actions/calendar.action.ts

export async function getCalendarConnections();
export async function connectGoogleCalendar(code: string);
export async function disconnectCalendar(connectionId: string);
export async function syncCalendar(connectionId: string);

export async function getDetectedInterviews();
export async function getUpcomingInterviews(days?: number);
export async function updateInterviewDetails(interviewId: string, updates: any);
export async function linkInterviewToApplication(interviewId: string, applicationId: string);
export async function recordInterviewOutcome(interviewId: string, outcome: string, notes?: string);
```

---

*Continue to Part 5: Success Stories, Gamification & Premium Tiers*
