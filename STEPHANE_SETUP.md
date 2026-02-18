# JobPilot MVP - Graduation Setup Guide

## Quick Start (5 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Environment Variables

Create `.env.local` file in the project root with these variables:

#### **Supabase (Database + Auth)**
1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Create new project → Choose region
3. Wait for database to provision (~2 min)
4. Go to **Project Settings** → **API**
5. Copy these values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."
```

6. Go to **Project Settings** → **Database** → Copy connection strings:

```env
# Database (use "Transaction" pooler URL)
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"
```

#### **OpenAI (Cover Letter Generation)**
1. Go to [platform.openai.com](https://platform.openai.com/signup)
2. Sign up → Add payment method ($5 minimum)
3. Go to **API Keys** → Create new key
4. Copy the key:

```env
# OpenAI
OPENAI_API_KEY="sk-proj-xxxxx..."
```

#### **App Config**
```env
# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**Complete `.env.local` example:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# Database
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"

# OpenAI
OPENAI_API_KEY="sk-proj-xxxxx..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 5. Test Core Features

**Test Flow:**
1. Sign up → Create account
2. Upload resume (PDF/DOCX)
3. Check profile → Should show parsed data
4. Add job → Paste job details
5. Generate cover letter → For the job
6. Update job status → Applied → Interviewing → Offered

---

## MVP Features (What Works)

✅ **Authentication** - Signup/Login/Logout  
✅ **Resume Upload** - PDF/DOCX parsing  
✅ **Profile** - Auto-populated from resume  
✅ **Job Tracking** - Wishlist → Applied → Interviewing → Offered  
✅ **Cover Letters** - AI-generated (OpenAI GPT-4)  

---

## Project Structure

```
/app/(auth)         → Login/Signup pages
/app/(dashboard)    → Main app (Jobs, Letters, Profile)
/lib/actions        → Server actions (job-application, cover-letter, resume, profile)
/lib/services       → Business logic (AI, resume parsing)
/components         → UI components (jobs, letters, profile, ui)
/prisma            → Database schema (12 models - MVP only)
```

---

## Troubleshooting

**Database connection error?**
- Check `DATABASE_URL` and `DIRECT_URL` are correct
- Ensure Supabase project is running

**OpenAI API error?**
- Verify API key is valid
- Check account has credits ($5+ recommended)
- Try GPT-3.5-turbo if GPT-4 quota exceeded

**Resume parsing fails?**
- Use valid PDF/DOCX files
- Check file size < 5MB
- Test with different resume formats

**Prisma errors?**
```bash
npx prisma generate
npx prisma db push --force-reset  # WARNING: Deletes all data
```

---

## Demo Tips (For Presentation)

1. **Start clean** - Fresh database with no test data
2. **Prepare sample resume** - Have PDF ready to upload
3. **Prepare job description** - Copy from real job posting
4. **Show the flow** - Wishlist → Applied → Interviewing → Offered
5. **Explain decisions** - Why Next.js? Why Prisma? Why OpenAI?

**Key Talking Points:**
- Full-stack application (frontend + backend + database)
- Third-party API integration (OpenAI)
- File processing (resume parsing)
- Modern tech stack (Next.js 16, React 19, PostgreSQL)
- Production-ready architecture

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19 | UI + Routing |
| Styling | TailwindCSS, Shadcn | Modern UI components |
| Backend | Next.js Server Actions | API logic |
| Database | PostgreSQL (Supabase) | Data storage |
| ORM | Prisma | Type-safe DB access |
| Auth | Supabase Auth | User management |
| AI | OpenAI GPT-4 | Cover letter generation |
| Parsing | pdf-parse, mammoth | Resume extraction |

Good luck with your graduation! 🎓
