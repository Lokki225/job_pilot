# Job Pilot - Implementation Plan
## Part 5: Success Stories, Gamification & Premium Tiers

---

## Success Stories Feature

### Purpose
Showcase user success to inspire others and build social proof. After a user lands a job, prompt them to share their story.

### Success Story Flow

```
User updates application to "Offered" or "Accepted"
    ↓
Celebration modal: "Congratulations! 🎉"
    ↓
[Share Your Story] button
    ↓
Story submission form with auto-populated stats
    ↓
Admin review (optional)
    ↓
Published to community feed
```

### Story Data Structure

```typescript
interface SuccessStory {
  id: string;
  userId: string;
  
  // Job details
  jobTitle: string;
  companyName: string;
  industry: string;
  location?: string;
  salaryRange?: string; // Optional
  
  // The story
  title: string; // User's headline
  story: string; // Full narrative
  keyLearnings: string[]; // Array of takeaways
  adviceForOthers: string;
  
  // Auto-populated stats from Job Pilot usage
  stats: {
    totalApplications: number;
    totalTrainingSessions: number;
    totalStudyTimeMinutes: number;
    totalQuestionsPracticed: number;
    avgTrainingScore: number;
    daysToOffer: number; // From first app to offer
    coverLettersGenerated: number;
  };
  
  // Display settings
  isAnonymous: boolean;
  displayName?: string;
  avatarUrl?: string;
  
  // Status
  isFeatured: boolean;
  isPublished: boolean;
  
  // Engagement
  viewCount: number;
  likeCount: number;
  
  createdAt: Date;
}
```

### Success Stories Components

```
components/success-stories/
├── SuccessStoriesFeed.tsx        # Main feed
├── StoryCard.tsx                 # Story preview
├── StoryDetail.tsx               # Full story view
├── StoryFilters.tsx              # Filter by industry, role
├── StorySubmissionForm.tsx       # Submit new story
├── StatsDisplay.tsx              # Auto-populated stats
├── FeaturedStories.tsx           # Featured carousel
├── LikeButton.tsx                # Like interaction
└── ShareStoryModal.tsx           # Trigger modal
```

### Routes

```
app/(dashboard)/dashboard/success-stories/
├── page.tsx                      # Stories feed
├── [storyId]/
│   └── page.tsx                  # Story detail
└── submit/
    └── page.tsx                  # Submit story
```

### Server Actions

```typescript
// lib/actions/success-stories.action.ts

export async function getSuccessStories(params?: {
  industry?: string;
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<{ data: SuccessStory[]; total: number }>;

export async function getStoryById(storyId: string): Promise<SuccessStory>;

export async function submitSuccessStory(params: {
  jobTitle: string;
  companyName: string;
  industry: string;
  title: string;
  story: string;
  keyLearnings: string[];
  adviceForOthers: string;
  isAnonymous: boolean;
  salaryRange?: string;
}): Promise<{ data: SuccessStory; error: string | null }>;

export async function likeStory(storyId: string): Promise<{ success: boolean }>;
export async function unlikeStory(storyId: string): Promise<{ success: boolean }>;

// Auto-populate user stats for story
export async function getUserSuccessStats(): Promise<{
  totalApplications: number;
  totalTrainingSessions: number;
  totalStudyTimeMinutes: number;
  totalQuestionsPracticed: number;
  avgTrainingScore: number;
}>;
```

---

## Gamification System

### XP & Levels

```typescript
// XP rewards for activities
const XP_REWARDS = {
  // Study Room
  lesson_complete: 25,
  quiz_pass: 50,
  chapter_complete: 100,
  study_room_complete: 500,
  
  // Training Room
  training_session_complete: 30,
  perfect_score: 100, // 90+ on session
  weak_area_improved: 75,
  daily_practice: 20,
  
  // Milestones
  first_application: 50,
  first_interview: 100,
  job_offer: 500,
  
  // Community
  success_story_submitted: 200,
  peer_practice_complete: 50,
  
  // Streaks
  streak_7_days: 100,
  streak_30_days: 500
};

// Level thresholds
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Beginner' },
  { level: 2, xpRequired: 100, title: 'Job Seeker' },
  { level: 3, xpRequired: 300, title: 'Applicant' },
  { level: 4, xpRequired: 600, title: 'Interviewer' },
  { level: 5, xpRequired: 1000, title: 'Candidate' },
  { level: 6, xpRequired: 1500, title: 'Contender' },
  { level: 7, xpRequired: 2200, title: 'Professional' },
  { level: 8, xpRequired: 3000, title: 'Expert' },
  { level: 9, xpRequired: 4000, title: 'Master' },
  { level: 10, xpRequired: 5500, title: 'Interview Champion' }
];
```

