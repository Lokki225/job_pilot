import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next/image', () => ({
  default: (props: any) => {
    const { src, alt, ...rest } = props
    return <img src={typeof src === 'string' ? src : ''} alt={alt} {...rest} />
  },
}))

const toastMock = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
  toast: (args: any) => toastMock(args),
}))

vi.mock('@/components/notifications', () => ({
  NotificationSettings: () => <div>NotificationSettings</div>,
}))

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">ThemeToggle</button>,
}))

vi.mock('@/components/ui/language-selector', () => ({
  LanguageSelector: () => <div>LanguageSelector</div>,
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        remove: vi.fn(),
        upload: vi.fn(),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file' } }),
      }),
    },
  },
}))

const getCurrentUserMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => getCurrentUserMock(),
  logout: () => logoutMock(),
}))

const getProfileMock = vi.fn()
const upsertProfileMock = vi.fn()

vi.mock('@/lib/actions/profile.action', () => ({
  getProfile: (...args: any[]) => getProfileMock(...args),
  upsertProfile: (...args: any[]) => upsertProfileMock(...args),
  getProfileDetails: vi.fn(),
  updateCompletionScore: vi.fn(),
}))

const getJobPreferencesMock = vi.fn()
const upsertJobPreferencesMock = vi.fn()

vi.mock('@/lib/actions/job-preferences.action', () => ({
  getJobPreferences: (...args: any[]) => getJobPreferencesMock(...args),
  upsertJobPreferences: (...args: any[]) => upsertJobPreferencesMock(...args),
}))

const listResumesMock = vi.fn()
vi.mock('@/lib/actions/resume.action', () => ({
  listResumes: (...args: any[]) => listResumesMock(...args),
  createResume: vi.fn(),
  deleteResume: vi.fn(),
}))

describe('JobSettingsPage (/dashboard/settings)', () => {
  it('loads settings data and can save changes + logout', async () => {
    const user = userEvent.setup()

    getCurrentUserMock.mockResolvedValue({ user: { id: 'u-1', email: 'user@example.com' }, error: null })

    getProfileMock.mockResolvedValue({
      data: {
        id: 'p-1',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '123',
        location: 'Remote',
        headline: 'QA Engineer',
        bio: 'Bio',
        website: 'example.com',
        linkedinUrl: 'linkedin.com/in/jane',
        githubUrl: 'github.com/jane',
        twitterUrl: '',
        avatarUrl: '',
        languages: ['English'],
      },
      error: null,
    })

    getJobPreferencesMock.mockResolvedValue({
      data: {
        jobTitles: ['QA Engineer'],
        keywords: ['testing'],
        workTypes: ['Full-time'],
        remoteOptions: ['Remote'],
        industries: ['Tech'],
        companySize: ['Startup'],
        excludeCompanies: [],
        experienceLevel: 'Mid-level',
        yearsExperience: 3,
        minSalary: 50000,
        maxSalary: 80000,
        currency: 'USD',
        locations: ['Remote'],
        skills: ['TypeScript'],
        autoSearch: false,
        notifyOnMatch: true,
        searchFrequency: 'daily',
      },
      error: null,
    })

    listResumesMock.mockResolvedValue({ data: [], error: null })

    upsertProfileMock.mockResolvedValue({ data: { success: true }, error: null })
    upsertJobPreferencesMock.mockResolvedValue({ data: { success: true }, error: null })

    logoutMock.mockResolvedValue({ success: true, error: null })

    const SettingsPage = (await import('@/app/(dashboard)/dashboard/settings/page')).default

    render(<SettingsPage />)

    await screen.findByRole('heading', { name: 'Settings' })

    // Save changes calls both upsertProfile and upsertJobPreferences
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(upsertProfileMock).toHaveBeenCalled())
    await waitFor(() => expect(upsertJobPreferencesMock).toHaveBeenCalled())

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Settings saved' })
    )

    // Navigate to App & Account tab and logout
    await user.click(screen.getByRole('button', { name: 'App & Account' }))
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    await waitFor(() => expect(logoutMock).toHaveBeenCalled())
    expect(pushMock).toHaveBeenCalledWith('/login')
  }, 25_000)
})
