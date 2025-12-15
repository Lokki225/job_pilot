import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getChaptersWithProgressMock = vi.fn()
const getJobStudyModulesMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getChaptersWithProgress: (...args: any[]) => getChaptersWithProgressMock(...args),
  getJobStudyModules: (...args: any[]) => getJobStudyModulesMock(...args),
}))

describe('StudyRoomPage', () => {
  it('loads study data and can collapse the job-specific modules section', async () => {
    const user = userEvent.setup()

    getChaptersWithProgressMock.mockResolvedValue({
      data: {
        overallProgress: {
          percentage: 50,
          completedLessons: 5,
          totalLessons: 10,
          totalTimeSpent: 600,
          currentStreak: 2,
        },
        chapters: [
          {
            id: 'ch-1',
            title: 'Behavioral Basics',
            icon: '🧠',
            careerTrackId: null,
            isUnlocked: true,
            progressPercentage: 50,
            totalLessons: 10,
            completedLessons: 5,
            estimatedMinutes: 60,
          },
        ],
        nextLesson: {
          id: 'l-1',
          title: 'Tell me about yourself',
          estimatedMinutes: 10,
          chapter: { id: 'ch-1', title: 'Behavioral Basics' },
        },
      },
      error: null,
    })

    getJobStudyModulesMock.mockResolvedValue({
      data: [
        {
          id: 'm-1',
          companyName: 'ACME',
          jobTitle: 'QA Engineer',
          moduleGenerated: true,
          moduleProgressPercent: 20,
          totalTopics: 5,
          createdAt: '2020-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const StudyRoomPage = (await import('@/app/(dashboard)/dashboard/study/page')).default

    render(<StudyRoomPage />)

    await waitFor(() => expect(getChaptersWithProgressMock).toHaveBeenCalled())
    await waitFor(() => expect(getJobStudyModulesMock).toHaveBeenCalled())

    expect(screen.getByRole('heading', { name: /Study Room/i })).toBeInTheDocument()

    expect(screen.getByText('Job-specific Modules')).toBeInTheDocument()
    expect(screen.getByText('QA Engineer @ ACME')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse job-specific modules' }))

    expect(screen.queryByText('QA Engineer @ ACME')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Expand job-specific modules' }))

    expect(screen.getByText('QA Engineer @ ACME')).toBeInTheDocument()
  }, 20_000)
})
