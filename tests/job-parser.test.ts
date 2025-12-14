import { describe, expect, it } from 'vitest'
import { parseJobPosting } from '@/lib/utils/job-parser'

describe('parseJobPosting', () => {
  it('extracts title, company, location, job type, salary, and url', () => {
    const text = `Senior QA Engineer\nCompany: ACME Corp\nLocation: Remote\nJob Type: Full-time\nSalary: $100k-$120k\n\nJob Description:\nWe are looking for a QA Engineer to help improve our test automation.\n\nRequirements:\n- Playwright\n- TypeScript\n\nhttps://example.com/jobs/123`

    const parsed = parseJobPosting(text)

    expect(parsed.jobTitle).toBe('Senior QA Engineer')
    expect(parsed.company).toBe('ACME Corp')
    expect(parsed.location).toMatch(/remote/i)
    expect(parsed.jobType).toBe('Full-time')
    expect(parsed.salary).toContain('$100k-$120k')
    expect(parsed.jobPostUrl).toBe('https://example.com/jobs/123')
    expect(parsed.source).toBe('PASTED')
    expect(parsed.isPasted).toBe(true)
  })
})
