import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/study/StudyPlanEditor', () => ({
  StudyPlanEditor: ({ planId }: any) => <div>StudyPlanEditor {planId}</div>,
}))

const getMyStudyPlansMock = vi.fn()
const createStudyPlanMock = vi.fn()
const deleteStudyPlanMock = vi.fn()

vi.mock('@/lib/actions/custom-study-plan.action', () => ({
  getMyStudyPlans: (...args: any[]) => getMyStudyPlansMock(...args),
  createStudyPlan: (...args: any[]) => createStudyPlanMock(...args),
  deleteStudyPlan: (...args: any[]) => deleteStudyPlanMock(...args),
}))

describe('MyStudyPlansPage', () => {
  it('loads plans and can open the editor from the list', async () => {
    const user = userEvent.setup()

    getMyStudyPlansMock.mockResolvedValue({
      data: [
        {
          id: 'plan-1',
          userId: 'u1',
          title: 'JavaScript Fundamentals',
          description: 'Basics for interviews',
          icon: null,
          coverImageUrl: null,
          isPublic: false,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
          chapters: [
            {
              id: 'ch-1',
              planId: 'plan-1',
              orderIndex: 1,
              title: 'Intro',
              description: null,
              createdAt: '2020-01-01T00:00:00.000Z',
              lessons: [
                {
                  id: 'l-1',
                  chapterId: 'ch-1',
                  orderIndex: 1,
                  title: 'Variables',
                  content: '...',
                  estimatedMinutes: 10,
                  createdAt: '2020-01-01T00:00:00.000Z',
                  quiz: null,
                },
              ],
            },
          ],
        },
      ],
      error: null,
    })

    const MyStudyPlansPage = (await import('@/app/(dashboard)/dashboard/study/my-plans/page')).default

    render(<MyStudyPlansPage />)

    await screen.findByRole('heading', { name: 'My Study Plans' })
    await screen.findByText('JavaScript Fundamentals')

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    await screen.findByText('StudyPlanEditor plan-1')
  }, 20_000)

  it('creates a plan from the dialog and opens the editor', async () => {
    const user = userEvent.setup()

    getMyStudyPlansMock.mockResolvedValueOnce({ data: [], error: null })
    getMyStudyPlansMock.mockResolvedValueOnce({ data: [], error: null })

    createStudyPlanMock.mockResolvedValue({ data: { id: 'plan-2' }, error: null })

    const MyStudyPlansPage = (await import('@/app/(dashboard)/dashboard/study/my-plans/page')).default

    render(<MyStudyPlansPage />)

    await screen.findByRole('heading', { name: 'My Study Plans' })

    const createButtons = screen.getAllByRole('button', { name: 'Create Study Plan' })
    await user.click(createButtons[0]!)

    await user.type(screen.getByPlaceholderText('e.g., JavaScript Fundamentals'), 'New Plan')

    await user.click(screen.getByRole('button', { name: 'Create Plan' }))

    await waitFor(() => expect(createStudyPlanMock).toHaveBeenCalledWith({ title: 'New Plan', description: undefined }))

    await screen.findByText('StudyPlanEditor plan-2')
  }, 25_000)
})
