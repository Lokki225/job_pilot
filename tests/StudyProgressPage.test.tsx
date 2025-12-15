import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getUserStudyStatsMock = vi.fn()
const getChaptersWithProgressMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getUserStudyStats: (...args: any[]) => getUserStudyStatsMock(...args),
  getChaptersWithProgress: (...args: any[]) => getChaptersWithProgressMock(...args),
}))

describe('StudyProgressPage', () => {
  it('loads and renders study progress stats and chapter progress', async () => {
    getUserStudyStatsMock.mockResolvedValue({
      data: {
        totalLessons: 10,
        completedLessons: 4,
        totalChapters: 2,
        completedChapters: 1,
        totalTimeSpent: 3600,
        quizzesPassed: 2,
        averageQuizScore: 80,
      },
      error: null,
    })

    getChaptersWithProgressMock.mockResolvedValue({
      data: {
        overallProgress: {
          percentage: 40,
          completedLessons: 4,
          totalLessons: 10,
          totalTimeSpent: 3600,
          currentStreak: 0,
        },
        chapters: [
          {
            id: 'ch-1',
            title: 'Chapter One',
            icon: '📖',
            careerTrackId: null,
            isUnlocked: true,
            progressPercentage: 50,
            totalLessons: 4,
            completedLessons: 2,
            estimatedMinutes: 40,
          },
        ],
        nextLesson: null,
      },
      error: null,
    })

    const StudyProgressPage = (await import('@/app/(dashboard)/dashboard/study/progress/page')).default

    render(<StudyProgressPage />)

    await waitFor(() => expect(getUserStudyStatsMock).toHaveBeenCalled())
    await waitFor(() => expect(getChaptersWithProgressMock).toHaveBeenCalled())

    expect(screen.getByRole('heading', { name: /Your Progress/i })).toBeInTheDocument()
    expect(screen.getByText('Chapter One')).toBeInTheDocument()

    // Ensure XP/level block renders (values derived from stats)
    expect(
      screen.getByText((content) => content.replace(/\s+/g, ' ').includes('Level 2'))
    ).toBeInTheDocument()
  }, 20_000)
})
