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

const getInterviewStatsMock = vi.fn()

vi.mock('@/lib/actions/training.action', () => ({
  getInterviewStats: (...args: any[]) => getInterviewStatsMock(...args),
}))

describe('TrainingRoomPage', () => {
  it('loads stats and starts a selected session type', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    getInterviewStatsMock.mockResolvedValue({
      success: true,
      data: {
        totalSessions: 3,
        avgSessionScore: 82,
        currentStreakDays: 2,
        highestScore: 95,
      },
    })

    const TrainingRoomPage = (await import('@/app/(dashboard)/dashboard/training/page')).default

    render(<TrainingRoomPage />)

    await screen.findByRole('heading', { name: 'Training Room' })
    await waitFor(() => expect(getInterviewStatsMock).toHaveBeenCalled())

    // select a card by clicking inside it
    await user.click(screen.getByText('Quick Practice'))

    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/training/session/new?type=QUICK')
  }, 20_000)
})
