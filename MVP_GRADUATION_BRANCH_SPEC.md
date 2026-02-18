# JobPilot MVP - Graduation Project Branch Specification

## Overview
This document specifies the **minimal viable product (MVP)** branch for graduation evaluation, focusing on the core job application workflow.

## MVP Scope (4 Core Features)

### ✅ 1. Authentication System
- User signup/login/logout
- Session management
- Protected routes via middleware

### ✅ 2. Resume Upload & Parsing
- Upload resume files (PDF, DOCX)
- Parse resume data (name, skills, experience, education)
- Store parsed data in profile
- View/manage uploaded resumes

### ✅ 3. Cover Letter Generation (AI)
- Generate cover letters using OpenAI/DeepSeek
- Customize tone (professional, friendly, formal)
- Edit generated content
- Link to specific job applications
- Save/manage multiple cover letters

### ✅ 4. Job Application Tracking (End-to-End)
- **Wishlist**: Save interesting jobs
- **Applied**: Track submitted applications
- **Interviewing**: Schedule & track interviews
- **Offer/Rejected**: Final outcomes
- Add jobs manually (paste job details)
- Search jobs via external APIs (optional)
- Application notes & metadata

---

## Database Schema (Minimal Models)

### Required Tables
```prisma
✅ User                 // Auth & core user data
✅ Profile              // User profile (resume-derived data)
✅ Resume               // Uploaded resume files
✅ Skill                // Profile skills
✅ Experience           // Work experience
✅ Education            // Education history
✅ Certification        // Certifications
✅ Project              // Portfolio projects
✅ JobApplication       // Job tracking
✅ CoverLetter          // AI-generated cover letters
✅ JobSearchPreference  // User job search preferences (optional)
✅ AIGeneratedContent   // AI generation metadata (optional)
```

### ❌ Excluded Tables (Not MVP)
```
❌ Training/Study modules (TrainingSession, StudyProgress, etc.)
❌ Community features (CommunityProfile, Posts, Comments, etc.)
❌ Notifications system (Notification, NotificationPreference, etc.)
❌ Calendar/Events (CalendarEvent, UserCalendarConnection, etc.)
❌ Success stories (SuccessStory, SuccessStoryComment, etc.)
❌ Gamification (UserXP, Achievements, Leaderboard, etc.)
❌ Interview kits & masters
❌ Mentorship
❌ Admin features
❌ Analytics/reporting
```

---

## File Structure (MVP Only)

### ✅ Core Infrastructure
```
/
├── .env                              ✅ Environment variables
├── .gitignore                        ✅ Git ignore rules
├── package.json                      ✅ Dependencies
├── next.config.ts                    ✅ Next.js config
├── tsconfig.json                     ✅ TypeScript config
├── tailwind.config.ts                ✅ Tailwind config (if exists)
├── postcss.config.mjs                ✅ PostCSS config
├── components.json                   ✅ Shadcn config
├── middleware.ts                     ✅ Auth middleware
└── README.md                         ✅ Project documentation
```

### ✅ Prisma Database
```
/prisma/
├── schema.prisma                     ✅ (STRIPPED - MVP models only)
├── seed.ts                           ✅ (OPTIONAL - basic seed data)
└── migrations/                       ✅ (Database migrations)
```

### ✅ App Routes (Pages)
```
/app/
├── layout.tsx                        ✅ Root layout
├── page.tsx                          ✅ Landing page (or redirect to dashboard)
├── globals.css                       ✅ Global styles
│
├── (auth)/                           ✅ Auth pages
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── (dashboard)/                      ✅ Main app
│   └── dashboard/
│       ├── layout.tsx                ✅ Dashboard layout with nav
│       ├── page.tsx                  ✅ Dashboard home
│       ├── profile/                  ✅ User profile
│       │   └── page.tsx
│       ├── jobs/                     ✅ Job applications
│       │   ├── page.tsx              ✅ Job list/search
│       │   └── [id]/page.tsx         ✅ Job details (optional)
│       └── letters/                  ✅ Cover letters
│           └── page.tsx
│
└── api/                              ✅ API routes
    ├── auth/[...nextauth]/route.ts   ✅ Auth API (if using NextAuth)
    └── parse-resume/route.ts         ✅ Resume parsing endpoint
```

