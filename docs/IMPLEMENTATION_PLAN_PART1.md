# Job Pilot - Training Room & Study Room Implementation Plan
## Part 1: Overview, User Journey & Database Schema

---

## Table of Contents (Full Document)
- **Part 1** (this file): Overview, User Journey, Database Schema
- **Part 2**: Study Room Implementation
- **Part 3**: Training Room Implementation  
- **Part 4**: Company Research, Peer Practice, Calendar Integration
- **Part 5**: Success Stories, Gamification, Premium Tiers
- **Part 6**: Implementation Phases & Timeline

---

## Executive Summary

### What We're Building
Extending Job Pilot from a job search platform into a **complete career success platform**:

1. **Study Room (Book of Success)** - Structured learning curriculum for interview fundamentals
2. **Training Room** - AI-powered voice interview simulator with real-time feedback
3. **Company Research** - AI-powered (Pro) or user-provided (Free) company intelligence
4. **Peer Practice** - Match users for mock interviews with each other
5. **Calendar Integration** - Detect interviews and send smart prep reminders
6. **Success Stories** - Community-driven success stories

### Tech Stack Additions
- **Voice AI**: Web Speech API (recognition) + OpenAI TTS (speech)
- **AI Processing**: OpenAI GPT-4 for questions, analysis, feedback
- **Web Search**: Tavily API or similar for company research
- **Video Calls**: WebRTC or third-party integration for peer practice
- **Calendar**: Google Calendar OAuth API

---

## Core User Journey

### The Complete Journey (5 Stages)

| Stage | Feature | Status |
|-------|---------|--------|
| 1. **Discover** | Job search, recommendations | ✅ Existing |
| 2. **Apply** | Applications, cover letters | ✅ Existing |
| 3. **Learn** | Study Room (Book of Success) | 🆕 New |
| 4. **Practice** | Training Room (AI Interviews) | 🆕 New |
| 5. **Succeed** | Success tracking, stories | 🆕 New |

### User Flow Diagram

```
User signs up → Creates profile → Searches jobs → FIRST APPLICATION
                                                        ↓
                                    "Congratulations! 🎉 Let's prepare you."
                                                        ↓
                                              STUDY ROOM (Book of Success)
                                              - Complete foundational chapters
                                              - Learn STAR method, communication
                                                        ↓
                                              Completes 3+ chapters
                                                        ↓
                                    "You're ready to practice! 🌟"
                                                        ↓
                                              TRAINING ROOM
                                              - Voice AI interviews
                                              - Real-time feedback
                                                        ↓
                                              Application moves to "Interviewing"
                                                        ↓
                                              COMPANY PREP
                                              - AI research (Pro) or paste research (Free)
                                              - Company-specific questions
                                                        ↓
                                              Interview day → Calendar integration
                                                        ↓
                                              SUCCESS → Share story
```

### Journey Triggers

#### Trigger 1: First Application Submitted
```typescript
if (userStats.totalApplications === 1) {
  showCelebrationModal({
    title: "Congratulations on Your First Application! 🎉",
    message: "While you wait, let's prepare you for success.",
    primaryAction: { label: "Start Learning", href: "/dashboard/study" }
  });
}
```

#### Trigger 2: Interview Scheduled
```typescript
if (application.status === 'interviewing') {
  showPrepBanner({
    title: `Interview at ${company} in ${days} days!`,
    actions: [
      { label: "Company Deep Dive", href: `/dashboard/training/company/${id}` },
      { label: "Quick Practice", href: "/dashboard/training/quick" }
    ]
  });
}
```

#### Trigger 3: Study Room Completion
```typescript
if (studyProgress.completedChapters >= 3) {
  showReadyToTrainModal({
    title: "You've Mastered the Fundamentals! 🌟",
    message: "Time to practice with AI interviews.",
    primaryAction: { label: "Start Training", href: "/dashboard/training" }
  });
}
```

---

## Database Schema

### Study Room Tables

```sql
-- Chapters in Book of Success
CREATE TABLE study_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_minutes INT DEFAULT 60,
  icon VARCHAR(50),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lessons within chapters
CREATE TABLE study_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES study_chapters(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_minutes INT DEFAULT 15,
  content_type VARCHAR(50), -- 'text', 'video', 'interactive', 'quiz', 'practice'
  content JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES study_lessons(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'not_started',
  progress_percentage INT DEFAULT 0,
  quiz_score INT,
  time_spent_seconds INT DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Downloadable resources
CREATE TABLE study_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES study_lessons(id),
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  is_premium BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0
);
```

### Training Room Tables

