import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ chapterId: 'ch-123' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getChapterDetailMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getChapterDetail: (...args: any[]) => getChapterDetailMock(...args),
}))

describe('ChapterDetailPage (/dashboard/study/chapter/[chapterId])', () => {
  it('loads chapter and renders lesson list with locked next lesson', async () => {
    getChapterDetailMock.mockResolvedValue({
      data: {
        chapter: {
          id: 'ch-123',
          title: 'Behavioral Basics',
          description: 'Learn the fundamentals.',
          icon: '🧠',
          orderIndex: 1,
        },
        lessons: [
          {
            id: 'l-1',
            title: 'Intro',
            description: 'Start here',
            estimatedMinutes: 10,
            isPremium: false,
            contentType: 'LESSON',
            progress: { status: 'NOT_STARTED', progressPercentage: 0 },
          },
          {
            id: 'l-2',
            title: 'Next Steps',
            description: 'Locked until intro complete',
            estimatedMinutes: 10,
            isPremium: false,
            contentType: 'LESSON',
            progress: { status: 'NOT_STARTED', progressPercentage: 0 },
          },
        ],
        previousChapter: null,
        nextChapter: null,
      },
      error: null,
    })

    const ChapterDetailPage = (await import('@/app/(dashboard)/dashboard/study/chapter/[chapterId]/page')).default

    render(<ChapterDetailPage />)

    await waitFor(() => expect(getChapterDetailMock).toHaveBeenCalledWith('ch-123'))

    expect(screen.getByRole('heading', { name: 'Behavioral Basics' })).toBeInTheDocument()

    // First lesson should link to its lesson page.
    const introLink = screen.getByText('Intro').closest('a')
    expect(introLink).not.toBeNull()
    expect(introLink).toHaveAttribute('href', '/dashboard/study/lesson/l-1')

    // Second lesson should be locked and link to '#'
    const nextStepsLink = screen.getByText('Next Steps').closest('a')
    expect(nextStepsLink).not.toBeNull()
    expect(nextStepsLink).toHaveAttribute('href', '#')
  }, 20_000)
})
