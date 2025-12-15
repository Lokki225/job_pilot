import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  useParams: () => ({ id: 'job-123' }),
}))

vi.mock('@/components/jobs/JobDetailsModal', () => ({
  JobDetailsModal: () => null,
}))

vi.mock('@/components/jobs/CoverLetterGenerator', () => ({
  CoverLetterGenerator: () => null,
}))

vi.mock('@/components/jobs/AutoApplyModal', () => ({
  AutoApplyModal: () => null,
}))

vi.mock('@/components/jobs/OfferCongratulationsModal', () => ({
  OfferCongratulationsModal: () => null,
}))

const getJobApplicationMock = vi.fn()
const updateJobApplicationMock = vi.fn()
const deleteJobApplicationMock = vi.fn()
const toggleFavoriteMock = vi.fn()
const createJobApplicationMock = vi.fn()

vi.mock('@/lib/actions/job-application.action', () => ({
  getJobApplication: (...args: any[]) => getJobApplicationMock(...args),
  updateJobApplication: (...args: any[]) => updateJobApplicationMock(...args),
  deleteJobApplication: (...args: any[]) => deleteJobApplicationMock(...args),
  toggleFavorite: (...args: any[]) => toggleFavoriteMock(...args),
  createJobApplication: (...args: any[]) => createJobApplicationMock(...args),
}))

const getSimilarJobsMock = vi.fn()

vi.mock('@/lib/actions/job-recommendations.action', () => ({
  getSimilarJobs: (...args: any[]) => getSimilarJobsMock(...args),
}))

const getCoverLettersForJobMock = vi.fn()

vi.mock('@/lib/actions/cover-letter.action', () => ({
  getCoverLettersForJob: (...args: any[]) => getCoverLettersForJobMock(...args),
}))

describe('JobDetailsPage', () => {
  it('loads job details, toggles favorite, and edits + saves changes', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()
    backMock.mockReset()

    const job = {
      id: 'job-123',
      jobTitle: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      jobType: 'Full-time',
      salary: '$100k',
      description: 'Test things',
      requirements: 'Attention to detail',
      jobPostUrl: null,
      status: 'WISHLIST',
      source: 'OTHER',
      isPasted: false,
      isFavorite: false,
      appliedDate: null,
      interviewDate: null,
      notes: null,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }

    const updatedJob = {
      ...job,
      jobTitle: 'Senior QA Engineer',
      notes: 'Follow up next week',
    }

    getJobApplicationMock.mockResolvedValue({ data: job, error: null })
    getSimilarJobsMock.mockResolvedValue({ data: [], error: null })
    getCoverLettersForJobMock.mockResolvedValue({ data: [], error: null })

    toggleFavoriteMock.mockResolvedValue({ data: true, error: null })
    updateJobApplicationMock.mockResolvedValue({ data: updatedJob, error: null })

    const JobDetailsPage = (await import('@/app/(dashboard)/dashboard/jobs/[id]/page')).default

    render(<JobDetailsPage />)

    await screen.findByRole('heading', { name: 'QA Engineer' })

    await user.click(screen.getByRole('button', { name: 'Toggle favorite' }))
    await waitFor(() => expect(toggleFavoriteMock).toHaveBeenCalledWith('job-123'))

    // Favorite indicator in header appears after state update
    await waitFor(() => {
      const icon = document.querySelector('svg.fill-yellow-400')
      expect(icon).not.toBeNull()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const titleInput = screen.getByDisplayValue('QA Engineer')
    await user.clear(titleInput)
    await user.type(titleInput, 'Senior QA Engineer')

    const notesArea = screen.getByPlaceholderText('Add your notes about this application...')
    await user.type(notesArea, 'Follow up next week')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateJobApplicationMock).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          jobTitle: 'Senior QA Engineer',
          notes: 'Follow up next week',
        })
      )
    )

    await screen.findByRole('heading', { name: 'Senior QA Engineer' })
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  }, 25_000)
})
