import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ postId: 'post-1' }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getPostByIdMock = vi.fn()
const likePostMock = vi.fn()
const unlikePostMock = vi.fn()
const bookmarkPostMock = vi.fn()
const unbookmarkPostMock = vi.fn()
const addPostCommentMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getPostById: (...args: any[]) => getPostByIdMock(...args),
  likePost: (...args: any[]) => likePostMock(...args),
  unlikePost: (...args: any[]) => unlikePostMock(...args),
  bookmarkPost: (...args: any[]) => bookmarkPostMock(...args),
  unbookmarkPost: (...args: any[]) => unbookmarkPostMock(...args),
  addPostComment: (...args: any[]) => addPostCommentMock(...args),
  deletePostComment: vi.fn(),
  likePostComment: vi.fn(),
  unlikePostComment: vi.fn(),
  reportPost: vi.fn(),
}))

describe('PostDetailPage (/dashboard/community/hub/post/[postId])', () => {
  it('loads a post and supports like, save, and commenting (refreshes after comment)', async () => {
    const user = userEvent.setup()

    getPostByIdMock
      .mockResolvedValueOnce({
        data: {
          id: 'post-1',
          userId: 'u1',
          type: 'DISCUSSION',
          title: 'My Post',
          content: 'Hello world',
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
          attachments: [],
          isHighlighted: false,
          sharesCount: 0,
          comments: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'post-1',
          userId: 'u1',
          type: 'DISCUSSION',
          title: 'My Post',
          content: 'Hello world',
          tags: ['interview'],
          likesCount: 0,
          commentsCount: 1,
          viewsCount: 0,
          isPinned: false,
          isFeatured: false,
          createdAt: '2020-01-01T00:00:00.000Z',
          authorName: 'Jane',
          authorAvatar: null,
          hasLiked: false,
          hasBookmarked: false,
          attachments: [],
          isHighlighted: false,
          sharesCount: 0,
          comments: [
            {
              id: 'c-1',
              postId: 'post-1',
              userId: 'u2',
              parentId: null,
              content: 'Nice post!',
              likesCount: 0,
              isEdited: false,
              createdAt: '2020-01-01T00:00:00.000Z',
              authorName: 'Alex',
              authorAvatar: null,
              hasLiked: false,
              isMine: false,
              replies: [],
            },
          ],
        },
        error: null,
      })

    likePostMock.mockResolvedValue({ data: { success: true }, error: null })
    bookmarkPostMock.mockResolvedValue({ data: { success: true }, error: null })

    addPostCommentMock.mockResolvedValue({ data: { id: 'c-1' }, error: null })

    const PostDetailPage = (await import(
      '@/app/(dashboard)/dashboard/community/hub/post/[postId]/page'
    )).default

    render(<PostDetailPage />)

    await waitFor(() => expect(getPostByIdMock).toHaveBeenCalledWith('post-1'))

    expect(await screen.findByText('My Post')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Like post' }))
    await waitFor(() => expect(likePostMock).toHaveBeenCalledWith('post-1'))

    await user.click(screen.getByRole('button', { name: 'Save post' }))
    await waitFor(() => expect(bookmarkPostMock).toHaveBeenCalledWith('post-1'))

    await user.type(screen.getByPlaceholderText('Write a comment...'), 'Nice post!')
    await user.click(screen.getByRole('button', { name: 'Post Comment' }))

    await waitFor(() => expect(addPostCommentMock).toHaveBeenCalledWith('post-1', 'Nice post!', undefined))

    // page reloads the post after adding a comment
    await waitFor(() => expect(getPostByIdMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Nice post!')).toBeInTheDocument()
  }, 25_000)
})
