import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'

const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

const createResumeMock = vi.fn()
vi.mock('@/lib/actions/resume.action', () => ({
  createResume: (...args: any[]) => createResumeMock(...args),
}))

const getUserMock = vi.fn()
const storageUploadMock = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => getUserMock(...args),
    },
    storage: {
      from: () => ({
        upload: (...args: any[]) => storageUploadMock(...args),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/resume.pdf' } }),
      }),
    },
  },
}))

describe('CVUploadPage (/dashboard/onboarding/resume)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
    backMock.mockReset()

    // mock fetch parse-resume
    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uploads a resume and enables continue after processing', async () => {
    vi.useFakeTimers()

    getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    storageUploadMock.mockResolvedValue({ error: null })
    createResumeMock.mockResolvedValue({ data: { id: 'resume-1' }, error: null })

    const CVUploadPage = (await import('@/app/(dashboard)/dashboard/onboarding/resume/page')).default

    render(<CVUploadPage />)

    expect(screen.getByRole('heading', { name: 'Upload Your Resume' })).toBeInTheDocument()

    const input = document.getElementById('cv-resume') as HTMLInputElement
    expect(input).toBeTruthy()

    const file = new File(['hello'], 'resume.pdf', { type: 'application/pdf' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    expect(screen.getByText('resume.pdf')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload Resume' }))
    })

    // Let microtasks run until the 5s wait is scheduled
    await act(async () => {
      await vi.runAllTicks()
    })

    // Advance the internal 5s wait + final 0.5s cleanup timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })

    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    expect(continueBtn).toBeEnabled()

    await act(async () => {
      fireEvent.click(continueBtn)
    })

    expect(pushMock).toHaveBeenCalledWith('/dashboard/onboarding/preferences')
  }, 25_000)
})
