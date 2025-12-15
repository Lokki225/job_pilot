import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'general' }),
  useRouter: () => ({ push: pushMock }),
}))

const getChatRoomBySlugMock = vi.fn()
const getChatMessagesMock = vi.fn()
const sendChatMessageMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getChatRoomBySlug: (...args: any[]) => getChatRoomBySlugMock(...args),
  getChatMessages: (...args: any[]) => getChatMessagesMock(...args),
  sendChatMessage: (...args: any[]) => sendChatMessageMock(...args),
  editChatMessage: vi.fn(),
  deleteChatMessage: vi.fn(),
  addMessageReaction: vi.fn(),
  removeMessageReaction: vi.fn(),
  joinChatRoom: vi.fn(),
  leaveChatRoom: vi.fn(),
}))

vi.mock('@supabase/ssr', () => {
  const channelObj: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  return {
    createBrowserClient: vi.fn(() => ({
      channel: vi.fn(() => channelObj),
      removeChannel: vi.fn(),
    })),
  }
})

describe('ChatRoomPage (/dashboard/community/hub/chat/[slug])', () => {
  it('loads room + messages and can send a message (smoke)', async () => {
    ;(Element.prototype as any).scrollIntoView = vi.fn()

    const user = userEvent.setup()

    getChatRoomBySlugMock.mockResolvedValue({
      data: {
        id: 'room-1',
        name: 'General',
        description: 'General chat',
        slug: 'general',
        type: 'PUBLIC',
        category: 'general',
        icon: '💬',
        memberCount: 3,
        isActive: true,
        isMember: true,
        unreadCount: 0,
      },
      error: null,
    })

    getChatMessagesMock
      .mockResolvedValueOnce({
        data: [
          {
            id: 'm-1',
            roomId: 'room-1',
            userId: 'u-1',
            replyToId: null,
            content: 'Hello',
            attachments: [],
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: '2020-01-01T00:00:00.000Z',
            authorName: 'Jane',
            authorAvatar: null,
            isMine: false,
            reactions: [],
            replyTo: null,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'm-1',
            roomId: 'room-1',
            userId: 'u-1',
            replyToId: null,
            content: 'Hello',
            attachments: [],
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: '2020-01-01T00:00:00.000Z',
            authorName: 'Jane',
            authorAvatar: null,
            isMine: false,
            reactions: [],
            replyTo: null,
          },
          {
            id: 'm-2',
            roomId: 'room-1',
            userId: 'u-me',
            replyToId: null,
            content: 'My message',
            attachments: [],
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: '2020-01-01T00:01:00.000Z',
            authorName: 'Me',
            authorAvatar: null,
            isMine: true,
            reactions: [],
            replyTo: null,
          },
        ],
        error: null,
      })

    sendChatMessageMock.mockResolvedValue({ data: { id: 'm-2' }, error: null })

    const ChatRoomPage = (await import(
      '@/app/(dashboard)/dashboard/community/hub/chat/[slug]/page'
    )).default

    render(<ChatRoomPage />)

    await waitFor(() => expect(getChatRoomBySlugMock).toHaveBeenCalledWith('general'))
    await waitFor(() => expect(getChatMessagesMock).toHaveBeenCalledWith('room-1'))

    expect(screen.getByText('General')).toBeInTheDocument()
    expect(await screen.findByText('Hello')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Type a message...'), 'My message')
    await user.click(screen.getAllByRole('button').at(-1)!)

    await waitFor(() => expect(sendChatMessageMock).toHaveBeenCalledWith('room-1', 'My message', undefined))

    // refresh messages after send
    await waitFor(() => expect(getChatMessagesMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('My message')).toBeInTheDocument()
  }, 25_000)
})
