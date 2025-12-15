import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppEvent, EVENT_META } from '@/lib/types/app-events'

const insertsByTable = vi.hoisted(() => ({
  notifications: [] as any[],
  event_logs: [] as any[],
}))

vi.mock('@/lib/supabase/server', () => {
  return {
    adminSupabase: {
      from: vi.fn((table: string) => {
        if (table === 'notification_preferences') {
          const prefQuery: any = {
            select: vi.fn(() => prefQuery),
            eq: vi.fn(() => prefQuery),
            limit: vi.fn(async () => ({ data: [] })),
          }
          return prefQuery
        }

        if (table === 'notifications') {
          const listQuery: any = {
            select: vi.fn(() => listQuery),
            eq: vi.fn(() => listQuery),
            order: vi.fn(() => listQuery),
            limit: vi.fn(async () => ({ data: [] })),
            delete: vi.fn(() => deleteQuery),
          }

          const deleteQuery: any = {
            eq: vi.fn(() => deleteQuery),
            in: vi.fn(async () => ({ data: null, error: null })),
          }

          return {
            // createInAppNotification
            insert: vi.fn((payload: any) => {
              insertsByTable.notifications.push(payload)
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: { id: 'n-1' }, error: null })),
                })),
              }
            }),

            // pruneNotifications
            select: listQuery.select,
            eq: listQuery.eq,
            order: listQuery.order,
            limit: listQuery.limit,
            delete: listQuery.delete,
          }
        }

        if (table === 'event_logs') {
          return {
            insert: vi.fn(async (payload: any) => {
              insertsByTable.event_logs.push(payload)
              return { data: null, error: null }
            }),
          }
        }

        // default noop chain
        return {
          insert: vi.fn(async () => ({ data: null, error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [] })),
            })),
          })),
        }
      }),
    },
    createClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })),
      },
    })),
  }
})

describe('Notification event definitions', () => {
  it('has EVENT_META for every AppEvent', () => {
    for (const event of Object.values(AppEvent)) {
      expect(EVENT_META[event]).toBeTruthy()
    }
  })
})

describe('event-dispatcher notify* helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertsByTable.notifications.length = 0
    insertsByTable.event_logs.length = 0
  })

  it('notifyAchievement emits ACHIEVEMENT_UNLOCKED with correct payload', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyAchievement('u-1', 'First Win', '🏆')

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual({
      userId: 'u-1',
      type: AppEvent.ACHIEVEMENT_UNLOCKED,
      title: EVENT_META[AppEvent.ACHIEVEMENT_UNLOCKED].defaultTitle,
      message: '🏆 You earned "First Win"',
      link: '/dashboard/community/leaderboard',
      metadata: { achievementTitle: 'First Win', achievementIcon: '🏆' },
    })
  })

  it('notifyLevelUp emits LEVEL_UP with correct payload', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyLevelUp('u-1', 3, 'Explorer')

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual({
      userId: 'u-1',
      type: AppEvent.LEVEL_UP,
      title: EVENT_META[AppEvent.LEVEL_UP].defaultTitle,
      message: 'Congratulations! You reached Level 3: Explorer',
      link: '/dashboard',
      metadata: { newLevel: 3, levelTitle: 'Explorer' },
    })
  })

  it('notifyStoryLiked emits STORY_LIKED with correct payload', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyStoryLiked('u-1', 'My Story', 's-1')

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual({
      userId: 'u-1',
      type: AppEvent.STORY_LIKED,
      title: EVENT_META[AppEvent.STORY_LIKED].defaultTitle,
      message: 'Your success story "My Story" received a new like',
      link: '/dashboard/community/s-1',
      metadata: { storyTitle: 'My Story', storyId: 's-1' },
    })
  })

  it('notifyStreakMilestone emits STREAK_MILESTONE with correct payload', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyStreakMilestone('u-1', 7)

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual({
      userId: 'u-1',
      type: AppEvent.STREAK_MILESTONE,
      title: EVENT_META[AppEvent.STREAK_MILESTONE].defaultTitle,
      message: "Amazing! You've practiced 7 days in a row",
      link: '/dashboard',
      metadata: { streakDays: 7 },
    })
  })

  it('notifyApplicationUpdate maps status to correct event', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyApplicationUpdate('u-1', 'Engineer', 'Acme', 'app-1', 'OFFERED', 'Offer received')

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual(
      expect.objectContaining({
        userId: 'u-1',
        type: AppEvent.APPLICATION_OFFER_RECEIVED,
        title: EVENT_META[AppEvent.APPLICATION_OFFER_RECEIVED].defaultTitle,
        message: 'Engineer at Acme: Offer received',
        link: '/dashboard/jobs/app-1',
        metadata: {
          jobTitle: 'Engineer',
          company: 'Acme',
          applicationId: 'app-1',
          newStatus: 'OFFERED',
        },
      })
    )
  })

  it('notifyInterviewReminder selects 1h vs 24h reminder event', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    const d = new Date('2025-01-01T10:00:00.000Z')

    await dispatcher.notifyInterviewReminder('u-1', 'Engineer', 'Acme', 'app-1', d, 1)

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual(
      expect.objectContaining({
        userId: 'u-1',
        type: AppEvent.INTERVIEW_REMINDER_1H,
        title: 'Interview in 1 hour 📅',
        message: expect.stringContaining('Engineer at Acme - '),
        link: '/dashboard/training?mode=interview&jobId=app-1',
        metadata: expect.objectContaining({
          applicationId: 'app-1',
          interviewDate: d.toISOString(),
          hoursUntil: 1,
        }),
      })
    )

    insertsByTable.notifications.length = 0
    await dispatcher.notifyInterviewReminder('u-1', 'Engineer', 'Acme', 'app-1', d, 24)

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual(
      expect.objectContaining({
        userId: 'u-1',
        type: AppEvent.INTERVIEW_REMINDER_24H,
        title: 'Interview tomorrow 📅',
      })
    )
  })

  it('notifyWelcome emits WELCOME with correct payload', async () => {
    const dispatcher = await import('@/lib/services/event-dispatcher')

    await dispatcher.notifyWelcome('u-1', 'Jane')

    expect(insertsByTable.notifications).toHaveLength(1)
    expect(insertsByTable.notifications[0]).toEqual({
      userId: 'u-1',
      type: AppEvent.WELCOME,
      title: EVENT_META[AppEvent.WELCOME].defaultTitle,
      message: "Welcome Jane! Let's start your job search journey.",
      link: '/dashboard/onboarding/welcome',
      metadata: { userName: 'Jane' },
    })
  })
})
