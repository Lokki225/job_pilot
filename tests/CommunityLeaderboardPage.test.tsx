import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getCommunityLeaderboardMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getCommunityLeaderboard: (...args: any[]) => getCommunityLeaderboardMock(...args),
}))

describe('CommunityLeaderboardPage (/dashboard/community/hub/leaderboard)', () => {
  it('loads and renders leaderboard entries', async () => {
    getCommunityLeaderboardMock.mockResolvedValue({
      data: [
        {
          userId: 'u1',
          name: 'Alice',
          avatarUrl: null,
          rank: 1,
          level: 5,
          reputationPoints: 1000,
          postsCount: 10,
          helpfulVotes: 7,
          badges: ['MENTOR'],
        },
        {
          userId: 'u2',
          name: 'Bob',
          avatarUrl: null,
          rank: 2,
          level: 4,
          reputationPoints: 900,
          postsCount: 8,
          helpfulVotes: 4,
          badges: [],
        },
        {
          userId: 'u3',
          name: 'Carol',
          avatarUrl: null,
          rank: 3,
          level: 3,
          reputationPoints: 800,
          postsCount: 7,
          helpfulVotes: 3,
          badges: [],
        },
        {
          userId: 'u4',
          name: 'Dan',
          avatarUrl: null,
          rank: 4,
          level: 2,
          reputationPoints: 700,
          postsCount: 6,
          helpfulVotes: 2,
          badges: [],
        },
      ],
      error: null,
    })

    const CommunityLeaderboardPage = (await import(
      '@/app/(dashboard)/dashboard/community/hub/leaderboard/page'
    )).default

    render(<CommunityLeaderboardPage />)

    await waitFor(() => expect(getCommunityLeaderboardMock).toHaveBeenCalledWith({ limit: 50 }))

    await screen.findByRole('heading', { name: 'Community Leaderboard' })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Dan')).toBeInTheDocument()

    // Rankings section should be present because we have >3 entries
    expect(screen.getByText('Rankings')).toBeInTheDocument()
  }, 20_000)
})
