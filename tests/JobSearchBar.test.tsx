import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobSearchBar } from '@/components/jobs/JobSearchBar'

describe('JobSearchBar', () => {
  it('calls onSearch with typed query/location when clicking Search', async () => {
    const onSearch = vi.fn()
    render(<JobSearchBar onSearch={onSearch} />)

    await userEvent.type(
      screen.getByPlaceholderText('Job title, keywords, or company...'),
      'qa engineer'
    )
    await userEvent.type(
      screen.getByPlaceholderText('City, state, or remote'),
      'remote'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'qa engineer', location: 'remote' })
    )
  })

  it('can toggle remote filter and apply filters', async () => {
    const onSearch = vi.fn()
    render(<JobSearchBar onSearch={onSearch} />)

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remote only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ remote: true }))
  })
})
