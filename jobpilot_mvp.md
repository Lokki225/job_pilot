# JobPilot AI - MVP Blueprint
## 🎯 Mission: Live & Testable in 4-6 Weeks

---

## 🧩 MVP Core Concept

**Simplest version that delivers value:**
A web app where users paste job URLs, get AI-generated cover letters, and track all applications in one dashboard.

**What we're NOT building yet:**
- ❌ Job scraping/discovery
- ❌ Auto-submission to platforms
- ❌ Browser extensions
- ❌ Mobile apps
- ❌ Complex analytics

**What we ARE building:**
- ✅ User accounts
- ✅ CV/Resume upload & parsing
- ✅ Manual job URL input
- ✅ AI cover letter generation
- ✅ Application tracker dashboard
- ✅ Basic edit & export features

---

## 📐 MVP Architecture

```
┌─────────────────────────────────────────────────┐
│            FRONTEND (Next.js 14)                │
│  - Landing page + Auth                          │
│  - Dashboard (job list)                         │
│  - CV upload page                               │
│  - Letter generator page                        │
│  - Application tracker                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         BACKEND API (Next.js API Routes)        │
│  - /api/auth (NextAuth.js)                      │
│  - /api/cv/upload                               │
│  - /api/cv/parse                                │
│  - /api/jobs (CRUD)                             │
│  - /api/letters/generate                        │
│  - /api/applications (CRUD + tracking)          │
└─────────────────────────────────────────────────┘
                        ↓
┌──────────────────┬──────────────────────────────┐
│   PostgreSQL     │     OpenAI / Claude API      │
│   (Supabase)     │   (Letter Generation)        │
└──────────────────┴──────────────────────────────┘
```

---

## 🗄️ Database Schema (Simplified)

### `users`
| Column       | Type      | Notes                    |
|--------------|-----------|--------------------------|
| id           | UUID      | Primary key              |
| email        | String    | Unique                   |
| name         | String    |                          |
| created_at   | Timestamp |                          |

### `profiles`
| Column          | Type      | Notes                        |
|-----------------|-----------|------------------------------|
| id              | UUID      | Primary key                  |
| user_id         | UUID      | FK to users                  |
| cv_text         | Text      | Parsed CV content            |
| skills          | JSON      | ["React", "Python", ...]     |
| experience      | JSON      | Job history array            |
| education       | JSON      | Education history            |
| updated_at      | Timestamp |                              |

### `jobs`
| Column          | Type      | Notes                        |
|-----------------|-----------|------------------------------|
| id              | UUID      | Primary key                  |
| user_id         | UUID      | FK to users                  |
| title           | String    | Job title                    |
| company         | String    |                              |
| url             | String    | Job posting URL              |
| description     | Text      | Pasted job description       |
| location        | String    |                              |
| status          | Enum      | saved, applied, replied, ... |
| created_at      | Timestamp |                              |

### `letters`
| Column          | Type      | Notes                        |
|-----------------|-----------|------------------------------|
| id              | UUID      | Primary key                  |
| job_id          | UUID      | FK to jobs                   |
| content         | Text      | Generated letter             |
| edited_content  | Text      | User-edited version          |
| is_used         | Boolean   | Was this version sent?       |
| created_at      | Timestamp |                              |

---

## 🎨 User Flow (Step-by-Step)

### **Step 1: Sign Up / Login**
- User creates account (email + password or OAuth Google)
- Redirects to onboarding

### **Step 2: Upload CV**
```
┌────────────────────────────────────┐
│   Upload Your CV                   │
│                                    │
│   [Drop file here or browse]       │
│                                    │
│   Supported: PDF, DOCX, TXT        │
│                                    │
│   [Continue] ────────────────────► │
└────────────────────────────────────┘
```
- Backend parses CV using AI (extract name, skills, experience)
- Stores parsed data in `profiles` table
- Shows preview: "We found these skills: React, Node.js, Python..."

