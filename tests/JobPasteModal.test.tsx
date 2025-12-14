import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobPasteModal } from '@/components/jobs/JobPasteModal'

describe('JobPasteModal', () => {
  it(
    'extracts details (regex mode) and saves to applications',
    async () => {
    process.env.NEXT_PUBLIC_DISABLE_AI_PARSING = '1'

    const user = userEvent.setup()

    const onClose = vi.fn()
    const onJobParsed = vi.fn()

    render(<JobPasteModal isOpen={true} onClose={onClose} onJobParsed={onJobParsed} />)

    const posting = `Senior QA Engineer\nCompany: E2E Test Corp\nLocation: Remote\nJob Type: Full-time\nSalary: $100k-$120k\n\nJob Description:\nWe are looking for a QA Engineer to help improve our test automation.\n\nRequirements:\n- Playwright\n- TypeScript\n`

    const textarea = screen.getByPlaceholderText(
      'Paste the complete job posting here... Include title, company, description, requirements, etc.'
    )

    await user.click(textarea)
    await user.paste(posting)

    await user.click(screen.getByRole('button', { name: 'Extract Job Details' }))

    await screen.findByText('Job Details Extracted Successfully!')
    await screen.findByRole('heading', { name: 'Senior QA Engineer' })
    await screen.findByText('E2E Test Corp')

    await user.click(screen.getByRole('button', { name: 'Save to Applications' }))

    expect(onJobParsed).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitle: 'Senior QA Engineer', company: 'E2E Test Corp' })
    )
    expect(onClose).toHaveBeenCalled()
    },
    15_000
  )
})
