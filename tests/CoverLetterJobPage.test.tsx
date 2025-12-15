import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

describe('CoverLetterPage (/dashboard/letters/[jobId])', () => {
  it('generates a cover letter when required fields are provided', async () => {
    vi.useFakeTimers()
    try {
      const CoverLetterPage = (await import('@/app/(dashboard)/dashboard/letters/[jobId]/page')).default

      render(<CoverLetterPage />)

      expect(screen.getByRole('heading', { name: 'AI Cover Letter Generator' })).toBeInTheDocument()

      fireEvent.change(screen.getByPlaceholderText('e.g., Senior Frontend Developer'), {
        target: { value: 'QA Engineer' },
      })
      fireEvent.change(screen.getByPlaceholderText('e.g., Stripe'), {
        target: { value: 'ACME' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Generate Cover Letter' }))

      expect(screen.getByText('Generating Your Letter...')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.getByText('Cover Letter Generated!')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  }, 20_000)
})
