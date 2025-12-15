import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ prepId: 'prep-123' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getPrepPackMock = vi.fn()
const generatePrepPackPlanMock = vi.fn()
const markStepCompleteMock = vi.fn()

vi.mock('@/lib/actions/prep-pack.action', () => ({
  getPrepPack: (...args: any[]) => getPrepPackMock(...args),
  generatePrepPackPlan: (...args: any[]) => generatePrepPackPlanMock(...args),
  markStepComplete: (...args: any[]) => markStepCompleteMock(...args),
}))

describe('PrepPackDetailPage', () => {
  it('renders a DRAFT prep pack and triggers Generate Plan', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    getPrepPackMock.mockResolvedValue({
      success: true,
      data: {
        id: 'prep-123',
        companyName: 'ACME',
        jobTitle: 'QA Engineer',
        jobPostText: null,
        jobPostUrl: null,
        companyWebsite: null,
        extractedData: null,
        prepPlan: null,
        status: 'DRAFT',
        completedSteps: [],
        totalSteps: 0,
        progressPercent: 0,
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
    })

    generatePrepPackPlanMock.mockResolvedValue({
      success: true,
      data: { extractedData: {}, prepPlan: {} },
    })

    const PrepPackDetailPage = (await import('@/app/(dashboard)/dashboard/training/prep/[prepId]/page')).default

    render(<PrepPackDetailPage />)

    await screen.findByRole('heading', { name: 'QA Engineer' })

    await user.click(screen.getByRole('button', { name: 'Generate Plan' }))

    await waitFor(() => expect(generatePrepPackPlanMock).toHaveBeenCalledWith('prep-123'))

    // After generating, the page refreshes the prep pack.
    await waitFor(() => expect(getPrepPackMock).toHaveBeenCalledTimes(2))
  }, 25_000)

  it('redirects to prep list when prep pack cannot be loaded', async () => {
    pushMock.mockReset()

    getPrepPackMock.mockResolvedValue({
      success: false,
      error: 'Prep pack not found',
    })

    const PrepPackDetailPage = (await import('@/app/(dashboard)/dashboard/training/prep/[prepId]/page')).default

    render(<PrepPackDetailPage />)

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/training/prep'))
  }, 20_000)
})
