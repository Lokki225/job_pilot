# Job Management System - Implementation Roadmap

## 📋 Overview
Complete implementation plan for the job management system with application tracking, job search, and smart matching features.

---

## 🎯 Implementation Phases

### **Phase 1: Backend Foundation** (Priority: HIGH)

#### Task 1.1: Job Application Server Actions
**File:** `lib/actions/job-application.action.ts`

**Functions to implement:**
- ✅ `createJobApplication(userId, data)` - Create new job application
- ✅ `listJobApplications(userId, filters?)` - List user's applications with optional filters
- ✅ `getJobApplication(id)` - Get single application details
- ✅ `updateJobApplication(id, data)` - Update application details
- ✅ `deleteJobApplication(id)` - Delete application
- ✅ `updateApplicationStatus(id, status)` - Update status (for Kanban)
- ✅ `bulkImportFromPaste(jobText, userId)` - Parse and create from pasted text
- ✅ `toggleFavorite(id)` - Toggle favorite flag
- ✅ `setReminder(id, date)` - Set follow-up reminder

**Validation:**
- Zod schemas for all inputs
- Required fields: jobTitle, company
- Status enum validation

---

#### Task 1.2: Job Preferences Server Actions
**File:** `lib/actions/job-preferences.action.ts`

**Functions to implement:**
- ✅ `getJobPreferences(userId)` - Get user preferences
- ✅ `upsertJobPreferences(userId, data)` - Create or update preferences
- ✅ `updateSearchSettings(userId, settings)` - Update auto-search settings
- ✅ `addExcludedCompany(userId, company)` - Add to blacklist
- ✅ `removeExcludedCompany(userId, company)` - Remove from blacklist

---

#### Task 1.3: Job Parser Utility
**File:** `lib/utils/job-parser.ts`

**Functions to implement:**
- ✅ `parseJobPosting(text: string)` - Main parser function
- ✅ `extractJobTitle(text)` - Extract job title
- ✅ `extractCompany(text)` - Extract company name
- ✅ `extractLocation(text)` - Extract location
- ✅ `extractSalary(text)` - Extract salary info
- ✅ `extractJobType(text)` - Extract job type (full-time, etc.)
- ✅ `extractDescription(text)` - Extract description
- ✅ `extractRequirements(text)` - Extract requirements
- ✅ `extractUrl(text)` - Extract application URL

**Parsing Strategy:**
- Regex patterns for common job posting formats
- Keywords detection (e.g., "Job Title:", "Company:", "Salary:")
- URL extraction for application links
- Fallback to basic text splitting

---

### **Phase 2: Job Search API Integration** (Priority: HIGH)

#### Task 2.1: Adzuna API Provider
**File:** `lib/services/job-search/providers/adzuna.ts`

**Functions to implement:**
- ✅ `searchAdzuna(params)` - Search Adzuna API
- ✅ `getAdzunaJobDetails(jobId)` - Get job details
- ✅ `normalizeAdzunaResults(data)` - Normalize to common format

**API Details:**
- Endpoint: `https://api.adzuna.com/v1/api/jobs/us/search/1`
- Auth: app_id + app_key
- Free tier: 250 calls/month
- Response format: JSON with results array

---

#### Task 2.2: JSearch API Provider
**File:** `lib/services/job-search/providers/jsearch.ts`

**Functions to implement:**
- ✅ `searchJSearch(params)` - Search JSearch API
- ✅ `getJSearchJobDetails(jobId)` - Get job details
- ✅ `normalizeJSearchResults(data)` - Normalize to common format

**API Details:**
- Endpoint: `https://jsearch.p.rapidapi.com/search`
- Auth: RapidAPI key
- Free tier: 150 requests/month
- Aggregates from Indeed, LinkedIn, Glassdoor

---

#### Task 2.3: Shared Types
**File:** `lib/services/job-search/providers/types.ts`

**Types to define:**
```typescript
interface SearchParams {
  keywords: string;
  location?: string;
  jobType?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  limit?: number;
}

interface NormalizedJob {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  jobType?: string;
  salary?: string;
  description: string;
  requirements?: string;
  url: string;
  postedDate?: Date;
  rawData: any;
}

interface SearchResult {
  jobs: NormalizedJob[];
  total: number;
  source: string;
}
```

---

#### Task 2.4: Job Search Aggregator
**File:** `lib/services/job-search/aggregator.ts`

**Functions to implement:**
- ✅ `aggregateSearchResults(results)` - Combine results from multiple sources
- ✅ `deduplicateJobs(jobs)` - Remove duplicate jobs
- ✅ `rankJobs(jobs, preferences)` - Rank by relevance
- ✅ `filterJobs(jobs, filters)` - Apply user filters

---

#### Task 2.5: Main Job Search Service
**File:** `lib/services/job-search/index.ts`

