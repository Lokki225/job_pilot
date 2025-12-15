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

const getBookmarkedPostsMock = vi.fn()
const unbookmarkPostMock = vi.fn()
const likePostMock = vi.fn()
const unlikePostMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getBookmarkedPosts: (...args: any[]) => getBookmarkedPostsMock(...args),
  unbookmarkPost: (...args: any[]) => unbookmarkPostMock(...args),
  likePost: (...args: any[]) => likePostMock(...args),
  unlikePost: (...args: any[]) => unlikePostMock(...args),
}))

describe('SavedPostsPage (/dashboard/community/hub/saved)', () => {
  it('loads saved posts and supports like + unsave', async () => {
    const user = userEvent.setup()

    getBookmarkedPostsMock.mockResolvedValue({
      data: [
        {
          id: 'post-1',
          userId: 'u1',
          type: 'DISCUSSION',
          title: 'Saved Post',
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
          hasBookmarked: true,
        },
      ],
      error: null,
    })

    likePostMock.mockResolvedValue({ data: { success: true }, error: null })
    unbookmarkPostMock.mockResolvedValue({ data: { success: true }, error: null })

    const SavedPostsPage = (await import('@/app/(dashboard)/dashboard/community/hub/saved/page')).default

    render(<SavedPostsPage />)

    await waitFor(() => expect(getBookmarkedPostsMock).toHaveBeenCalled())

    await screen.findByRole('heading', { name: 'Saved Posts' })
    expect(screen.getByText('Saved Post')).toBeInTheDocument()

    // Like
    await user.click(screen.getByRole('button', { name: 'Like post "Saved Post"' }))
    await waitFor(() => expect(likePostMock).toHaveBeenCalledWith('post-1'))

    // Unsave
    await user.click(screen.getByRole('button', { name: 'Unsave' }))
    await waitFor(() => expect(unbookmarkPostMock).toHaveBeenCalledWith('post-1'))

    // Post removed optimistically
    expect(screen.queryByText('Saved Post')).not.toBeInTheDocument()
  }, 25_000)
})
