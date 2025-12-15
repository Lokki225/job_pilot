import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

const upsertJobPreferencesMock = vi.fn()
vi.mock('@/lib/actions/job-preferences.action', () => ({
  upsertJobPreferences: (...args: any[]) => upsertJobPreferencesMock(...args),
}))

const getUserMock = vi.fn()
const singleMock = vi.fn()
const eqMock = vi.fn((..._args: any[]) => ({ single: (...args: any[]) => singleMock(...args) }))
const selectMock = vi.fn((..._args: any[]) => ({ eq: (...args: any[]) => eqMock(...args) }))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => getUserMock(...args),
    },
    from: (...args: any[]) => ({ select: (...args2: any[]) => selectMock(...args2) }),
  },
}))

describe('JobPreferencesPage (/dashboard/onboarding/preferences)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a job title and saves preferences then redirects', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    singleMock.mockResolvedValue({ data: null })

    upsertJobPreferencesMock.mockResolvedValue({ data: { id: 'pref-1' }, error: null })

    const JobPreferencesPage = (await import('@/app/(dashboard)/dashboard/onboarding/preferences/page')).default

    render(<JobPreferencesPage />)

    expect(await screen.findByText('Set Your Job Preferences')).toBeInTheDocument()

    // Enable fake timers only after initial async render is complete.
    vi.useFakeTimers()

    const input = screen.getByPlaceholderText('e.g., Frontend Developer')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Frontend Developer' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    })

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }))
      await vi.runAllTicks()
    })

    expect(upsertJobPreferencesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jobTitles: ['Frontend Developer'],
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(pushMock).toHaveBeenCalledWith('/dashboard?onboarding_complete=true')
  }, 25_000)

  it('can skip preferences', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    singleMock.mockResolvedValue({ data: null })

    const JobPreferencesPage = (await import('@/app/(dashboard)/dashboard/onboarding/preferences/page')).default

    render(<JobPreferencesPage />)

    await screen.findByText('Set Your Job Preferences')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip for Now' }))
    })

    expect(pushMock).toHaveBeenCalledWith('/dashboard?onboarding_complete=true')
  }, 20_000)
})