```sql
-- Training sessions
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL, -- 'quick', 'full_mock', 'targeted', 'company_prep'
  company_id UUID REFERENCES company_research(id),
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  job_application_id UUID REFERENCES job_applications(id),
  focus_areas JSONB,
  difficulty VARCHAR(20) DEFAULT 'medium',
  total_questions INT DEFAULT 0,
  completed_questions INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  overall_score INT,
  status VARCHAR(50) DEFAULT 'in_progress',
  feedback_summary JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Questions within sessions
CREATE TABLE training_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT,
  answer_audio_url TEXT,
  answer_duration_seconds INT,
  ai_feedback JSONB,
  score INT,
  improvement_tips JSONB,
  keywords_used JSONB,
  keywords_missing JSONB,
  revised_answer TEXT,
  answered_at TIMESTAMP
);

-- User interview statistics
CREATE TABLE user_interview_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_sessions INT DEFAULT 0,
  total_questions_answered INT DEFAULT 0,
  total_practice_time_seconds INT DEFAULT 0,
  avg_session_score DECIMAL(5,2),
  highest_score INT DEFAULT 0,
  current_streak_days INT DEFAULT 0,
  longest_streak_days INT DEFAULT 0,
  last_practice_date DATE,
  weak_areas JSONB,
  strong_areas JSONB,
  score_history JSONB,
  skill_scores JSONB
);
```

### Company Research Tables

```sql
CREATE TABLE company_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_website TEXT,
  research_type VARCHAR(50) NOT NULL, -- 'ai_generated', 'user_provided'
  
  -- Company data
  mission_statement TEXT,
  core_values JSONB,
  company_culture TEXT,
  industry VARCHAR(100),
  company_size VARCHAR(50),
  main_products JSONB,
  key_achievements JSONB,
  recent_news JSONB,
  leadership_team JSONB,
  
  -- Interview intel
  common_interview_questions JSONB,
  interview_process TEXT,
  glassdoor_rating DECIMAL(2,1),
  glassdoor_summary TEXT,
  
  -- User notes
  user_notes TEXT,
  last_ai_refresh TIMESTAMP,
  
  UNIQUE(user_id, company_name)
);
```

### Peer Practice Tables

```sql
-- Peer practice profiles
CREATE TABLE peer_practice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_available BOOLEAN DEFAULT TRUE,
  preferred_times JSONB,
  timezone VARCHAR(100),
  target_roles JSONB,
  industries JSONB,
  experience_level VARCHAR(50),
  languages JSONB,
  bio TEXT,
  total_sessions INT DEFAULT 0,
  avg_rating DECIMAL(2,1)
);

-- Peer practice sessions
CREATE TABLE peer_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id),
  partner_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 30,
  meeting_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  focus_area VARCHAR(100),
  requester_rating INT,
  requester_feedback TEXT,
  partner_rating INT,
  partner_feedback TEXT
);
```

### Calendar Integration Tables

```sql
-- Calendar connections
CREATE TABLE user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  calendar_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP
);

-- Detected interviews
CREATE TABLE detected_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_connection_id UUID REFERENCES user_calendar_connections(id),
  calendar_event_id VARCHAR(255),
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  interview_type VARCHAR(100),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT,
  location TEXT,
  job_application_id UUID REFERENCES job_applications(id),
  company_research_id UUID REFERENCES company_research(id),
  reminder_5_days_sent BOOLEAN DEFAULT FALSE,
  reminder_2_days_sent BOOLEAN DEFAULT FALSE,
  reminder_1_day_sent BOOLEAN DEFAULT FALSE,
  reminder_2_hours_sent BOOLEAN DEFAULT FALSE,
  outcome VARCHAR(50)
);
```

### Success Stories & Gamification Tables

```sql
-- Success stories
CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  title VARCHAR(255),
  story TEXT NOT NULL,
  key_learnings JSONB,
  advice_for_others TEXT,
  total_applications INT,
  total_training_sessions INT,
  total_questions_practiced INT,
  avg_training_score INT,
  days_to_offer INT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50),
  category VARCHAR(50),
  points INT DEFAULT 10,
  requirement_type VARCHAR(50),
  requirement_value INT,
  is_secret BOOLEAN DEFAULT FALSE
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  unlocked_at TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

-- User XP
CREATE TABLE user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_xp INT DEFAULT 0,
  current_level INT DEFAULT 1,
  xp_to_next_level INT DEFAULT 100,
  weekly_xp INT DEFAULT 0,
  monthly_xp INT DEFAULT 0
);
```

### Indexes

```sql
CREATE INDEX idx_study_progress_user ON user_study_progress(user_id);
CREATE INDEX idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX idx_training_sessions_status ON training_sessions(status);
CREATE INDEX idx_company_research_user ON company_research(user_id);
CREATE INDEX idx_peer_sessions_users ON peer_practice_sessions(requester_id, partner_id);
CREATE INDEX idx_detected_interviews_user ON detected_interviews(user_id);
CREATE INDEX idx_detected_interviews_date ON detected_interviews(scheduled_at);
CREATE INDEX idx_success_stories_published ON success_stories(is_published);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

---

*Continue to Part 2: Study Room Implementation*