### **Step 3: Dashboard**
```
┌─────────────────────────────────────────────────┐
│  JobPilot AI            [Profile] [Logout]      │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 Overview                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Total Applications: 12                         │
│  Pending: 8  |  Replied: 3  |  Rejected: 1     │
│                                                 │
│  [+ Add New Job]                                │
│                                                 │
│  Recent Applications:                           │
│  ┌───────────────────────────────────────────┐ │
│  │ Frontend Developer @ Stripe               │ │
│  │ Status: Applied (2 days ago)              │ │
│  │ [View Letter] [Mark as Replied]           │ │
│  └───────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────┐ │
│  │ React Engineer @ Vercel                   │ │
│  │ Status: Pending (5 days ago)              │ │
│  │ [View Letter] [Edit] [Delete]             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Step 4: Add a Job**
```
┌────────────────────────────────────┐
│   Add Job Application              │
├────────────────────────────────────┤
│                                    │
│  Job URL*                          │
│  [https://linkedin.com/jobs/...]   │
│                                    │
│  Job Title*                        │
│  [Senior Frontend Developer]       │
│                                    │
│  Company*                          │
│  [Stripe]                          │
│                                    │
│  Location                          │
│  [San Francisco, CA (Remote)]      │
│                                    │
│  Job Description*                  │
│  [Paste full job description...]   │
│  │                                 │
│  │                                 │
│  └─────────────────────────────────┘
│                                    │
│  [Cancel]  [Save & Generate Letter]│
└────────────────────────────────────┘
```

### **Step 5: AI Letter Generation**
- User clicks "Save & Generate Letter"
- Loading screen: "Crafting your perfect cover letter..."
- AI generates letter using:
  - User's CV data
  - Job description
  - Company info
  - Professional tone

**Sample Prompt to AI:**
```
Generate a professional cover letter for:

**Applicant Profile:**
{parsed_cv_data}

**Job Title:** {job_title}
**Company:** {company}
**Job Description:** {job_description}

**Requirements:**
- 250-350 words
- Professional but warm tone
- Highlight relevant skills from CV
- Show genuine interest in company
- Include specific examples
- End with clear call to action
```

### **Step 6: Review & Edit Letter**
```
┌─────────────────────────────────────────────────┐
│  Cover Letter for Frontend Developer @ Stripe   │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Edit Mode ▼] [Copy] [Download PDF] [Export]  │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Dear Hiring Manager,                      │ │
│  │                                           │ │
│  │ I am writing to express my strong        │ │
│  │ interest in the Frontend Developer       │ │
│  │ position at Stripe. With 5 years of      │ │
│  │ experience building scalable React       │ │
│  │ applications...                           │ │
│  │                                           │ │
│  │ [Full letter content]                     │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [← Back]  [Regenerate]  [Save Changes]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

- User can edit directly in textarea
- Click "Regenerate" for new version
- "Save Changes" stores edited version

### **Step 7: Track Application Status**
- Back on dashboard, user manually updates status:
  - 🟡 Saved (not applied yet)
  - 🟢 Applied
  - 🔵 Replied
  - 🟠 Interview Scheduled
  - ⚫ Rejected

---

## 🛠️ Tech Stack (Final Decision)

| Layer           | Technology                | Why?                                    |
|-----------------|---------------------------|-----------------------------------------|
| **Frontend**    | Next.js 14 + TypeScript   | Full-stack framework, great DX          |
| **Styling**     | Tailwind CSS + shadcn/ui  | Fast UI development, beautiful defaults |
| **Backend**     | Next.js API Routes        | No separate backend needed              |
| **Database**    | Supabase (PostgreSQL)     | Easy setup, auth included, free tier    |
| **Auth**        | NextAuth.js               | OAuth + email/password support          |
| **AI**          | OpenAI GPT-4 or Claude    | Best letter generation quality          |
| **File Parsing**| pdf-parse + mammoth       | Parse PDFs and DOCX files               |
| **Hosting**     | Vercel                    | Zero-config Next.js deployment          |

---

## 📋 Development Phases

