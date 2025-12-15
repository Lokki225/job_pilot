import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getChaptersWithProgressMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getChaptersWithProgress: (...args: any[]) => getChaptersWithProgressMock(...args),
}))

describe('StudyTracksPage', () => {
  it('loads tracks page and renders career tracks list', async () => {
    getChaptersWithProgressMock.mockResolvedValue({
      data: {
        overallProgress: {
          percentage: 0,
          completedLessons: 0,
          totalLessons: 0,
          totalTimeSpent: 0,
          currentStreak: 0,
        },
        chapters: [
          {
            id: 'ch-1',
            title: 'General Chapter',
            icon: '📚',
            careerTrackId: null,
            isUnlocked: true,
            progressPercentage: 100,
            totalLessons: 1,
            completedLessons: 1,
            estimatedMinutes: 10,
          },
        ],
        nextLesson: null,
      },
      error: null,
    })

    const StudyTracksPage = (await import('@/app/(dashboard)/dashboard/study/tracks/page')).default

    render(<StudyTracksPage />)

    await waitFor(() => expect(getChaptersWithProgressMock).toHaveBeenCalled())

    expect(screen.getByRole('heading', { name: 'Career Tracks' })).toBeInTheDocument()
    expect(screen.getByText('Browse Community Plans')).toBeInTheDocument()

    // At least one track card should render.
    expect(screen.getByText('General')).toBeInTheDocument()
  }, 20_000)
})
