import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } }),
    },
  },
}))

describe('WelcomePage (/dashboard/onboarding/welcome)', () => {
  it('renders and continues to resume step', async () => {
    const user = userEvent.setup()

    const WelcomePage = (await import('@/app/(dashboard)/dashboard/onboarding/welcome/page')).default

    render(<WelcomePage />)

    expect(
      screen.getByText(/Welcome to/i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Get Started' }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/onboarding/resume')
  }, 20_000)
})