**Functions to implement:**
- ✅ `searchJobs(params)` - Main search function (queries all APIs)
- ✅ `getJobDetails(jobId, source)` - Get detailed job info
- ✅ `searchJobsMatchingProfile(userId)` - Profile-based search
- ✅ `saveJobToApplications(userId, job)` - Save search result as application

---

### **Phase 3: Frontend Pages** (Priority: HIGH)

#### Task 3.1: Main Jobs Dashboard
**File:** `app/(dashboard)/dashboard/jobs/page.tsx`

**Features:**
- Overview stats (total applications, by status)
- Recent applications list
- Quick actions (search, add job, view all)
- Status distribution chart
- Upcoming interviews/reminders

**Components:**
- Stats cards
- Recent applications table
- Quick action buttons
- Mini Kanban preview

---

#### Task 3.2: Job Search Page
**File:** `app/(dashboard)/dashboard/jobs/search/page.tsx`

**Features:**
- Search bar with keyword input
- Advanced filters sidebar:
  - Location
  - Job type
  - Salary range
  - Experience level
  - Remote options
- Job results grid/list
- Save to applications button
- Apply externally button
- Pagination

**Components:**
- JobSearchBar
- JobFilters
- JobCard (grid/list view)
- Pagination controls

---

#### Task 3.3: Applications Kanban Board
**File:** `app/(dashboard)/dashboard/jobs/applications/page.tsx`

**Features:**
- Drag-and-drop Kanban board
- Columns: Wishlist, Applied, Interviewing, Offered, Rejected, Accepted
- Application cards with:
  - Job title, company
  - Status badge
  - Applied date
  - Quick actions (edit, delete, view)
- Filters (date range, company, source)
- Search within applications

**Components:**
- ApplicationKanban
- ApplicationCard
- KanbanColumn
- Drag-drop handlers (react-beautiful-dnd)

---

#### Task 3.4: Job Details Page
**File:** `app/(dashboard)/dashboard/jobs/[id]/page.tsx`

**Features:**
- Full job information
- Application timeline
- Status update dropdown
- Notes section (editable)
- Contact information
- Interview schedule
- Offer details (if applicable)
- Edit/Delete actions

**Sections:**
- Job header (title, company, location)
- Job details (description, requirements)
- Application tracking
- Notes and reminders
- Contact information
- Actions panel

---

#### Task 3.5: Add/Paste Job Page
**File:** `app/(dashboard)/dashboard/jobs/new/page.tsx`

**Features:**
- Two modes:
  1. Manual entry form
  2. Paste job posting text
- Form fields:
  - Job title, company (required)
  - Location, job type, salary
  - Description, requirements
  - Application URL
  - Source
- Parse button for pasted text
- Preview parsed data
- Save as wishlist/applied

**Components:**
- JobForm
- JobPasteModal
- ParsedDataPreview

---

### **Phase 4: Reusable Components** (Priority: MEDIUM)

#### Task 4.1: JobCard Component
**File:** `components/jobs/JobCard.tsx`

**Props:**
- job: Job object
- view: 'grid' | 'list'
- onSave: (job) => void
- onApply: (job) => void
- onView: (job) => void

**Features:**
- Job title, company, location
- Salary (if available)
- Job type badge
- Posted date
- Save/Apply buttons
- Hover actions

---

#### Task 4.2: JobSearchBar Component
**File:** `components/jobs/JobSearchBar.tsx`

**Props:**
- onSearch: (params) => void
- initialValues?: SearchParams
- showFilters?: boolean

**Features:**
- Keyword input
- Location input
- Quick filters (job type, remote)
- Advanced filters toggle
- Search button
- Clear filters

---

#### Task 4.3: ApplicationKanban Component
**File:** `components/jobs/ApplicationKanban.tsx`

**Props:**
- applications: Application[]
- onStatusChange: (id, status) => void
- onEdit: (id) => void
- onDelete: (id) => void

**Features:**
- Drag-and-drop columns
- Application cards
- Status badges
- Quick actions
- Empty state per column

---

#### Task 4.4: JobPasteModal Component
**File:** `components/jobs/JobPasteModal.tsx`

**Props:**
- isOpen: boolean
- onClose: () => void
- onParse: (text) => void

**Features:**
- Large textarea for pasting
- Parse button
- Loading state
- Preview parsed data
- Edit parsed fields
- Save button

---

#### Task 4.5: JobDetailsModal Component
**File:** `components/jobs/JobDetailsModal.tsx`

**Props:**
- job: Job object
- isOpen: boolean
- onClose: () => void
- onSave: (job) => void

**Features:**
- Full job details
- Scrollable content
- Save to applications
- Apply externally
- Close button

---

#### Task 4.6: ApplicationCard Component
**File:** `components/jobs/ApplicationCard.tsx`

**Props:**
- application: Application
- onEdit: (id) => void
- onDelete: (id) => void
- onView: (id) => void
- draggable?: boolean

