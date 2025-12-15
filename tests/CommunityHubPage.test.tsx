import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getCommunityPostsMock = vi.fn()
const createPostMock = vi.fn()
const likePostMock = vi.fn()
const unlikePostMock = vi.fn()
const bookmarkPostMock = vi.fn()
const unbookmarkPostMock = vi.fn()
const getChatRoomsMock = vi.fn()
const getOrCreateCommunityProfileMock = vi.fn()
const seedDefaultChatRoomsMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getCommunityPosts: (...args: any[]) => getCommunityPostsMock(...args),
  createPost: (...args: any[]) => createPostMock(...args),
  likePost: (...args: any[]) => likePostMock(...args),
  unlikePost: (...args: any[]) => unlikePostMock(...args),
  bookmarkPost: (...args: any[]) => bookmarkPostMock(...args),
  unbookmarkPost: (...args: any[]) => unbookmarkPostMock(...args),
  getChatRooms: (...args: any[]) => getChatRoomsMock(...args),
  getOrCreateCommunityProfile: (...args: any[]) => getOrCreateCommunityProfileMock(...args),
  seedDefaultChatRooms: (...args: any[]) => seedDefaultChatRoomsMock(...args),
}))

describe('CommunityHubPage (/dashboard/community/hub)', () => {
  it('loads initial data and can create a post', async () => {
    const user = userEvent.setup()

    getCommunityPostsMock.mockResolvedValue({ data: [], error: null })
    getChatRoomsMock.mockResolvedValue({ data: [{ id: 'r1', name: 'General', description: null, slug: 'general', type: 'PUBLIC', category: 'general', icon: '💬', memberCount: 1, isActive: true, isMember: true, unreadCount: 0 }], error: null })
    getOrCreateCommunityProfileMock.mockResolvedValue({
      data: {
        id: 'p1',
        userId: 'u1',
        reputationPoints: 0,
        level: 1,
        postsCount: 0,
        commentsCount: 0,
        helpfulVotes: 0,
        successStoriesShared: 0,
        isModerator: false,
        isExpert: false,
        isMentor: false,
        badges: [],
        bio: null,
        favoriteTopics: [],
        user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
      },
      error: null,
    })

    createPostMock.mockResolvedValue({ data: { id: 'post-1' }, error: null })

    const CommunityHubPage = (await import('@/app/(dashboard)/dashboard/community/hub/page')).default

    render(<CommunityHubPage />)

    await screen.findByRole('heading', { name: 'Community Hub' }, { timeout: 5_000 })

    // Open dialog and create post
    const createButtons = screen.getAllByRole('button', { name: 'Create Post' })
    await user.click(createButtons[0]!)

    await user.type(await screen.findByPlaceholderText('What would you like to share?', undefined, { timeout: 5_000 }), 'Hello community')

    await user.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() =>
      expect(createPostMock).toHaveBeenCalledWith({
        type: 'DISCUSSION',
        title: undefined,
        content: 'Hello community',
        tags: undefined,
      })
    )
  }, 25_000)

  it('renders a post and can like + save using aria-labels', async () => {
    const user = userEvent.setup()

    getCommunityPostsMock.mockResolvedValue({
      data: [
        {
          id: 'post-1',
          userId: 'u1',
          type: 'DISCUSSION',
          title: 'My post',
          content: 'Some content',
          tags: ['interview'],
          likesCount: 0,
          commentsCount: 0,
          viewsCount: 0,
          isPinned: false,
          isFeatured: false,
          createdAt: '2020-01-01T00:00:00.000Z',
          authorName: 'Jane',
          authorAvatar: null,
          hasLiked: false,
          hasBookmarked: false,
        },
      ],
      error: null,
    })

    getChatRoomsMock.mockResolvedValue({ data: [{ id: 'r1', name: 'General', description: null, slug: 'general', type: 'PUBLIC', category: 'general', icon: '💬', memberCount: 1, isActive: true, isMember: true, unreadCount: 0 }], error: null })
    getOrCreateCommunityProfileMock.mockResolvedValue({ data: null, error: null })

    likePostMock.mockResolvedValue({ data: { success: true }, error: null })
    bookmarkPostMock.mockResolvedValue({ data: { success: true }, error: null })

    const CommunityHubPage = (await import('@/app/(dashboard)/dashboard/community/hub/page')).default

    render(<CommunityHubPage />)

    await screen.findByText('My post', undefined, { timeout: 5_000 })

    await user.click(screen.getByRole('button', { name: 'Like post' }))
    await waitFor(() => expect(likePostMock).toHaveBeenCalledWith('post-1'))

    await user.click(screen.getByRole('button', { name: 'Save post' }))
    await waitFor(() => expect(bookmarkPostMock).toHaveBeenCalledWith('post-1'))
  }, 25_000)
})
