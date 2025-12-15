import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: (props: any) => {
    const { src, alt, ...rest } = props
    // next/image uses non-string src sometimes; normalize for tests
    return <img src={typeof src === 'string' ? src : ''} alt={alt} {...rest} />
  },
}))

const getPublicStudyPlansMock = vi.fn()
const toggleStudyPlanLikeMock = vi.fn()

vi.mock('@/lib/actions/custom-study-plan.action', () => ({
  getPublicStudyPlans: (...args: any[]) => getPublicStudyPlansMock(...args),
  toggleStudyPlanLike: (...args: any[]) => toggleStudyPlanLikeMock(...args),
}))

describe('CommunityPlansPage', () => {
  it('loads public plans and can like a plan', async () => {
    const user = userEvent.setup()

    getPublicStudyPlansMock.mockResolvedValue({
      data: [
        {
          id: 'pub-1',
          userId: 'u1',
          title: 'Frontend Interview Pack',
          description: 'A complete plan',
          icon: null,
          coverImageUrl: null,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
          chapterCount: 2,
          lessonCount: 5,
          estimatedMinutes: 60,
          likeCount: 1,
          commentCount: 0,
          likedByMe: false,
          author: { name: 'Jane', avatarUrl: null },
        },
      ],
      error: null,
    })

    toggleStudyPlanLikeMock.mockResolvedValue({ data: { liked: true }, error: null })

    const CommunityPlansPage = (await import('@/app/(dashboard)/dashboard/study/community-plans/page')).default

    render(<CommunityPlansPage />)

    await screen.findByRole('heading', { name: 'Community Plans' })
    await waitFor(() => expect(getPublicStudyPlansMock).toHaveBeenCalled())

    expect(screen.getByText('Frontend Interview Pack')).toBeInTheDocument()

    // Like count is part of the button accessible name.
    await user.click(screen.getByRole('button', { name: '1' }))

    await waitFor(() => expect(toggleStudyPlanLikeMock).toHaveBeenCalledWith('pub-1'))

    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
  }, 20_000)
})