**Features:**
- Job title, company
- Status badge
- Applied date
- Notes preview
- Quick actions menu
- Favorite star
- Drag handle (if draggable)

---

#### Task 4.7: JobFilters Component
**File:** `components/jobs/JobFilters.tsx`

**Props:**
- filters: FilterState
- onChange: (filters) => void
- onReset: () => void

**Features:**
- Location multi-select
- Job type checkboxes
- Salary range slider
- Experience level select
- Remote options
- Apply/Reset buttons

---

### **Phase 5: Advanced Features** (Priority: MEDIUM)

#### Task 5.1: Profile-Based Job Matching
**File:** `lib/services/job-search/matcher.ts`

**Functions:**
- ✅ `buildSearchQueryFromProfile(userId)` - Generate search params from profile
- ✅ `scoreJobMatch(job, profile)` - Calculate match score
- ✅ `getRecommendedJobs(userId, limit)` - Get top N matches

**Matching Logic:**
- Skills matching
- Experience level matching
- Location preferences
- Job type preferences
- Salary expectations

---

#### Task 5.2: Job Preferences Management UI
**File:** `app/(dashboard)/dashboard/jobs/preferences/page.tsx`

**Features:**
- Job titles input (tags)
- Locations input (tags)
- Salary range slider
- Experience level select
- Job types checkboxes
- Remote options
- Industries multi-select
- Company size preferences
- Excluded companies list
- Auto-search toggle
- Notification settings
- Save preferences button

---

#### Task 5.3: Notifications System
**File:** `lib/services/notifications.ts`

**Functions:**
- ✅ `notifyJobMatch(userId, job)` - Notify on matching job
- ✅ `notifyReminder(userId, application)` - Remind about follow-up
- ✅ `notifyInterviewSchedule(userId, application)` - Interview reminder

---

### **Phase 6: Testing & Polish** (Priority: LOW)

#### Task 6.1: Unit Tests
- Test job parser with various formats
- Test API normalizers
- Test aggregator deduplication
- Test server actions validation

#### Task 6.2: Integration Tests
- Test full search flow
- Test application CRUD
- Test Kanban drag-drop
- Test paste and parse flow

#### Task 6.3: UI/UX Polish
- Loading states
- Error handling
- Empty states
- Success messages
- Responsive design
- Accessibility (a11y)

---

## 📦 Dependencies to Install

```bash
# Drag and drop for Kanban
npm install @hello-pangea/dnd

# Date handling
npm install date-fns

# Form validation
npm install react-hook-form @hookform/resolvers

# Rich text editor (for notes)
npm install @tiptap/react @tiptap/starter-kit

# Charts (for dashboard)
npm install recharts
```

---

## 🔑 Environment Variables Needed

```env
# Adzuna API
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key

# JSearch (RapidAPI)
RAPIDAPI_KEY=your_rapidapi_key

# Optional: The Muse API (no key needed)
# Optional: GitHub Jobs API (no key needed)
```

---

## 🎨 Design System

### Colors
- **Wishlist:** Blue (#3B82F6)
- **Applied:** Yellow (#F59E0B)
- **Interviewing:** Purple (#8B5CF6)
- **Offered:** Green (#10B981)
- **Rejected:** Red (#EF4444)
- **Accepted:** Emerald (#059669)

### Icons (Lucide)
- Search: `Search`
- Add: `Plus`
- Edit: `Edit2`
- Delete: `Trash2`
- Favorite: `Star`
- Reminder: `Bell`
- Interview: `Calendar`
- Offer: `DollarSign`
- External Link: `ExternalLink`
- Drag: `GripVertical`

---

## 📊 Success Metrics

- [ ] User can search jobs from multiple sources
- [ ] User can paste job posting and auto-parse
- [ ] User can track applications through Kanban
- [ ] User can set reminders and track interviews
- [ ] User can get personalized job recommendations
- [ ] All CRUD operations work correctly
- [ ] Drag-and-drop is smooth and intuitive
- [ ] API rate limits are respected
- [ ] Error handling is comprehensive
- [ ] UI is responsive and accessible

---

## 🚀 Deployment Checklist

- [ ] Database migration applied
- [ ] Environment variables set
- [ ] API keys configured
- [ ] Supabase storage bucket created (if needed)
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (PostHog/Mixpanel)
- [ ] Rate limiting implemented
- [ ] Caching strategy in place
- [ ] SEO meta tags added
- [ ] Performance optimized

---

## 📝 Notes

- Start with Phase 1 (Backend) to ensure solid foundation
- Test each API provider individually before aggregating
- Use mock data for UI development while APIs are being integrated
- Implement rate limiting to avoid API quota exhaustion
- Cache API results to reduce costs
- Consider adding webhook support for real-time job alerts
- Plan for future integrations (LinkedIn, Glassdoor direct APIs)