### ✅ Components (Minimal Set)
```
/components/
├── ui/                               ✅ Shadcn UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   ├── badge.tsx
│   ├── form.tsx
│   ├── toast.tsx
│   ├── tabs.tsx
│   └── ... (other shadcn components used)
│
├── jobs/                             ✅ Job-related components
│   ├── JobCard.tsx
│   ├── JobDetailsModal.tsx
│   ├── JobPasteModal.tsx
│   ├── JobSearchBar.tsx
│   └── CoverLetterGenerator.tsx
│
├── letters/                          ✅ Cover letter components
│   ├── LetterCard.tsx
│   ├── LetterEditor.tsx
│   ├── LetterPreview.tsx
│   ├── TemplatesSection.tsx
│   └── EmptyLettersState.tsx
│
├── profile/                          ✅ Profile components
│   ├── EditProfileForm.tsx
│   ├── ProfileHeader.tsx
│   └── ProfileOverview.tsx
│
└── shared/                           ✅ Shared components
    ├── Navbar.tsx                    ✅ (or DashboardLayout nav)
    ├── Sidebar.tsx                   ✅ (if used)
    └── ResumePreviewModal.tsx        ✅ Resume viewer
```

### ✅ Server Actions
```
/lib/actions/
├── job-application.action.ts         ✅ CRUD for job applications
├── cover-letter.action.ts            ✅ Generate/manage cover letters
├── resume.action.ts                  ✅ Upload/parse resumes
├── profile.action.ts                 ✅ Update user profile
├── skill.action.ts                   ✅ Manage skills
├── experience.action.ts              ✅ Manage experience
├── education.action.ts               ✅ Manage education
├── certification.action.ts           ✅ Manage certifications
├── project.action.ts                 ✅ Manage projects
└── job-search.action.ts              ✅ (OPTIONAL - external job search)
```

### ✅ Core Libraries/Services
```
/lib/
├── auth/                             ✅ Auth utilities
│   ├── index.ts
│   └── session.ts
│
├── supabase/                         ✅ Supabase client
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
│
├── services/                         ✅ Business logic
│   ├── ai/                           ✅ AI service (cover letter gen)
│   │   └── cover-letter-generator.ts
│   └── cv-extractor/                 ✅ Resume parser
│       └── parser.ts
│
├── utils/                            ✅ Utility functions
│   ├── cn.ts                         ✅ Class name utility
│   └── job-parser.ts                 ✅ (if parsing pasted jobs)
│
└── types/                            ✅ TypeScript types
    └── index.ts                      ✅ Shared types
```

### ❌ Excluded Directories (Not MVP)
```
❌ /app/(dashboard)/dashboard/training/
❌ /app/(dashboard)/dashboard/study/
❌ /app/(dashboard)/dashboard/community/
❌ /app/(dashboard)/dashboard/calendar/
❌ /app/(dashboard)/dashboard/analytics/
❌ /app/(dashboard)/dashboard/interviews/
❌ /app/(dashboard)/dashboard/notifications/
❌ /app/(dashboard)/dashboard/admin/
❌ /app/(dashboard)/dashboard/settings/ (except basic profile settings)
❌ /components/community/
❌ /components/training/
❌ /components/study/
❌ /components/calendar/
❌ /components/notifications/
❌ /lib/actions/training.action.ts
❌ /lib/actions/study.action.ts
❌ /lib/actions/community.action.ts
❌ /lib/actions/notifications.action.ts
❌ /lib/actions/calendar.action.ts
❌ /lib/services/event-dispatcher.ts
❌ /lib/services/gamification.service.ts
❌ /lib/types/app-events.ts
❌ /tests/ (can be kept but not required for MVP demo)
❌ /docs/ (can be kept for reference)
```

---

## NPM Dependencies (Minimal)

### ✅ Required Dependencies
```json
{
  "dependencies": {
    "next": "^16.0.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@prisma/client": "^7.0.1",
    "@supabase/supabase-js": "^2.86.2",
    "@supabase/ssr": "^0.8.0",
    "openai": "^6.10.0",
    "pdf-parse": "^2.4.5",
    "mammoth": "^1.11.0",
    "zod": "^4.1.13",
    "react-hook-form": "^7.67.0",
    "@hookform/resolvers": "^5.2.2",
    "lucide-react": "^0.555.0",
    "tailwindcss": "^4",
    "@tailwindcss/typography": "^0.5.19",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "class-variance-authority": "^0.7.1",
    "@radix-ui/react-*": "..." // All shadcn radix dependencies
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^20.19.25",
    "@types/react": "^19",
    "@types/pdf-parse": "^1.1.5",
    "prisma": "^7.0.1",
    "eslint": "^9",
    "eslint-config-next": "16.0.6"
  }
}
```

