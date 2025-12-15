import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

const markAsReadMock = vi.fn()
const markAllAsReadMock = vi.fn()
const deleteNotificationMock = vi.fn()

vi.mock('@/lib/actions/notifications.action', () => ({
  markAsRead: (...args: any[]) => markAsReadMock(...args),
  markAllAsRead: (...args: any[]) => markAllAsReadMock(...args),
  deleteNotification: (...args: any[]) => deleteNotificationMock(...args),
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  toast: (args: any) => toastMock(args),
}))

const markAsReadLocalMock = vi.fn()
const markAllAsReadLocalMock = vi.fn()
const removeNotificationMock = vi.fn()

vi.mock('@/lib/hooks/use-realtime-notifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: [
      {
        id: 'n-1',
        type: 'story_liked',
        title: 'New Like',
        message: 'Someone liked your story',
        link: '/dashboard/community',
        isRead: false,
        createdAt: '2020-01-01T00:00:00.000Z',
      },
      {
        id: 'n-2',
        type: 'system',
        title: 'System update',
        message: 'Maintenance window',
        link: null,
        isRead: true,
        createdAt: '2020-01-01T00:00:00.000Z',
      },
    ],
    unreadCount: 1,
    isLoading: false,
    markAsRead: (id: string) => markAsReadLocalMock(id),
    markAllAsRead: () => markAllAsReadLocalMock(),
    removeNotification: (id: string) => removeNotificationMock(id),
  }),
}))

describe('NotificationsPage (/dashboard/notifications)', () => {
  it('filters unread, marks read on click, navigates, marks all read, and deletes', async () => {
    const user = userEvent.setup()

    const NotificationsPage = (await import('@/app/(dashboard)/dashboard/notifications/page')).default

    render(<NotificationsPage />)

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('New Like')).toBeInTheDocument()
    expect(screen.getByText('System update')).toBeInTheDocument()

    // filter to unread only
    await user.click(screen.getByRole('button', { name: 'Unread (1)' }))
    expect(screen.getByText('New Like')).toBeInTheDocument()
    expect(screen.queryByText('System update')).not.toBeInTheDocument()

    // mark all read
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    await waitFor(() => expect(markAllAsReadMock).toHaveBeenCalled())
    expect(markAllAsReadLocalMock).toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalled()

    // click notification card (marks read + navigates)
    await user.click(screen.getByText('New Like'))
    await waitFor(() => expect(markAsReadMock).toHaveBeenCalledWith('n-1'))
    expect(markAsReadLocalMock).toHaveBeenCalledWith('n-1')
    expect(pushMock).toHaveBeenCalledWith('/dashboard/community')

    // delete notification
    await user.click(screen.getByRole('button', { name: 'Delete notification "New Like"' }))
    await waitFor(() => expect(deleteNotificationMock).toHaveBeenCalledWith('n-1'))
    expect(removeNotificationMock).toHaveBeenCalledWith('n-1')
    expect(toastMock).toHaveBeenCalled()
  }, 25_000)
})
