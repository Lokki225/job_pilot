import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationKanban, type JobApplication } from '@/components/jobs/ApplicationKanban'

describe('ApplicationKanban', () => {
  it('renders applications and triggers onViewDetails when clicking card title', async () => {
    const app: JobApplication = {
      id: 'a1',
      jobTitle: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      status: 'WISHLIST',
      appliedAt: null,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      jobPostUrl: 'https://example.com/job',
      salary: null,
      isFavorite: false,
    }

    const onStatusChange = vi.fn()
    const onDelete = vi.fn()
    const onViewDetails = vi.fn()
    const onToggleFavorite = vi.fn()

    render(
      <ApplicationKanban
        applications={[app]}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
        onToggleFavorite={onToggleFavorite}
      />
    )

    await userEvent.click(screen.getByRole('heading', { name: 'QA Engineer' }))

    expect(onViewDetails).toHaveBeenCalledWith(app)
  })

  it('can open card actions and call onDelete', async () => {
    const app: JobApplication = {
      id: 'a1',
      jobTitle: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      status: 'WISHLIST',
      appliedAt: null,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      jobPostUrl: null,
      salary: null,
      isFavorite: false,
    }

    const onDelete = vi.fn()

    render(
      <ApplicationKanban
        applications={[app]}
        onStatusChange={vi.fn()}
        onDelete={onDelete}
        onViewDetails={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    )

    const cardHeading = screen.getByRole('heading', { name: 'QA Engineer' })
    const card = cardHeading.closest<HTMLElement>('[draggable="true"]')
    if (!card) throw new Error('Could not locate application card container')

    await userEvent.click(within(card).getByRole('button', { name: 'Application actions' }))
    await userEvent.click(await screen.findByText('Delete'))

    expect(onDelete).toHaveBeenCalledWith('a1')
  })
})
