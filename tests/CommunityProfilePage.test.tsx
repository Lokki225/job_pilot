import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getOrCreateCommunityProfileMock = vi.fn()
const updateCommunityProfileMock = vi.fn()
const getFollowersMock = vi.fn()
const getFollowingMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getOrCreateCommunityProfile: (...args: any[]) => getOrCreateCommunityProfileMock(...args),
  updateCommunityProfile: (...args: any[]) => updateCommunityProfileMock(...args),
  getFollowers: (...args: any[]) => getFollowersMock(...args),
  getFollowing: (...args: any[]) => getFollowingMock(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CommunityProfilePage (/dashboard/community/hub/profile)', () => {
  it('loads profile and can edit + save bio/topics', async () => {
    const user = userEvent.setup()

    getOrCreateCommunityProfileMock.mockResolvedValue({
      data: {
        id: 'cp-1',
        userId: 'u-1',
        reputationPoints: 120,
        level: 2,
        postsCount: 1,
        commentsCount: 2,
        helpfulVotes: 3,
        successStoriesShared: 0,
        isModerator: false,
        isExpert: false,
        isMentor: false,
        badges: [],
        bio: 'Old bio',
        favoriteTopics: ['interview'],
        user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
      },
      error: null,
    })

    getFollowersMock.mockResolvedValue({ data: [], error: null })
    getFollowingMock.mockResolvedValue({ data: [], error: null })

    updateCommunityProfileMock.mockResolvedValue({ data: { success: true }, error: null })

    const CommunityProfilePage = (await import(
      '@/app/(dashboard)/dashboard/community/hub/profile/page'
    )).default

    render(<CommunityProfilePage />)

    await screen.findByText('Jane Doe')
    await waitFor(() => expect(getOrCreateCommunityProfileMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))

    const bioInput = await screen.findByLabelText('Bio')
    const topicsInput = screen.getByLabelText('Favorite Topics (comma-separated)')

    await user.clear(bioInput)
    await user.type(bioInput, '  New bio  ')

    await user.clear(topicsInput)
    await user.type(topicsInput, 'Tech, Remote')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateCommunityProfileMock).toHaveBeenCalledWith({
        bio: 'New bio',
        favoriteTopics: ['tech', 'remote'],
      })
    )

    // save triggers a refresh
    await waitFor(() => expect(getOrCreateCommunityProfileMock).toHaveBeenCalledTimes(2))
  }, 25_000)
})