### ❌ Optional (Remove if not used)
```
❌ @sentry/nextjs (monitoring - not essential for demo)
❌ canvas-confetti (gamification)
❌ framer-motion (if not used in MVP pages)
❌ recharts (analytics charts)
❌ @testing-library/* (testing - optional)
❌ @playwright/test (E2E testing - optional)
```

---

## Environment Variables (Required)

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # If using Supabase

# Supabase
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""  # For admin operations

# OpenAI (for cover letter generation)
OPENAI_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Branch Creation Strategy

### Recommended Approach: **Feature-Stripped Branch**

```bash
# Create new branch from main/master
git checkout -b graduation-mvp

# This branch will REMOVE all non-MVP features
# Cleaner for presentation & easier to understand
```

### Steps to Create MVP Branch:

1. **Create branch from current main**
2. **Strip Prisma schema** to MVP models only
3. **Remove non-MVP routes/pages** (training, study, community, etc.)
4. **Remove non-MVP components**
5. **Remove non-MVP actions** (70% of current actions)
6. **Simplify dashboard layout** (remove non-MVP nav items)
7. **Clean up package.json** (remove unused deps)
8. **Create migration** for MVP schema
9. **Update README** with MVP focus
10. **Test core flows** (auth → resume → cover letter → job tracking)

---

## Core User Flows (For Demonstration)

### Flow 1: Onboarding
1. User signs up (email + password)
2. User uploads resume
3. Resume is parsed → populates profile
4. User lands on dashboard

### Flow 2: Job Application
1. User searches/adds a job (paste or API)
2. Job saved as "Wishlist"
3. User generates cover letter for job
4. User marks job as "Applied"
5. User updates status → "Interviewing" → "Offered"

### Flow 3: Cover Letter Management
1. User views all cover letters
2. User edits/regenerates cover letter
3. User downloads cover letter (optional)

### Flow 4: Profile Management
1. User views profile (resume-derived data)
2. User edits skills/experience manually
3. User uploads new resume → re-parses

---

## Testing & Demo Checklist

Before graduation presentation:

- [ ] Auth works (signup, login, logout)
- [ ] Resume upload & parsing works
- [ ] Profile displays parsed data
- [ ] Cover letter generation works (OpenAI key configured)
- [ ] Can create job application (paste job)
- [ ] Can update job application status
- [ ] Job application flow: Wishlist → Applied → Interviewing → Offered
- [ ] Cover letter links to job application
- [ ] Dashboard shows correct counts/stats
- [ ] No broken links to removed features
- [ ] Clean UI (no placeholder features)

---

## Documentation Requirements (For Graduation)

Your brother should be able to explain:

### Technical Stack
- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, Shadcn UI
- **Backend**: Next.js Server Actions, Prisma ORM
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **AI**: OpenAI API (GPT-4/3.5)
- **Resume Parsing**: pdf-parse, mammoth, custom parser

### Architecture Decisions
- **Why Next.js**: Full-stack framework, SSR, API routes, easy deployment
- **Why Prisma**: Type-safe database access, migrations, great DX
- **Why Supabase**: PostgreSQL + Auth + Real-time in one platform
- **Why Server Actions**: Simplified data fetching, type-safe, no API routes needed
- **Why Shadcn**: Accessible components, customizable, owns the code

### Key Features Implemented
1. **Authentication System**: Secure user management
2. **Resume Parser**: Extracts structured data from PDF/DOCX
3. **AI Cover Letter Generator**: Personalized cover letters using OpenAI
4. **Job Application Tracker**: Complete lifecycle tracking

### Challenges Overcome
- Resume parsing (different formats)
- AI prompt engineering (quality cover letters)
- State management (job application flow)
- Database schema design (relationships)

---

## Estimated Effort Breakdown

- **Auth Setup**: 5-10%
- **Database Schema**: 10-15%
- **Resume Upload/Parse**: 20-25%
- **Cover Letter AI**: 20-25%
- **Job Application CRUD**: 20-25%
- **UI/UX Polish**: 10-15%
- **Testing & Bugs**: 10%

**Total**: This is a **substantial full-stack project** showing real-world skills.

---

## Next Steps

1. **Review this spec** - Confirm scope with your brother
2. **Create branch** - I can help generate the exact git commands
3. **Provide setup guide** - Step-by-step instructions
4. **Create demo script** - What to show during presentation

Ready to proceed? 🚀
