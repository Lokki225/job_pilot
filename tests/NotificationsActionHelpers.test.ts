import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => {
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: null, error: null })),
    eq: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  }

  return {
    adminSupabase: {
      from: vi.fn(() => chain),
    },
    createClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })),
      },
    })),
  }
})

const notifyAchievementMock = vi.fn()
const notifyLevelUpMock = vi.fn()
const notifyInterviewReminderMock = vi.fn()
const notifyApplicationUpdateMock = vi.fn()
const notifyStoryLikedMock = vi.fn()
const notifyStreakMilestoneMock = vi.fn()

vi.mock('@/lib/services/event-dispatcher', () => ({
  notifyAchievement: (...args: any[]) => notifyAchievementMock(...args),
  notifyLevelUp: (...args: any[]) => notifyLevelUpMock(...args),
  notifyInterviewReminder: (...args: any[]) => notifyInterviewReminderMock(...args),
  notifyApplicationUpdate: (...args: any[]) => notifyApplicationUpdateMock(...args),
  notifyStoryLiked: (...args: any[]) => notifyStoryLikedMock(...args),
  notifyStreakMilestone: (...args: any[]) => notifyStreakMilestoneMock(...args),
}))

describe('notifications.action notify* helpers', () => {
  it('wires through to event-dispatcher helpers with expected mapping', async () => {
    const {
      notifyAchievementUnlock,
      notifyLevelUp,
      notifyStoryLiked,
      notifyStreakMilestone,
      notifyApplicationUpdate,
      notifyInterviewReminder,
    } = await import('@/lib/actions/notifications.action')

    await notifyAchievementUnlock('u-1', 'First Win', '🏆')
    expect(notifyAchievementMock).toHaveBeenCalledWith('u-1', 'First Win', '🏆')

    await notifyLevelUp('u-1', 2, 'Explorer')
    expect(notifyLevelUpMock).toHaveBeenCalledWith('u-1', 2, 'Explorer')

    await notifyStoryLiked('u-1', 'My Story', 's-1')
    expect(notifyStoryLikedMock).toHaveBeenCalledWith('u-1', 'My Story', 's-1')

    await notifyStreakMilestone('u-1', 10)
    expect(notifyStreakMilestoneMock).toHaveBeenCalledWith('u-1', 10)

    await notifyApplicationUpdate('u-1', 'Engineer', 'Acme', 'app-1', 'status_change', 'Updated')
    expect(notifyApplicationUpdateMock).toHaveBeenCalledWith('u-1', 'Engineer', 'Acme', 'app-1', 'UPDATED', 'Updated')

    await notifyApplicationUpdate('u-1', 'Engineer', 'Acme', 'app-1', 'interview_scheduled', 'Scheduled')
    expect(notifyApplicationUpdateMock).toHaveBeenCalledWith('u-1', 'Engineer', 'Acme', 'app-1', 'INTERVIEWING', 'Scheduled')

    const d = new Date('2025-01-01T10:00:00.000Z')
    await notifyInterviewReminder('u-1', 'Engineer', 'Acme', 'app-1', d, 24)
    expect(notifyInterviewReminderMock).toHaveBeenCalledWith('u-1', 'Engineer', 'Acme', 'app-1', d, 24)
  })
})
