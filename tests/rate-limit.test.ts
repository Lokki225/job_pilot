import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

describe('checkRateLimit', () => {
  it('allows up to limit in window and blocks after', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))

    const { checkRateLimit } = await import('@/lib/utils/rate-limit')

    expect(checkRateLimit('k', 2, 1000).allowed).toBe(true)
    expect(checkRateLimit('k', 2, 1000).allowed).toBe(true)
    expect(checkRateLimit('k', 2, 1000).allowed).toBe(false)
  })

  it('resets after the window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))

    const { checkRateLimit } = await import('@/lib/utils/rate-limit')

    expect(checkRateLimit('k', 1, 1000).allowed).toBe(true)
    expect(checkRateLimit('k', 1, 1000).allowed).toBe(false)

    vi.advanceTimersByTime(1001)

    expect(checkRateLimit('k', 1, 1000).allowed).toBe(true)
  })
})