### **Phase 1: Setup & Auth (Week 1)**
**Tasks:**
- [ ] Initialize Next.js project with TypeScript
- [ ] Setup Tailwind + shadcn/ui
- [ ] Create Supabase project & database
- [ ] Implement NextAuth.js (email + Google OAuth)
- [ ] Build landing page
- [ ] Build login/signup pages

**Deliverable:** Working authentication system

---

### **Phase 2: CV Upload & Parsing (Week 2)**
**Tasks:**
- [ ] Create CV upload form
- [ ] Implement file upload to Supabase Storage
- [ ] Build CV parsing logic (extract text from PDF/DOCX)
- [ ] Use AI to structure CV data (skills, experience)
- [ ] Store parsed data in `profiles` table
- [ ] Show preview of extracted data

**Deliverable:** Users can upload and see their parsed CV

---

### **Phase 3: Job Management (Week 3)**
**Tasks:**
- [ ] Build "Add Job" form
- [ ] Create jobs CRUD API routes
- [ ] Build dashboard with job list
- [ ] Implement status management
- [ ] Add filters (by status, date)
- [ ] Build job detail page

**Deliverable:** Users can add and track jobs

---

### **Phase 4: AI Letter Generation (Week 4)**
**Tasks:**
- [ ] Integrate OpenAI/Claude API
- [ ] Build letter generation logic
- [ ] Create letter editor component
- [ ] Implement regenerate feature
- [ ] Add copy/download/export options
- [ ] Store letters in database

**Deliverable:** AI generates editable cover letters

---

### **Phase 5: Polish & Launch (Weeks 5-6)**
**Tasks:**
- [ ] Add loading states everywhere
- [ ] Implement error handling
- [ ] Create basic analytics (total apps, response rate)
- [ ] Add email notifications (optional)
- [ ] Write documentation
- [ ] Deploy to Vercel
- [ ] Set up custom domain
- [ ] Beta testing with 10 users

**Deliverable:** Live, testable MVP

---

## 💰 MVP Monetization (Keep It Simple)

**Free Tier:**
- 3 AI-generated letters per month
- Unlimited job tracking
- Basic dashboard

**Pro Tier ($9.99/month):**
- Unlimited AI letters
- Priority support
- Export to PDF
- Early access to new features

**Implementation:** Use Stripe for payments (easy Next.js integration)

---

## 🎯 Success Metrics for MVP

After 30 days of beta testing, measure:

1. **Engagement:**
   - % of users who upload CV
   - % who generate at least 1 letter
   - Average letters per user

2. **Quality:**
   - User rating of AI letters (1-5 stars)
   - % of letters edited before use
   - Time saved vs manual writing

3. **Conversion:**
   - Free → Pro conversion rate
   - Retention after 1 month

4. **Validation:**
   - "Would you recommend this?" (NPS score)
   - "Would you pay $10/month?" (Yes/No)

**Success Threshold:** 
- 70%+ users generate at least 1 letter
- 4+ star average rating
- 15%+ willing to pay

---

## 🚀 Post-MVP Roadmap

Once MVP is validated, add:

**Version 1.1 (Month 3):**
- LinkedIn Easy Apply integration
- Job scraping from 1-2 platforms
- Email application tracking

**Version 1.2 (Month 4):**
- Browser extension
- Chrome autofill integration
- Interview preparation tools

**Version 2.0 (Month 6):**
- Mobile app
- Team/recruiter features
- Advanced analytics

---

## 🎓 Why This MVP Works

✅ **Buildable in 6 weeks** (solo or small team)  
✅ **No legal gray areas** (users apply manually)  
✅ **Delivers immediate value** (saves 30 min per application)  
✅ **Clear path to monetization** (freemium is proven)  
✅ **Easy to test and iterate** (just need 10-20 beta users)  
✅ **Scalable architecture** (can add features without rebuilding)

---

## 🏁 Next Steps

**This week:**
1. Set up development environment
2. Create Supabase project
3. Initialize Next.js app
4. Design database schema

**Ready to start building?** 

Let's create:
1. **Project structure** (folder organization)
2. **First component** (landing page)
3. **Auth system** (NextAuth setup)
4. **Database models** (Prisma/Drizzle schema)

Which would you like to tackle first?