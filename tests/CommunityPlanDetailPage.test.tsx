import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useParams: () => ({ planId: 'plan-1' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: any) => {
    const { src, alt, ...rest } = props
    return <img src={typeof src === 'string' ? src : ''} alt={alt} {...rest} />
  },
}))

const getPublicStudyPlanMock = vi.fn()
const toggleStudyPlanLikeMock = vi.fn()
const getStudyPlanCommentsMock = vi.fn()
const addStudyPlanCommentMock = vi.fn()
const deleteStudyPlanCommentMock = vi.fn()

vi.mock('@/lib/actions/custom-study-plan.action', () => ({
  getPublicStudyPlan: (...args: any[]) => getPublicStudyPlanMock(...args),
  toggleStudyPlanLike: (...args: any[]) => toggleStudyPlanLikeMock(...args),
  getStudyPlanComments: (...args: any[]) => getStudyPlanCommentsMock(...args),
  addStudyPlanComment: (...args: any[]) => addStudyPlanCommentMock(...args),
  deleteStudyPlanComment: (...args: any[]) => deleteStudyPlanCommentMock(...args),
}))

describe('CommunityPlanDetailPage (/dashboard/study/community-plans/[planId])', () => {
  it('loads plan detail, likes it, and can add a comment', async () => {
    const user = userEvent.setup()

    getPublicStudyPlanMock.mockResolvedValue({
      data: {
        plan: {
          id: 'plan-1',
          userId: 'u1',
          title: 'Frontend Pack',
          description: 'Sharpen skills',
          icon: null,
          coverImageUrl: null,
          isPublic: true,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
          chapters: [
            {
              id: 'ch-1',
              planId: 'plan-1',
              orderIndex: 1,
              title: 'Chapter One',
              description: null,
              createdAt: '2020-01-01T00:00:00.000Z',
              lessons: [
                {
                  id: 'l-1',
                  chapterId: 'ch-1',
                  orderIndex: 1,
                  title: 'Lesson One',
                  content: '...',
                  estimatedMinutes: 5,
                  createdAt: '2020-01-01T00:00:00.000Z',
                  quiz: null,
                },
              ],
            },
          ],
        },
        likeCount: 1,
        commentCount: 0,
        likedByMe: false,
        author: { name: 'Jane', avatarUrl: null },
      },
      error: null,
    })

    getStudyPlanCommentsMock.mockResolvedValue({ data: [], error: null })
    toggleStudyPlanLikeMock.mockResolvedValue({ data: { liked: true }, error: null })

    addStudyPlanCommentMock.mockResolvedValue({
      data: {
        id: 'c-1',
        planId: 'plan-1',
        userId: 'u-me',
        content: 'Nice plan!',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        isMine: true,
        author: { name: 'Me', avatarUrl: null },
      },
      error: null,
    })

    const CommunityPlanDetailPage = (await import('@/app/(dashboard)/dashboard/study/community-plans/[planId]/page')).default

    render(<CommunityPlanDetailPage />)

    await screen.findByText('Frontend Pack')
    expect(screen.getByText('Chapters')).toBeInTheDocument()

    // Like button starts at 1
    await user.click(screen.getByRole('button', { name: '1' }))
    await waitFor(() => expect(toggleStudyPlanLikeMock).toHaveBeenCalledWith('plan-1'))
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()

    // Add comment
    await user.type(screen.getByPlaceholderText('Write a comment...'), 'Nice plan!')

    // The submit button has no accessible name (icon-only). Click the only button in that row by selecting the second button after textarea.
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1]!)

    await waitFor(() => expect(addStudyPlanCommentMock).toHaveBeenCalledWith('plan-1', 'Nice plan!'))
    expect(screen.getByText('Nice plan!')).toBeInTheDocument()
  }, 25_000)
})
