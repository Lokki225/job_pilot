# Project Hardening & Next Features Roadmap

This document captures a practical, launch-ready hardening plan and a shortlist of high-impact features to build next.

## 1) Security hardening (highest ROI)

### A) Supabase RLS audit
- Ensure every table that contains user data has RLS enabled.
- Ensure policies scope data to the current user (e.g. `user_id = auth.uid()`).
- Double-check there are no overly broad `select` policies.

Tables to verify typically include (project-dependent):
- `job_applications`
- `notifications`
- recommendations cache tables
- mentorship/community tables

### B) Server Action input validation (Zod everywhere)
- Validate and normalize inputs for all server actions.
- Add defensive limits:
  - max lengths for strings (query, location, keywords)
  - reasonable array sizes (skills, keywords)
  - acceptable enums (job type, date posted)

### C) Rate limiting / abuse protection
Prioritize rate limiting for:
- Job search (external API usage/cost)
- AI endpoints (cost)
- Email sending / auto-apply (sensitive)

A simple approach can be DB-backed throttling per user per time window.

### D) Security headers (low-risk “stability first”)
Add standard headers:
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security` (production)

Avoid deploying a strict CSP until you inventory all third-party sources.

### E) Secrets hygiene
- Ensure API keys never ship to the browser.
- Keep secrets in server-only env vars.
- Ensure `.env*` patterns are correct and nothing sensitive is committed.

## 2) Reliability & observability

### A) Error tracking
- Add Sentry (or equivalent) for both server + client.
- Tag errors with feature area (jobs, recommendations, cover letters, mentorship).

### B) Structured logs
- Add structured logs for key flows:
  - job search provider failures
  - recommendation refresh runs
  - application creation / status changes

### C) Background job monitoring (if applicable)
- Track “last run / last error” for scheduled tasks.

## 3) Testing & CI

### A) Unit tests (cheap + high signal)
- Recommendation scoring
- Deduplication logic
- Similar-jobs scoring

### B) E2E tests (Playwright)
Cover the critical user journeys:
- search jobs
- save/track job -> appears in applications
- open job details -> similar jobs -> track -> navigates to new `[id]`

### C) CI pipeline
Run on every PR:
- `typecheck`
- unit tests
- e2e tests (optional but ideal)

## 4) High-impact product features to add next

### A) Saved searches + job alerts
- Save filters (query/location/remote/type/salary)
- Daily/weekly “new matches” notifications (in-app + optional email)
- “Why this matched” explanations

### B) Application workflow automation
- Follow-up reminders (3/7/14 days after applying)
- Calendar export (ICS) for interviews + reminders
- Email templates (follow-up / thank-you) with AI-assisted personalization

### C) Analytics dashboard
- Conversion funnel: saved -> applied -> interviewing -> offer
- Time-to-next-stage metrics
- Best-performing sources

### D) Data portability
- Export/import applications (CSV/JSON)

## Recommended implementation order
1. Security headers + basic hardening (low-risk)
2. RLS audit + server-action validation + rate limiting
3. Sentry + logs
4. Tests + CI
5. Saved searches + alerts
