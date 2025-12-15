import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const listJobApplicationsMock = vi.fn()
const updateApplicationStatusMock = vi.fn()
const deleteJobApplicationMock = vi.fn()
const toggleFavoriteMock = vi.fn()

vi.mock('@/lib/actions/job-application.action', () => ({
  listJobApplications: (...args: any[]) => listJobApplicationsMock(...args),
  updateApplicationStatus: (...args: any[]) => updateApplicationStatusMock(...args),
  deleteJobApplication: (...args: any[]) => deleteJobApplicationMock(...args),
  toggleFavorite: (...args: any[]) => toggleFavoriteMock(...args),
}))

describe('ApplicationsPage', () => {
  it('loads applications, filters by search, toggles view mode, and navigates back/add job', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    listJobApplicationsMock.mockResolvedValue({
      data: [
        {
          id: 'a1',
          jobTitle: 'QA Engineer',
          company: 'ACME',
          location: 'Remote',
          status: 'WISHLIST',
          appliedAt: null,
          createdAt: '2020-01-01T00:00:00.000Z',
          jobPostUrl: null,
          salary: null,
          isFavorite: false,
        },
        {
          id: 'a2',
          jobTitle: 'Frontend Engineer',
          company: 'Beta Corp',
          location: 'Paris',
          status: 'APPLIED',
          appliedAt: '2020-01-02T00:00:00.000Z',
          createdAt: '2020-01-02T00:00:00.000Z',
          jobPostUrl: null,
          salary: null,
          isFavorite: true,
        },
      ],
      error: null,
    })

    updateApplicationStatusMock.mockResolvedValue({ data: true, error: null })
    deleteJobApplicationMock.mockResolvedValue({ data: true, error: null })
    toggleFavoriteMock.mockResolvedValue({ data: true, error: null })

    const ApplicationsPage = (await import('@/app/(dashboard)/dashboard/jobs/applications/page')).default

    render(<ApplicationsPage />)

    await screen.findByRole('heading', { name: 'My Applications' })
    await waitFor(() => expect(listJobApplicationsMock).toHaveBeenCalled())

    // loaded rows/cards
    await screen.findByText('QA Engineer')
    await screen.findByText('Frontend Engineer')

    // filter
    await user.type(screen.getByPlaceholderText('Search applications...'), 'frontend')
    expect(screen.queryByText('QA Engineer')).toBeNull()
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()

    // toggle view mode to list (table view)
    await user.click(screen.getByRole('button', { name: 'List' }))
    await screen.findByRole('table')

    // back button
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/jobs')

    // add job button
    await user.click(screen.getByRole('button', { name: 'Add Job' }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/jobs')
  }, 20_000)
})
