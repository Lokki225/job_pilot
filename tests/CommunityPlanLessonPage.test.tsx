import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ planId: 'plan-1', lessonId: 'lesson-1' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/study/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: any) => <div>MarkdownRenderer {String(content).slice(0, 20)}</div>,
}))

const getCustomStudyLessonForStudyMock = vi.fn()

vi.mock('@/lib/actions/custom-study-plan.action', () => ({
  getCustomStudyLessonForStudy: (...args: any[]) => getCustomStudyLessonForStudyMock(...args),
}))

describe('CommunityLessonPage (/dashboard/study/community-plans/[planId]/lesson/[lessonId])', () => {
  it('loads and renders a community plan lesson', async () => {
    getCustomStudyLessonForStudyMock.mockResolvedValue({
      data: {
        id: 'lesson-1',
        chapterId: 'ch-1',
        title: 'Lesson One',
        content: 'Hello world',
        estimatedMinutes: 5,
        chapter: { id: 'ch-1', title: 'Chapter One', planId: 'plan-1' },
        plan: { id: 'plan-1', title: 'Frontend Pack', icon: null, coverImageUrl: null },
      },
      error: null,
    })

    const CommunityLessonPage = (await import('@/app/(dashboard)/dashboard/study/community-plans/[planId]/lesson/[lessonId]/page')).default

    render(<CommunityLessonPage />)

    await waitFor(() => expect(getCustomStudyLessonForStudyMock).toHaveBeenCalledWith('lesson-1'))

    expect(screen.getByText('Lesson One')).toBeInTheDocument()
    expect(screen.getByText(/MarkdownRenderer/i)).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: 'Back to Plan' })[0]).toHaveAttribute(
      'href',
      '/dashboard/study/community-plans/plan-1'
    )
  }, 20_000)
})