### Achievements

```typescript
const ACHIEVEMENTS = [
  // Study Room
  {
    slug: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '📚',
    points: 10,
    category: 'study'
  },
  {
    slug: 'book_worm',
    title: 'Book Worm',
    description: 'Complete all Study Room chapters',
    icon: '🎓',
    points: 200,
    category: 'study'
  },
  {
    slug: 'quiz_master',
    title: 'Quiz Master',
    description: 'Score 100% on 5 quizzes',
    icon: '🧠',
    points: 100,
    category: 'study'
  },
  
  // Training Room
  {
    slug: 'first_practice',
    title: 'Practice Makes Perfect',
    description: 'Complete your first training session',
    icon: '🎯',
    points: 10,
    category: 'training'
  },
  {
    slug: 'star_student',
    title: 'STAR Student',
    description: 'Use STAR method perfectly 10 times',
    icon: '⭐',
    points: 50,
    category: 'training'
  },
  {
    slug: 'interview_master',
    title: 'Interview Master',
    description: 'Score 90+ on 5 consecutive sessions',
    icon: '👑',
    points: 150,
    category: 'training'
  },
  {
    slug: 'voice_pro',
    title: 'Voice Pro',
    description: 'Complete 20 voice-based sessions',
    icon: '🎤',
    points: 75,
    category: 'training'
  },
  {
    slug: 'company_expert',
    title: 'Company Expert',
    description: 'Research 10 companies',
    icon: '🏢',
    points: 50,
    category: 'training'
  },
  
  // Streaks
  {
    slug: 'streak_7',
    title: 'Week Warrior',
    description: 'Practice 7 days in a row',
    icon: '🔥',
    points: 50,
    category: 'milestone'
  },
  {
    slug: 'streak_30',
    title: 'Monthly Champion',
    description: 'Practice 30 days in a row',
    icon: '🏆',
    points: 200,
    category: 'milestone'
  },
  
  // Community
  {
    slug: 'peer_helper',
    title: 'Peer Helper',
    description: 'Complete 5 peer practice sessions',
    icon: '🤝',
    points: 75,
    category: 'community'
  },
  {
    slug: 'storyteller',
    title: 'Storyteller',
    description: 'Share your success story',
    icon: '📖',
    points: 100,
    category: 'community'
  },
  
  // Milestones
  {
    slug: 'first_offer',
    title: 'Dream Achieved',
    description: 'Receive your first job offer',
    icon: '🎉',
    points: 500,
    category: 'milestone',
    isSecret: true
  }
];
```

### Gamification Service

```typescript
// lib/services/gamification.service.ts

export async function awardXP(
  userId: string,
  amount: number,
  source: string,
  sourceId?: string
): Promise<{ newTotal: number; leveledUp: boolean; newLevel?: number }> {
  // Get current XP
  const { data: userXP } = await adminSupabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  const currentXP = userXP?.total_xp || 0;
  const newTotal = currentXP + amount;
  
  // Check for level up
  const currentLevel = calculateLevel(currentXP);
  const newLevel = calculateLevel(newTotal);
  const leveledUp = newLevel > currentLevel;
  
  // Update XP
  await adminSupabase
    .from('user_xp')
    .upsert({
      user_id: userId,
      total_xp: newTotal,
      current_level: newLevel,
      xp_to_next_level: getXPToNextLevel(newLevel, newTotal),
      weekly_xp: (userXP?.weekly_xp || 0) + amount,
      updated_at: new Date().toISOString()
    });
  
  // Log transaction
  await adminSupabase
    .from('xp_transactions')
    .insert({
      user_id: userId,
      amount,
      source,
      source_id: sourceId
    });
  
  // Send notification if leveled up
  if (leveledUp) {
    await createNotification({
      userId,
      type: 'level_up',
      title: `Level Up! 🎉`,
      message: `You've reached Level ${newLevel}: ${LEVELS[newLevel - 1].title}!`
    });
  }
  
  return { newTotal, leveledUp, newLevel: leveledUp ? newLevel : undefined };
}

