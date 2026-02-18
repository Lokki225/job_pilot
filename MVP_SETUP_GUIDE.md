# JobPilot MVP - Setup Guide for Graduation Branch

## Step-by-Step Branch Creation

### 1. Create the MVP Branch

```bash
# Ensure you're on the latest main branch
git checkout main
git pull origin main

# Create new graduation MVP branch
git checkout -b graduation-mvp

# Push the new branch to remote
git push -u origin graduation-mvp
```

### 2. Strip Non-MVP Database Models

**File**: `prisma/schema.prisma`

**Keep ONLY these models:**
- `User` (with minimal relations)
- `Profile`
- `Resume`
- `Skill`
- `Experience`
- `Education`
- `Certification`
- `Project`
- `JobApplication`
- `JobSearchPreference` (optional)
- `CoverLetter`
- `AIGeneratedContent` (optional)

**Remove ALL these models:**
- Training-related (TrainingSession, TrainingQuestion, etc.)
- Study-related (StudyProgress, StudyContent, CustomStudyPlan, etc.)
- Community-related (CommunityProfile, CommunityPost, UserFollow, ChatRoom, etc.)
- Notifications (Notification, NotificationPreference, NotificationQueue, etc.)
- Calendar (CalendarEvent, UserCalendarConnection, DetectedInterview, etc.)
- Success Stories (SuccessStory, SuccessStoryComment, SuccessStoryLike, etc.)
- Gamification (UserXP, XPTransaction, UserAchievement, etc.)
- Interview Kits (InterviewKit, InterviewKitSnapshot, etc.)
- Mentorship (MentorProfile, Mentorship, MentorKycVerification, etc.)
- Admin (CommunityRoleApplication, etc.)

**Also clean up User model relations** - remove all non-MVP relation fields.

### 3. Create Minimal Schema File

I'll create a clean MVP schema for you:

```bash
# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.full-backup

# We'll create a new minimal schema
```

### 4. Remove Non-MVP Routes

Delete these directories from `app/(dashboard)/dashboard/`:
- `training/`
- `study/`
- `community/`
- `calendar/`
- `analytics/`
- `interviews/` (the peer interview feature, not job interview tracking)
- `notifications/`
- `admin/`
- `settings/` (keep only if it has basic profile settings)

### 5. Remove Non-MVP Components

Delete these directories from `components/`:
- `community/`
- `training/`
- `study/`
- `calendar/`
- `notifications/`
- `analytics/`
- `admin/`

### 6. Remove Non-MVP Server Actions

Delete these files from `lib/actions/`:
- `training.action.ts`
- `study.action.ts`
- `study-content.action.ts`
- `custom-study-plan.action.ts`
- `community.action.ts`
- `community-grades.action.ts`
- `success-stories.action.ts`
- `calendar.action.ts`
- `notifications.action.ts`
- `notification-preferences.action.ts`
- `leaderboard-sync.action.ts`
- `mentor-kyc.action.ts`
- `role-applications.action.ts`
- `interview-kits.action.ts`
- `admin-*.action.ts` (all admin actions)
- `saved-job-searches.action.ts` (optional - can keep if useful)
- `prep-pack.action.ts`
- `interviews.action.ts` (peer interviews, not job interviews)
- `certification.action.ts` (keep if used in profile)

**Keep these core actions:**
- `job-application.action.ts` ✅
- `cover-letter.action.ts` ✅
- `resume.action.ts` ✅
- `profile.action.ts` ✅
- `skill.action.ts` ✅
- `experience.action.ts` ✅
- `education.action.ts` ✅
- `project.action.ts` ✅
- `job-search.action.ts` ✅ (if using external job APIs)
- `job-recommendations.action.ts` ✅ (optional)
- `job-preferences.action.ts` ✅ (optional)

### 7. Remove Non-MVP Services

Delete these from `lib/services/`:
- `event-dispatcher.ts`
- `gamification.service.ts`
- `achievements.service.ts`
- `community-grades.service.ts`
- `training/` (entire directory)
- `study-content/` (entire directory)

**Keep:**
- `ai/` (for cover letter generation)
- `cv-extractor/` (for resume parsing)
- `job-search/` (if using external APIs)

### 8. Clean Up Dashboard Layout

**File**: `app/(dashboard)/dashboard/layout.tsx`

Update navigation to show ONLY:
- Dashboard (home)
- Jobs
- Cover Letters
- Profile

Remove nav items for:
- Training
- Study Room
- Community
- Calendar
- Analytics
- Notifications
- etc.

### 9. Simplify Dashboard Home Page

**File**: `app/(dashboard)/dashboard/page.tsx`

Strip down to show only:
- Welcome message
- Quick stats (jobs applied, interviews, offers)
- Recent applications
- Quick actions (Add job, Generate cover letter, Upload resume)

Remove:
- XP/Level display
- Community feed
- Training suggestions
- Calendar events
- Achievements

### 10. Update Package.json

Remove unused dependencies:
```bash
npm uninstall @sentry/nextjs canvas-confetti framer-motion recharts
# (Only if not used in MVP pages)
```

### 11. Create New Migration

