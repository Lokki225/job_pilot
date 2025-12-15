import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const getAllCoverLettersMock = vi.fn()
const updateCoverLetterMock = vi.fn()
const deleteCoverLetterMock = vi.fn()
const improveCoverLetterMock = vi.fn()

vi.mock('@/lib/actions/cover-letter.action', () => ({
  getAllCoverLetters: (...args: any[]) => getAllCoverLettersMock(...args),
  updateCoverLetter: (...args: any[]) => updateCoverLetterMock(...args),
  deleteCoverLetter: (...args: any[]) => deleteCoverLetterMock(...args),
  improveCoverLetter: (...args: any[]) => improveCoverLetterMock(...args),
}))

vi.mock('@/components/letters', () => ({
  LetterCard: ({ letter, onView }: any) => (
    <div>
      <div>{letter.subject || 'Cover Letter'}</div>
      <div>{letter.job_applications?.company || ''}</div>
      <button type="button" onClick={() => onView(letter)}>
        View
      </button>
    </div>
  ),
  LetterPreview: ({ letter, isOpen, onClose }: any) =>
    isOpen ? (
      <div>
        <h2>Preview</h2>
        <div>{letter?.content}</div>
        <button type="button" onClick={onClose}>
          Close Preview
        </button>
      </div>
    ) : null,
  LetterEditor: ({ isOpen }: any) => (isOpen ? <div>Edit Modal</div> : null),
  EmptyLettersState: ({ onCreateNew }: any) => (
    <button type="button" onClick={onCreateNew}>
      Create New
    </button>
  ),
  TemplatesSection: () => <div>Templates Section</div>,
}))

describe('CoverLettersPage', () => {
  it('loads letters, filters by search, opens preview, and navigates to generate', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    getAllCoverLettersMock.mockResolvedValue({
      data: [
        {
          id: 'cl-1',
          content: 'Alpha letter content',
          subject: 'Alpha Subject',
          tone: 'professional',
          createdAt: '2020-01-01T00:00:00.000Z',
          job_applications: {
            id: 'app-1',
            jobTitle: 'QA Engineer',
            company: 'ACME',
            status: 'wishlist',
          },
        },
        {
          id: 'cl-2',
          content: 'Beta letter content',
          subject: 'Beta Subject',
          tone: 'friendly',
          createdAt: '2020-01-02T00:00:00.000Z',
          job_applications: {
            id: 'app-2',
            jobTitle: 'Frontend Engineer',
            company: 'Beta Corp',
            status: 'applied',
          },
        },
      ],
      error: null,
    })

    const CoverLettersPage = (await import('@/app/(dashboard)/dashboard/letters/page')).default

    render(<CoverLettersPage />)

    await screen.findByRole('heading', { name: 'Cover Letters' })
    await waitFor(() => expect(getAllCoverLettersMock).toHaveBeenCalled())

    expect(screen.getByText('Alpha Subject')).toBeInTheDocument()
    expect(screen.getByText('Beta Subject')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search letters...'), 'beta')

    expect(screen.queryByText('Alpha Subject')).toBeNull()
    expect(screen.getByText('Beta Subject')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View' }))
    await screen.findByRole('heading', { name: 'Preview' })
    expect(screen.getByText('Beta letter content')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Preview' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Preview' })).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Generate New Letter' }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/jobs')
  }, 20_000)

  it('switches to Templates tab', async () => {
    const user = userEvent.setup()

    getAllCoverLettersMock.mockResolvedValue({ data: [], error: null })

    const CoverLettersPage = (await import('@/app/(dashboard)/dashboard/letters/page')).default

    render(<CoverLettersPage />)

    await screen.findByRole('heading', { name: 'Cover Letters' })

    const templatesTab =
      screen.queryByRole('tab', { name: 'Templates' }) ?? screen.getByText('Templates')

    await user.click(templatesTab)

    await screen.findByText('Templates Section')
  })
})
