import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/components/study/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

const getCareerTracksMock = vi.fn()
const getChapterTemplatesMock = vi.fn()
const getAIProviderInfoMock = vi.fn()
const generateFullChapterMock = vi.fn()
const publishChapterToDatabaseMock = vi.fn()
const populateFullDatabaseMock = vi.fn()
const populateTrackMock = vi.fn()
const populateFreeChaptersMock = vi.fn()

vi.mock('@/lib/actions/study-content.action', () => ({
  getCareerTracks: (...args: any[]) => getCareerTracksMock(...args),
  getChapterTemplates: (...args: any[]) => getChapterTemplatesMock(...args),
  getAIProviderInfo: (...args: any[]) => getAIProviderInfoMock(...args),
  generateFullChapter: (...args: any[]) => generateFullChapterMock(...args),
  publishChapterToDatabase: (...args: any[]) => publishChapterToDatabaseMock(...args),
  populateFullDatabase: (...args: any[]) => populateFullDatabaseMock(...args),
  populateTrack: (...args: any[]) => populateTrackMock(...args),
  populateFreeChapters: (...args: any[]) => populateFreeChaptersMock(...args),
}))

describe('StudyContentAdminPage (/dashboard/admin/study-content)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCareerTracksMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'frontend',
          name: 'Frontend',
          icon: '🧩',
          targetAudience: ['Beginners', 'Career changers'],
        },
      ],
    })

    getChapterTemplatesMock.mockResolvedValue({
      success: true,
      data: [
        {
          orderIndex: 1,
          title: 'Introduction',
          description: 'Intro chapter',
          icon: '📘',
          estimatedMinutes: 30,
          isPremium: false,
        },
      ],
    })

    getAIProviderInfoMock.mockResolvedValue({
      success: true,
      data: { provider: 'MockAI', model: 'mock-1' },
    })

    generateFullChapterMock.mockResolvedValue({
      success: true,
      data: {
        blueprint: {
          orderIndex: 1,
          title: 'Introduction',
          description: 'Intro chapter',
          icon: '📘',
          estimatedMinutes: 30,
          isPremium: false,
        },
        lessons: [
          {
            title: 'Lesson 1',
            description: 'Lesson desc',
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  type: 'text',
                  data: {
                    title: 'Section 1',
                    body: 'Hello world',
                    highlights: [],
                    examples: [],
                  },
                },
              ],
            },
          },
        ],
        quiz: null,
        generationErrors: [],
      },
    })

    publishChapterToDatabaseMock.mockResolvedValue({
      success: true,
      data: { chapterId: 'ch-1', lessonIds: ['l-1'], quizId: null },
    })

    populateFullDatabaseMock.mockResolvedValue({ data: null })
    populateTrackMock.mockResolvedValue({ data: null })
    populateFreeChaptersMock.mockResolvedValue({ data: null })
  })

  it('loads, generates a chapter, and publishes to DB', async () => {
    const user = userEvent.setup()

    const StudyContentAdminPage = (await import('@/app/(dashboard)/dashboard/admin/study-content/page')).default

    render(<StudyContentAdminPage />)

    await screen.findByRole('heading', { name: 'Study Content Generator' })

    await user.click(screen.getByRole('button', { name: /Frontend/i }))
    await user.click(screen.getByRole('button', { name: /1\. Introduction/i }))

    await user.click(screen.getByRole('button', { name: 'Generate Chapter' }))

    await waitFor(() => expect(generateFullChapterMock).toHaveBeenCalled())

    expect(
      await screen.findByText('Content Generated Successfully')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Publish to DB' }))

    await waitFor(() => expect(publishChapterToDatabaseMock).toHaveBeenCalled())

    expect(screen.getByText(/Published! Chapter ID:/i)).toBeInTheDocument()
  }, 30_000)
})
