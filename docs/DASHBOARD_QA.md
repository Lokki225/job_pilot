# Dashboard QA Checklist

This document is used to validate the end-user dashboard flows tab-by-tab.

## Jobs

### Jobs Search (`/dashboard/jobs`)

#### Recommendations (Top Picks)
- Verify Top Picks load without errors.
- Verify Refresh (if available) updates the refreshed timestamp and does not break the page.
- Verify saving a recommended job updates UI state and does not crash.
- Verify collapsing/expanding Top Picks works.

#### Search
- Search by query only.
- Search by query + location.
- Use filters:
  - Job type
  - Date posted
  - Remote only
  - Sort
- Verify results render `JobCard` correctly.
- Stress test rate limit by running many searches quickly:
  - Expected error: `Too many requests. Please try again shortly.`

#### Job card actions
- **Apply Now**
  - Expected: opens external apply URL (new tab) when `applyUrl` exists.
- **View Details**
  - Expected: opens the job details modal or details view without navigation issues.
- **Save (bookmark)**
  - Expected: toggles state and persists correctly if wired.

#### Saved Searches
- Save a search after running it (must not allow saving when no search has been executed).
- Apply a saved search and confirm filters match.
- Edit saved search (name, enabled, notifyOnMatch, frequency).
- Delete a saved search.

#### Paste Job
- Paste a job post and create a tracked job.
- Expected: a new job application is created and can be found in Applications.

### Applications (`/dashboard/jobs/applications`)

#### Load + views
- Verify applications load.
- Switch between Kanban and List view.
- Verify search filters results (title/company).

#### Kanban
- Drag and drop across columns.
- Verify optimistic UI and server persistence.
- Set to OFFERED/ACCEPTED and confirm congratulations modal appears.

#### Actions
- Toggle favorite.
- Delete application:
  - Expected: styled confirmation modal (not browser confirm).
  - Confirm deletes and shows toast.
  - Cancel leaves item untouched.

#### Header links
- Analytics button: `/dashboard/analytics` should not 404.
- Calendar export: `/api/calendar/ics` should download.
- Import/Export: `/dashboard/jobs/applications/portability` should not 404.

### Job Details (`/dashboard/jobs/[id]`)

#### Load
- Load an application via click from Applications.
- Verify the job is accessible only to its owner.

#### Edit + Save
- Edit core fields (title/company/location/url/notes/status).
- Save and reload page.

#### Interview Date
- Set interview date.
- Change interview date.
- Clear interview date.
- Expected: reminders are updated correctly (old reminder cleared, new reminder created).

#### Cover Letters + Auto-apply
- Generate cover letter.
- View existing cover letters.
- Open Auto-apply modal.
  - If email is not configured, show warning.
  - If configured, sending should create an email application record and update status to APPLIED if needed.

## Cover Letters

(TODO)

## Study Room

(TODO)

## Training Room

(TODO)

## Calendar

(TODO)

## Community

(TODO)

## Notifications

(TODO)

## Settings

(TODO)

## Profile (Sidebar bottom)

(TODO)
