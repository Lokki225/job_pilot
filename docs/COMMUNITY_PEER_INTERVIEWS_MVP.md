# Community Peer Interviews + Calendar (MVP)

This document consolidates the agreed MVP scope and phased implementation plan for:

- Community People Search + Public Community Profiles (logged-in only)
- Peer-to-peer Interviews (audio-first 1:1, chat fallback)
- Interview Kits (prep + live materials) + free mentor marketplace
- Calendar as a primary dashboard feature (recurring events, timezone, reminders)
- Mentor verification (Persona KYC Level 1 + admin approval)

## Product decisions (locked)

### Community discovery + profiles
- Discoverability: `discoverableInSearch = true` by default.
- Public community profile is visible only to authenticated users.
- Profile content visibility is simple toggles (show all / show none):
  - Posts: on/off
  - Stories: on/off

### Interview requests
- Request gating is configurable per user.
- Default: `allowInterviewRequestsFrom = MUTUAL_FOLLOWS`.
- Interviews support both:
  - Instant
  - Scheduled

### Interview room
- Room UX is training-room-style (not chat-room-style).
- Audio is the primary modality.
- Chat/messages are a fallback when connection is poor or by preference.
- Audio scope: strictly 1 interviewer + 1 candidate for now.
- Notes are local/private first (client-side), exportable.

### Feedback visibility
- Feedback is private by default.
- Public profile shows only aggregates (counts/averages/badges), not raw notes.

### Interview kits
- Kits are block-based, highly customizable.
- Kits have two parts:
  - Prep Pack (candidate-facing, before session)
  - Live Kit (interviewer workspace, during session)
- Any user can create private kits.
- Only mentors can publish public community kits.
- Marketplace is free-only.
- Rating/review is allowed only for users who completed a session using the kit.

### Mentor verification
- Mentor approval model:
  - Eligibility (automatic rules) -> Persona KYC (Level 1) -> Admin approval -> Verified Mentor
- Persona provider selected for KYC.
- Account deletion should purge verification references stored in JobPilot.

## Core UX surfaces

### 1) Community Hub
- Tabs:
  - Feed
  - Chat Rooms
  - People

### 2) People
- Search people by name/headline.
- Inline follow/unfollow.
- Navigate to a user community profile.

### 3) Community Profile (other users)
- Overview + stats + badges.
- Tabs:
  - Posts (if enabled)
  - Success Stories (if enabled and published)
  - Kits (mentor-only / if public)
  - Mentorship (optional visibility)

### 4) Peer Interview Scheduling
- Create interview request from a user profile.
- Instant: request -> accept -> room.
- Scheduled: propose/select a time -> room created + calendar event.

### 5) Interview Room (training-style)
- Left: kit content (agenda, questions, rubric blocks, checklist)
- Center: audio call controls (mute, reconnect, connection indicator)
- Right/bottom: chat fallback
- Local notes panel with export.

### 6) Calendar (primary feature)
- Accessible from header navbar.
- Month/Week/Day views.
- Click a cell to create:
  - Event
  - Reminder
  - Interview session
- Supports recurring events.
- Uses timezone.
- Reminder channels:
  - In-app notifications
  - Optional ICS alarms for external calendars

## Data model (high-level)

### Community
- `community_profile_settings`
  - `userId`
  - `discoverableInSearch` (default true)
  - `allowInterviewRequestsFrom` (default MUTUAL_FOLLOWS)
  - `showPostsToCommunity` / `showStoriesToCommunity`

### Interviews
- `interview_requests`
  - requester/target, mode (instant/scheduled), status, proposedTimes
- `interview_sessions`
  - scheduledAt/start/end, status
- `interview_room_roles`
  - (roomId, userId, role)

Chat fallback reuses existing chat tables:
- `chat_rooms`, `chat_room_members`, `chat_messages`, `chat_message_reactions`

### Interview kits
- `interview_kits`
  - ownerId, visibility, blocksJson, prepBlocksJson
- `interview_kit_ratings`
  - kitId, sessionId, raterId, rating, review

### Calendar
- `calendar_events`
  - userId, type, start/end, timezone, recurrenceRule
- `calendar_event_reminders`
  - eventId, remindAt, channel, status

### Mentor KYC
- `mentor_kyc_verifications`
  - userId, status, personaInquiryId, timestamps
- Admin approval fields (approvedAt/approvedBy)

## Phased implementation plan

### Phase 1 — Community discovery + profiles
- Add `community_profile_settings` table.
- Server actions:
  - Search people
  - Load public community profile (respect toggles)
- UI:
  - Community Hub People tab
  - Public community profile page

### Phase 2 — Calendar (primary feature)
- Add `calendar_events` + `calendar_event_reminders`.
- Calendar UI in navbar + create/edit flows.
- Cron/in-app reminder engine using existing notification dispatcher.
- Extend ICS feed to include peer interview sessions and/or calendar events.

### Phase 3 — Peer interviews (audio-first) + chat fallback
- Add interview request/session tables.
- Create interview room page styled after training session.
- Implement 1:1 WebRTC audio call with realtime signaling.
- Enable chat fallback using existing chat tables.
- Local notes + export.

### Phase 4 — Kits marketplace + mentor verification
- Implement kits editor (block-based) + snapshotting.
- Marketplace browse/search + publish flow (mentor-only).
- Rating gated by completed sessions using the kit.
- KYC Level 1 integration + webhook + admin approval panel.

### Phase 5 — Trainning Room
- we'll create 3 to 5 AI Personas (Human type profile, eg: Paul Lead Tech at "an fictive Company", etc...) to be used in trainning room as interviewers. they'll config the questions for each trainning session.
- So the users could choose their Persona when creating a trainning room or Company prep pack.
- each personna need to be as unique as possible

## Open items to decide later
- Final eligibility thresholds for applying to mentor.
- Recurring event rule format details.
- Whether job application interview dates are derived (virtual) or duplicated into calendar events.
- When Prep Pack becomes visible (immediately on acceptance vs a time window before session).
