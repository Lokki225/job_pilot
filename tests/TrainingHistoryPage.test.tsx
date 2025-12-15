import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getTrainingHistoryMock = vi.fn()
const getInterviewStatsMock = vi.fn()

vi.mock('@/lib/actions/training.action', () => ({
  getTrainingHistory: (...args: any[]) => getTrainingHistoryMock(...args),
  getInterviewStats: (...args: any[]) => getInterviewStatsMock(...args),
}))

describe('TrainingHistoryPage', () => {
  it('loads history and navigates to a session results page when a session is clicked', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    getTrainingHistoryMock.mockResolvedValue({
      success: true,
      data: {
        sessions: [
          {
            id: 'sess-1',
            sessionType: 'QUICK',
            status: 'COMPLETED',
            startedAt: '2020-01-01T00:00:00.000Z',
            durationSeconds: 600,
            completedQuestions: 5,
            totalQuestions: 5,
            overallScore: 80,
            jobTitle: 'QA Engineer',
            companyName: 'ACME',
          },
        ],
      },
    })

    getInterviewStatsMock.mockResolvedValue({
      success: true,
      data: {
        totalSessions: 1,
        avgSessionScore: 80,
        highestScore: 80,
        currentStreakDays: 1,
        totalPracticeTimeSeconds: 600,
      },
    })

    const TrainingHistoryPage = (await import('@/app/(dashboard)/dashboard/training/history/page')).default

    render(<TrainingHistoryPage />)

    await screen.findByRole('heading', { name: 'Training History' })

    await waitFor(() => expect(getTrainingHistoryMock).toHaveBeenCalled())

    await user.click(screen.getByText('Quick Practice'))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/training/session/sess-1/results')
  }, 20_000)
})
