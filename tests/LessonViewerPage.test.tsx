import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ lessonId: 'l-123' }),
  useRouter: () => ({ push: pushMock }),
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
  TipBox: ({ title, children }: any) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}))

const getLessonDetailMock = vi.fn()
const updateLessonProgressMock = vi.fn()
const completeLessonMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getLessonDetail: (...args: any[]) => getLessonDetailMock(...args),
  updateLessonProgress: (...args: any[]) => updateLessonProgressMock(...args),
  completeLesson: (...args: any[]) => completeLessonMock(...args),
}))

describe('LessonViewerPage (/dashboard/study/lesson/[lessonId])', () => {
  it('loads a lesson, starts progress tracking, and routes to next lesson on completion', async () => {
    const user = userEvent.setup()
    pushMock.mockReset()

    getLessonDetailMock.mockResolvedValue({
      data: {
        chapter: { id: 'ch-1', title: 'Behavioral', icon: '🧠' },
        lesson: {
          id: 'l-123',
          title: 'Tell me about yourself',
          estimatedMinutes: 10,
          content: {
            sections: [
              { type: 'text', data: { title: 'Section 1', body: 'Hello', highlights: [] } },
            ],
          },
        },
        nextLesson: { id: 'l-124' },
      },
      error: null,
    })

    updateLessonProgressMock.mockResolvedValue({ data: null, error: null })
    completeLessonMock.mockResolvedValue({ data: null, error: null })

    const LessonViewerPage = (await import('@/app/(dashboard)/dashboard/study/lesson/[lessonId]/page')).default

    render(<LessonViewerPage />)

    await waitFor(() => expect(getLessonDetailMock).toHaveBeenCalledWith('l-123'))

    await waitFor(() =>
      expect(updateLessonProgressMock).toHaveBeenCalledWith({
        lessonId: 'l-123',
        status: 'IN_PROGRESS',
        progressPercentage: 0,
      })
    )

    expect(screen.getByRole('heading', { name: 'Tell me about yourself' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Complete & Continue' }))

    await waitFor(() => expect(completeLessonMock).toHaveBeenCalledWith('l-123'))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/study/lesson/l-124')
  }, 25_000)
})
