import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useRealtimeNotifications } from '@/lib/hooks/use-realtime-notifications'

const getNotificationsMock = vi.fn()
const getUnreadCountMock = vi.fn()

vi.mock('@/lib/actions/notifications.action', () => ({
  getNotifications: (...args: any[]) => getNotificationsMock(...args),
  getUnreadCount: (...args: any[]) => getUnreadCountMock(...args),
}))

type Handler = (payload: any) => void

let insertHandler: Handler | undefined
let updateHandler: Handler | undefined
let deleteHandler: Handler | undefined

const removeChannelMock = vi.fn()

const channelMock: any = {
  on: vi.fn((_: any, filter: any, cb: Handler) => {
    if (filter?.event === 'INSERT') insertHandler = cb
    if (filter?.event === 'UPDATE') updateHandler = cb
    if (filter?.event === 'DELETE') deleteHandler = cb
    return channelMock
  }),
  subscribe: vi.fn((cb: (status: string) => void) => {
    cb('SUBSCRIBED')
    return channelMock
  }),
}

const supabaseMock: any = {
  auth: {
    getUser: vi.fn(),
  },
  channel: vi.fn(() => channelMock),
  removeChannel: (...args: any[]) => removeChannelMock(...args),
}

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => supabaseMock,
}))

function Harness(props: {
  onNewNotification?: (n: any) => void
  onToastNotification?: (n: any) => void
}) {
  const { notifications, unreadCount, isConnected, isLoading } = useRealtimeNotifications({
    userId: 'u-1',
    onNewNotification: props.onNewNotification,
    onToastNotification: props.onToastNotification,
  })

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="connected">{String(isConnected)}</div>
      <div data-testid="unread">{String(unreadCount)}</div>
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>{n.title}</li>
        ))}
      </ul>
    </div>
  )
}

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    insertHandler = undefined
    updateHandler = undefined
    deleteHandler = undefined

    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'n-1',
          type: 'xp_earned',
          title: 'XP Earned',
          message: 'You earned XP',
          link: null,
          isRead: false,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    })
    getUnreadCountMock.mockResolvedValue({ data: 1, error: null })
  })

  it('loads initial notifications and subscribes', async () => {
    render(<Harness />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('connected')).toHaveTextContent('true')
    expect(screen.getByTestId('unread')).toHaveTextContent('1')
    expect(screen.getByText('XP Earned')).toBeInTheDocument()

    expect(supabaseMock.channel).toHaveBeenCalledWith('notifications_u-1')
  })

  it('handles INSERT/UPDATE/DELETE events and toast callback', async () => {
    const onNewNotification = vi.fn()
    const onToastNotification = vi.fn()

    const rendered = render(
      <Harness onNewNotification={onNewNotification} onToastNotification={onToastNotification} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      insertHandler?.({
        new: {
          id: 'n-2',
          type: 'level_up',
          title: 'Level Up!',
          message: 'You leveled up',
          link: '/dashboard',
          isRead: false,
          createdAt: '2025-01-01T00:01:00.000Z',
        },
      })
    })

    expect(screen.getByText('Level Up!')).toBeInTheDocument()
    expect(screen.getByTestId('unread')).toHaveTextContent('2')
    expect(onNewNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-2', type: 'level_up' })
    )
    expect(onToastNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-2', type: 'level_up' })
    )

    await act(async () => {
      updateHandler?.({
        old: { id: 'n-2', isRead: false },
        new: { id: 'n-2', isRead: true },
      })
    })

    expect(screen.getByTestId('unread')).toHaveTextContent('1')

    await act(async () => {
      deleteHandler?.({
        old: { id: 'n-1', isRead: false },
      })
    })

    expect(screen.queryByText('XP Earned')).not.toBeInTheDocument()
    expect(screen.getByTestId('unread')).toHaveTextContent('0')

    rendered.unmount()
    expect(removeChannelMock).toHaveBeenCalled()
  }, 25_000)
})
