# Job Application Schema Updates

## Overview
Updated Prisma schema to support comprehensive job application tracking and search functionality.

---

## 📊 Schema Changes

### 1. **Updated Enums**

#### `ApplicationStatus` (Updated)
```prisma
enum ApplicationStatus {
  WISHLIST      // Saved/bookmarked jobs (new default)
  APPLIED       // Application submitted
  INTERVIEWING  // In interview process
  OFFERED       // Received job offer
  REJECTED      // Application rejected
  ACCEPTED      // Offer accepted
  WITHDRAWN     // User withdrew application (new)
}
```

**Changes:**
- Changed default from `PENDING` to `WISHLIST`
- Added Kanban-friendly statuses
- Added `WITHDRAWN` status

#### `JobPlatform` (Updated)
```prisma
enum JobPlatform {
  LINKEDIN
  FIVERR
  UPWORK
  INDEED
  GLASSDOOR      // New
  ADZUNA         // New - API source
  JSEARCH        // New - API source
  THE_MUSE       // New - API source
  COMPANY_WEBSITE // New
  REFERRAL       // New
  PASTED         // New - Manually pasted job
  OTHER
}
```

**Changes:**
- Added API sources (ADZUNA, JSEARCH, THE_MUSE)
- Added manual sources (COMPANY_WEBSITE, REFERRAL, PASTED)
- Added GLASSDOOR

---

### 2. **JobApplication Model (Comprehensive Update)**

#### New Fields Added:

**Core Job Details:**
- `location` - Job location
- `jobType` - Full-time, Part-time, Contract, Remote, Hybrid
- `salary` - Salary range as string
- `description` - Full job description (Text)
- `requirements` - Job requirements (Text)

**Application Tracking:**
- `appliedDate` - When user actually applied (nullable)
- `notes` - User's notes about the job (Text)

**External Job Data (API Integration):**
- `externalJobId` - Job ID from external source
- `externalSource` - API source name (adzuna, jsearch, etc.)
- `externalData` - Raw JSON data from API

**Contact & Follow-up:**
- `contactName` - Recruiter/hiring manager name
- `contactEmail` - Contact email
- `contactPhone` - Contact phone

**Interview Tracking:**
- `interviewDate` - Scheduled interview date
- `interviewNotes` - Notes about interviews (Text)

**Offer Details:**
- `offerAmount` - Actual offer amount
- `offerDeadline` - Offer acceptance deadline

**Metadata:**
- `isPasted` - True if manually pasted (default: false)
- `isFavorite` - Star/favorite flag (default: false)
- `reminderDate` - Follow-up reminder date

#### Indexes Added:
```prisma
@@index([userId])
@@index([status])
@@index([userId, status])
```

---

### 3. **JobSearchPreference Model (Enhanced)**

#### New Fields Added:

**Search Keywords:**
- `keywords` - Additional search keywords (e.g., ["React", "Node.js"])

**Salary:**
- `currency` - Currency code (default: "USD")

**Experience:**
- `yearsExperience` - Minimum years of experience

**Industry & Company:**
- `industries` - Preferred industries
- `companySize` - Company size preferences ["startup", "small", "medium", "large", "enterprise"]
- `excludeCompanies` - Companies to exclude from search

**Search Settings:**
- `autoSearch` - Auto-search for matching jobs (default: false)
- `notifyOnMatch` - Send notifications for matches (default: true)
- `searchFrequency` - Search frequency (default: "daily") - daily, weekly, manual

---

## 🎯 Use Cases Supported

### 1. **Job Application Tracking (Kanban Board)**
- Track jobs through stages: Wishlist → Applied → Interviewing → Offered → Accepted/Rejected
- Store all job details, contacts, and notes
- Set reminders for follow-ups
- Track interview dates and notes

### 2. **API Job Search Integration**
- Store external job IDs and source information
- Cache raw API data for reference
- Support multiple job platforms (Adzuna, JSearch, The Muse)

### 3. **Manual Job Entry (Paste Feature)**
- Mark jobs as `isPasted = true`
- Source as `PASTED` platform
- Full job details from parsed text

### 4. **Smart Job Matching**
- Comprehensive preferences for personalized search
- Industry and company size filters
- Exclude specific companies
- Auto-search and notification settings

### 5. **Contact & Follow-up Management**
- Store recruiter/hiring manager details
- Set reminder dates
- Track interview schedules
- Manage offer deadlines

---

## 🔄 Migration

Run the following command to apply changes:
```bash
npx prisma migrate dev --name update_job_application_and_preferences
```

Then regenerate Prisma Client:
```bash
npx prisma generate
```

---

## 📝 Next Steps

1. ✅ Schema updated
2. ⏳ Run migration
3. ⏳ Create server actions for CRUD operations
4. ⏳ Build job search service with API integrations
5. ⏳ Create job parser for pasted content
6. ⏳ Build Kanban board UI
7. ⏳ Implement job search interface

---

## 🎨 UI Components Needed

### Job Applications Page
- Kanban board with drag-and-drop
- Application cards with status badges
- Quick actions (edit, delete, move)
- Filters (status, date, company)

### Job Search Page
- Search bar with filters
- Job cards with save/apply actions
- Job details modal
- Paste job modal

### Job Details Page
- Full job information
- Application tracking timeline
- Notes section
- Contact information
- Interview schedule

---

## 🔐 Data Privacy Notes

- All job application data is user-specific (userId indexed)
- Cascade delete on user deletion
- External API data stored as JSON for reference only
- No sensitive data stored in plain text (use encryption for sensitive notes if needed)