export async function checkAndUnlockAchievements(
  userId: string,
  trigger: string
): Promise<Achievement[]> {
  const unlockedAchievements: Achievement[] = [];
  
  // Get user's current achievements
  const { data: userAchievements } = await adminSupabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  
  const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id));
  
  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.slug)) continue;
    
    const isEarned = await checkAchievementCriteria(userId, achievement, trigger);
    
    if (isEarned) {
      // Unlock achievement
      await adminSupabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.slug,
          unlocked_at: new Date().toISOString()
        });
      
      // Award XP
      await awardXP(userId, achievement.points, 'achievement', achievement.slug);
      
      // Send notification
      await createNotification({
        userId,
        type: 'achievement_unlocked',
        title: `Achievement Unlocked! ${achievement.icon}`,
        message: `${achievement.title}: ${achievement.description}`
      });
      
      unlockedAchievements.push(achievement);
    }
  }
  
  return unlockedAchievements;
}
```

### Gamification Components

```
components/gamification/
├── XPDisplay.tsx                 # Current XP and level
├── LevelProgress.tsx             # Progress to next level
├── AchievementGrid.tsx           # All achievements
├── AchievementCard.tsx           # Single achievement
├── AchievementUnlockedModal.tsx  # Unlock celebration
├── StreakDisplay.tsx             # Current streak
├── LeaderboardCard.tsx           # Weekly/monthly leaders
└── XPGainAnimation.tsx           # +XP animation
```

---

## Premium Tier Strategy

### Tier Comparison

| Feature | Free | Pro ($29/mo) |
|---------|------|--------------|
| **Study Room** | Chapters 1-2 | All 7 chapters |
| **Training Sessions** | 3/week | Unlimited |
| **Company Research** | Manual entry | AI-powered |
| **AI Feedback** | Basic | Detailed + revised answers |
| **Peer Practice** | 2/month | Unlimited |
| **Calendar Integration** | ❌ | ✅ |
| **Success Story Features** | View only | Submit + featured |
| **Export Reports** | ❌ | PDF/DOCX |
| **Priority AI** | Standard | Faster responses |
| **Support** | Community | Email priority |

### Premium Check Service

```typescript
// lib/services/premium.service.ts

interface PremiumStatus {
  isPremium: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  expiresAt?: Date;
  features: {
    studyRoomFull: boolean;
    unlimitedTraining: boolean;
    aiCompanyResearch: boolean;
    detailedFeedback: boolean;
    unlimitedPeerPractice: boolean;
    calendarIntegration: boolean;
    exportReports: boolean;
  };
}

export async function getUserPremiumStatus(userId: string): Promise<PremiumStatus> {
  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (!subscription) {
    return {
      isPremium: false,
      plan: 'free',
      features: {
        studyRoomFull: false,
        unlimitedTraining: false,
        aiCompanyResearch: false,
        detailedFeedback: false,
        unlimitedPeerPractice: false,
        calendarIntegration: false,
        exportReports: false
      }
    };
  }
  
  return {
    isPremium: true,
    plan: subscription.plan,
    expiresAt: new Date(subscription.current_period_end),
    features: {
      studyRoomFull: true,
      unlimitedTraining: true,
      aiCompanyResearch: true,
      detailedFeedback: true,
      unlimitedPeerPractice: true,
      calendarIntegration: true,
      exportReports: true
    }
  };
}

// Check if user can access feature
export async function canAccessFeature(
  userId: string,
  feature: keyof PremiumStatus['features']
): Promise<boolean> {
  const status = await getUserPremiumStatus(userId);
  return status.features[feature];
}

// Check usage limits for free tier
export async function checkUsageLimit(
  userId: string,
  limitType: 'training_sessions' | 'peer_practice'
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const status = await getUserPremiumStatus(userId);
  
  if (status.isPremium) {
    return { allowed: true, used: 0, limit: Infinity };
  }
  
  const limits = {
    training_sessions: { weekly: 3 },
    peer_practice: { monthly: 2 }
  };
  
  const limit = limits[limitType];
  const period = limitType === 'training_sessions' ? 'week' : 'month';
  
  const used = await getUsageCount(userId, limitType, period);
  
  return {
    allowed: used < (limit.weekly || limit.monthly || 0),
    used,
    limit: limit.weekly || limit.monthly || 0
  };
}
```

### Paywall Components

```
components/premium/
├── PremiumBadge.tsx              # Pro badge
├── UpgradePrompt.tsx             # Upgrade CTA
├── FeatureGate.tsx               # Wrap premium features
├── UsageLimitAlert.tsx           # "3/3 sessions used"
├── PricingCard.tsx               # Plan comparison
├── UpgradeModal.tsx              # Checkout modal
└── PremiumFeatureList.tsx        # Feature comparison
```

### Feature Gate Component

```typescript
// components/premium/FeatureGate.tsx

'use client';

import { useEffect, useState } from 'react';
import { canAccessFeature } from '@/lib/services/premium.service';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkAccess();
  }, [feature]);
  
  async function checkAccess() {
    const allowed = await canAccessFeature(feature);
    setHasAccess(allowed);
  }
  
  if (hasAccess === null) return null; // Loading
  
  if (!hasAccess) {
    return fallback || <UpgradePrompt feature={feature} />;
  }
  
  return <>{children}</>;
}
```

---

*Continue to Part 6: Implementation Phases & Timeline*
