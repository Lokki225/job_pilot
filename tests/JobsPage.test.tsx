import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const getJobRecommendationsMock = vi.fn()
const refreshJobRecommendationsMock = vi.fn()
const markRecommendedJobSavedMock = vi.fn()

vi.mock('@/lib/actions/job-recommendations.action', () => ({
  getJobRecommendations: (...args: any[]) => getJobRecommendationsMock(...args),
  refreshJobRecommendations: (...args: any[]) => refreshJobRecommendationsMock(...args),
  markRecommendedJobSaved: (...args: any[]) => markRecommendedJobSavedMock(...args),
}))

const searchJobsActionMock = vi.fn()

vi.mock('@/lib/actions/job-search.action', () => ({
  searchJobsAction: (...args: any[]) => searchJobsActionMock(...args),
}))

const getSavedJobSearchesMock = vi.fn()

vi.mock('@/lib/actions/saved-job-searches.action', () => ({
  getSavedJobSearches: (...args: any[]) => getSavedJobSearchesMock(...args),
  createSavedJobSearch: vi.fn(),
  deleteSavedJobSearch: vi.fn(),
  updateSavedJobSearch: vi.fn(),
}))

const createJobApplicationMock = vi.fn()

vi.mock('@/lib/actions/job-application.action', () => ({
  createJobApplication: (...args: any[]) => createJobApplicationMock(...args),
}))

describe('JobsPage', () => {
  it('loads recommendations, can open Paste Job modal, and can navigate to My Applications', async () => {
    pushMock.mockReset()
    const user = userEvent.setup()

    getSavedJobSearchesMock.mockResolvedValue({ data: [], error: null })

    getJobRecommendationsMock.mockResolvedValue({
      data: {
        jobs: [
          {
            id: 'rec-1',
            title: 'Recommended QA Engineer',
            company: 'Rec Corp',
            location: 'Remote',
            description: 'Desc',
            applyUrl: 'https://example.com/apply',
            source: 'JSEARCH',
            postedDate: new Date('2020-01-01T00:00:00.000Z'),
          },
        ],
        topPicks: [
          {
            id: 'tp-1',
            title: 'Top Pick QA Engineer',
            company: 'TopPick Corp',
            location: 'Remote',
            description: 'Desc',
            applyUrl: 'https://example.com/apply2',
            source: 'JSEARCH',
            postedDate: new Date('2020-01-02T00:00:00.000Z'),
          },
        ],
        fromCache: false,
        lastRefreshed: null,
        savedCount: 0,
        dailyLimit: 5,
      },
      error: null,
    })

    searchJobsActionMock.mockResolvedValue({
      data: {
        jobs: [
          {
            id: 's-1',
            title: 'Search Result QA Engineer',
            company: 'Search Corp',
            location: 'Remote',
            description: 'Desc',
            applyUrl: 'https://example.com/apply3',
            source: 'JSEARCH',
            postedDate: new Date('2020-01-03T00:00:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        hasMore: false,
      },
      error: null,
    })

    const JobsPage = (await import('@/app/(dashboard)/dashboard/jobs/page')).default

    render(<JobsPage />)

    await waitFor(() => expect(getJobRecommendationsMock).toHaveBeenCalled())

    await screen.findByRole('heading', { name: 'Top Picks for You' })
    await screen.findByText('Top Pick QA Engineer')
    await screen.findByText('Recommended QA Engineer')

    await user.click(screen.getByRole('button', { name: 'Paste Job' }))
    await screen.findByRole('heading', { name: 'Paste Job Posting' })

    // Radix Dialog disables pointer events outside the modal while open.
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Paste Job Posting' })).toBeNull()
    )

    await user.click(screen.getByRole('button', { name: 'My Applications' }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/jobs/applications')

    await user.type(
      screen.getByPlaceholderText('Job title, keywords, or company...'),
      'qa engineer'
    )
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(searchJobsActionMock).toHaveBeenCalled())
    await screen.findByText('Search Result QA Engineer')
  }, 20_000)
})