```bash
# Generate a fresh migration for the stripped schema
npx prisma migrate dev --name mvp_graduation_schema

# This will create a new migration file
```

### 12. Update README

Create a new README specific to the MVP:

**File**: `README_MVP.md`

```markdown
# JobPilot MVP - Job Application Assistant

A full-stack web application that helps job seekers manage their job search process with AI-powered cover letter generation and resume parsing.

## Core Features

1. **Authentication** - Secure user signup/login
2. **Resume Upload & Parsing** - Automatic extraction of profile data
3. **AI Cover Letter Generation** - Personalized cover letters using OpenAI
4. **Job Application Tracker** - Full lifecycle management (Wishlist → Applied → Interviewing → Offered)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, Shadcn UI
- **Backend**: Next.js Server Actions, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **AI**: OpenAI API (GPT-4/3.5)

## Setup Instructions

1. Clone and install:
```bash
git clone <repo-url>
cd job_pilot
git checkout graduation-mvp
npm install
```

2. Configure environment:
```bash
cp .env.example .env.local
# Add your API keys (Supabase, OpenAI)
```

3. Setup database:
```bash
npx prisma generate
npx prisma db push
```

4. Run development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

- `/app` - Next.js pages and routes
- `/components` - Reusable UI components
- `/lib/actions` - Server actions for data operations
- `/lib/services` - Business logic (AI, resume parsing)
- `/prisma` - Database schema and migrations
```

### 13. Test the MVP

Create a test checklist:

```bash
# Start the dev server
npm run dev

# Test these flows:
# 1. Sign up new user
# 2. Upload resume
# 3. Check profile populated with resume data
# 4. Add a job application (paste job)
# 5. Generate cover letter for job
# 6. Update job status through the workflow
# 7. View all applications
# 8. View all cover letters
```

---

## Git Workflow Summary

```bash
# 1. Create branch
git checkout -b graduation-mvp

# 2. Make all the deletions and modifications above

# 3. Stage changes
git add .

# 4. Commit
git commit -m "feat: Create MVP graduation branch

- Strip non-MVP features (training, study, community, etc.)
- Simplify database schema to core models
- Remove unused components and actions
- Update navigation and dashboard
- Focus on: Auth + Resume + Cover Letters + Job Tracking"

# 5. Push to remote
git push -u origin graduation-mvp
```

---

## Environment Variables Checklist

Ensure your `.env` or `.env.local` has:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# OpenAI (Cover Letter Generation)
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Database Reset (If Needed)

If you need to completely reset the database for the MVP:

```bash
# WARNING: This deletes ALL data
npx prisma migrate reset

# Or manually:
npx prisma db push --force-reset

# Then seed with test data (optional)
npx prisma db seed
```

---

## Deployment Checklist

Before deploying (Vercel, Netlify, etc.):

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] OpenAI API key has credits
- [ ] Supabase project is production-ready
- [ ] All non-MVP routes removed (no 404s)
- [ ] Test all core flows work

---

## Troubleshooting

### Issue: Prisma client out of sync
```bash
npx prisma generate
```

### Issue: Database connection errors
Check `DATABASE_URL` and `DIRECT_URL` in `.env`

### Issue: OpenAI API errors
- Verify API key is valid
- Check account has credits
- Try switching to GPT-3.5 if GPT-4 quota exceeded

### Issue: Resume parsing fails
- Ensure PDF/DOCX files are valid
- Check file size limits (usually 5MB max)
- Test with different resume formats

---

## Demo Script (For Graduation Presentation)

### 1. Introduction (2 min)
- Show landing page
- Explain the problem: Job search is chaotic
- Solution: Centralized tracker + AI assistance

### 2. Live Demo (10 min)

**Step 1: Authentication**
- Sign up with test account
- Show secure login

**Step 2: Resume Upload**
- Upload sample resume (PDF)
- Show parsing in action
- Display populated profile data

**Step 3: Job Application**
- Paste a job description
- Save as "Wishlist"
- Generate AI cover letter
- Show customization (tone, edits)
- Mark as "Applied"

**Step 4: Application Tracking**
- Show job list with filters
- Update status to "Interviewing"
- Add interview notes
- Update to "Offered"

**Step 5: Profile Management**
- Show complete profile
- Edit skills manually
- Show data persistence

### 3. Technical Deep Dive (5 min)
- Show code structure
- Explain architecture decisions
- Database schema diagram
- API integration (OpenAI)

### 4. Q&A (3 min)
- Be ready to explain challenges
- Discuss scalability
- Future enhancements

---

## File Size Estimate

MVP should be significantly smaller:
- **Current project**: ~95 files in `app/`, ~115 components
- **MVP project**: ~30 files in `app/`, ~40 components
- **Lines of code**: Reduced by 60-70%

This makes it much easier to explain and defend!

---

## Success Criteria

Your brother can successfully demonstrate:
✅ User authentication and security
✅ File upload and processing (resume parsing)
✅ Third-party API integration (OpenAI)
✅ CRUD operations (jobs, cover letters)
✅ State management (job application workflow)
✅ Database design and relationships
✅ Modern web development practices
✅ Responsive UI/UX

Good luck! 🎓🚀
