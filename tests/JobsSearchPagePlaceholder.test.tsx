import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('JobSearchPage (placeholder)', () => {
  it('renders placeholder content', async () => {
    const JobSearchPage = (await import('@/app/(dashboard)/dashboard/jobs/search/page')).default
    render(<JobSearchPage />)

    expect(screen.getByRole('heading', { name: 'Job Search' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })
})
