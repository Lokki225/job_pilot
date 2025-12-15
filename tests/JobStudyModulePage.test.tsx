import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useParams: () => ({ prepPackId: 'prep-1' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getJobStudyModuleMock = vi.fn()
const generateJobStudyModuleMock = vi.fn()
const toggleJobStudyModuleTopicMock = vi.fn()

vi.mock('@/lib/actions/study.action', () => ({
  getJobStudyModule: (...args: any[]) => getJobStudyModuleMock(...args),
  generateJobStudyModule: (...args: any[]) => generateJobStudyModuleMock(...args),
  toggleJobStudyModuleTopic: (...args: any[]) => toggleJobStudyModuleTopicMock(...args),
}))

describe('JobStudyModulePage (/dashboard/study/module/[prepPackId])', () => {
  it('shows generate button when module is not generated and refreshes after generating', async () => {
    const user = userEvent.setup()

    getJobStudyModuleMock.mockResolvedValueOnce({
      data: {
        id: 'prep-1',
        companyName: 'ACME',
        jobTitle: 'QA Engineer',
        moduleGenerated: false,
        moduleProgressPercent: 0,
        totalTopics: 1,
        createdAt: '2020-01-01T00:00:00.000Z',
        extractedKeywords: [],
        studyTopics: [],
        chapters: [],
        recommendedLessons: [],
        studyModuleProgress: { completedTopicIds: [], moduleProgressPercent: 0 },
      },
      error: null,
    })

    // after generate, the page refreshes by calling getJobStudyModule again
    getJobStudyModuleMock.mockResolvedValueOnce({
      data: {
        id: 'prep-1',
        companyName: 'ACME',
        jobTitle: 'QA Engineer',
        moduleGenerated: true,
        moduleProgressPercent: 0,
        totalTopics: 1,
        createdAt: '2020-01-01T00:00:00.000Z',
        extractedKeywords: [],
        studyTopics: [],
        chapters: [],
        recommendedLessons: [],
        studyModuleProgress: { completedTopicIds: [], moduleProgressPercent: 0 },
      },
      error: null,
    })

    generateJobStudyModuleMock.mockResolvedValue({ data: { ok: true }, error: null })

    const JobStudyModulePage = (await import('@/app/(dashboard)/dashboard/study/module/[prepPackId]/page')).default

    render(<JobStudyModulePage />)

    await waitFor(() => expect(getJobStudyModuleMock).toHaveBeenCalledWith('prep-1'))

    expect(screen.getByText('Generate your module curriculum')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generate Curriculum' }))

    await waitFor(() => expect(generateJobStudyModuleMock).toHaveBeenCalledWith('prep-1'))
    await waitFor(() => expect(getJobStudyModuleMock).toHaveBeenCalledTimes(2))
  }, 25_000)

  it('toggles a curriculum topic and updates progress percent', async () => {
    const user = userEvent.setup()

    getJobStudyModuleMock.mockResolvedValue({
      data: {
        id: 'prep-1',
        companyName: 'ACME',
        jobTitle: 'QA Engineer',
        moduleGenerated: true,
        moduleProgressPercent: 0,
        totalTopics: 1,
        createdAt: '2020-01-01T00:00:00.000Z',
        extractedKeywords: [],
        studyTopics: [],
        recommendedLessons: [],
        chapters: [
          {
            id: 'c-1',
            title: 'High Priority',
            description: null,
            topics: [
              {
                id: 't-1',
                title: 'Testing Strategy',
                description: 'How to test',
                estimatedMinutes: 20,
                priority: 'high',
                recommendedLessons: [],
              },
            ],
          },
        ],
        studyModuleProgress: { completedTopicIds: [], moduleProgressPercent: 0 },
      },
      error: null,
    })

    toggleJobStudyModuleTopicMock.mockResolvedValue({ data: { moduleProgressPercent: 100 }, error: null })

    const JobStudyModulePage = (await import('@/app/(dashboard)/dashboard/study/module/[prepPackId]/page')).default

    render(<JobStudyModulePage />)

    await screen.findByText('Curriculum')

    expect(screen.getByText('0% complete')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark topic "Testing Strategy" complete' }))

    await waitFor(() => expect(toggleJobStudyModuleTopicMock).toHaveBeenCalledWith('prep-1', 't-1'))

    expect(screen.getByText('100% complete')).toBeInTheDocument()
  }, 20_000)
})
