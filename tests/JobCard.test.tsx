import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobCard } from '@/components/jobs/JobCard'
import type { NormalizedJob } from '@/lib/services/job-search/types'

describe('JobCard', () => {
  it('calls onViewDetails when clicking View Details', async () => {
    const job: NormalizedJob = {
      id: '1',
      title: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      description: 'Test things',
      applyUrl: 'https://example.com/apply',
      source: 'JSEARCH',
    }

    const onViewDetails = vi.fn()

    render(<JobCard job={job} onViewDetails={onViewDetails} />)

    await userEvent.click(screen.getByRole('button', { name: 'View Details' }))

    expect(onViewDetails).toHaveBeenCalledWith(job)
  })

  it('opens apply url and calls onApply when clicking Apply Now', async () => {
    const job: NormalizedJob = {
      id: '1',
      title: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      description: 'Test things',
      applyUrl: 'https://example.com/apply',
      source: 'JSEARCH',
    }

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any)
    const onApply = vi.fn()

    render(<JobCard job={job} onApply={onApply} />)

    await userEvent.click(screen.getByRole('button', { name: /apply now/i }))

    expect(openSpy).toHaveBeenCalledWith('https://example.com/apply', '_blank')
    expect(onApply).toHaveBeenCalledWith(job)
  })

  it('calls onSave when toggling save', async () => {
    const job: NormalizedJob = {
      id: '1',
      title: 'QA Engineer',
      company: 'ACME',
      location: 'Remote',
      description: 'Test things',
      applyUrl: 'https://example.com/apply',
      source: 'JSEARCH',
    }

    const onSave = vi.fn()

    render(<JobCard job={job} onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save job' }))

    expect(onSave).toHaveBeenCalledWith('1')
  })
})
