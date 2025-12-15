import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('NewJobPage', () => {
  it('renders placeholder content', async () => {
    const NewJobPage = (await import('@/app/(dashboard)/dashboard/jobs/new/page')).default
    render(<NewJobPage />)

    expect(screen.getByRole('heading', { name: 'New Job' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })
})
