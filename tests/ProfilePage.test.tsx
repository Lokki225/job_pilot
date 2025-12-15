import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const getCurrentUserMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => getCurrentUserMock(),
}))

const getProfileDetailsMock = vi.fn()
const upsertProfileMock = vi.fn()
const updateCompletionScoreMock = vi.fn()

vi.mock('@/lib/actions/profile.action', () => ({
  getProfileDetails: (...args: any[]) => getProfileDetailsMock(...args),
  upsertProfile: (...args: any[]) => upsertProfileMock(...args),
  updateCompletionScore: (...args: any[]) => updateCompletionScoreMock(...args),
  getProfile: vi.fn(),
}))

vi.mock('@/lib/actions/skill.action', () => ({
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}))

vi.mock('@/lib/actions/experience.action', () => ({
  createExperience: vi.fn(),
  updateExperience: vi.fn(),
  deleteExperience: vi.fn(),
}))

vi.mock('@/lib/actions/certification.action', () => ({
  createCertification: vi.fn(),
  updateCertification: vi.fn(),
  deleteCertification: vi.fn(),
}))

vi.mock('@/lib/actions/education.action', () => ({
  createEducation: vi.fn(),
  updateEducation: vi.fn(),
  deleteEducation: vi.fn(),
}))

vi.mock('@/lib/utils/upload', () => ({
  uploadAvatar: vi.fn(),
}))

vi.mock('@/components/profile/ProfileTabs', () => ({
  ProfileTabs: () => <div>ProfileTabs</div>,
}))

vi.mock('@/components/profile/ProfileOverview', () => ({
  ProfileOverview: () => <div>ProfileOverview</div>,
}))

vi.mock('@/components/shared/ResumePreviewModal', () => ({
  ResumePreviewModal: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage (/dashboard/profile)', () => {
  it('loads profile and can save via ProfileHeader', async () => {
    const user = userEvent.setup()

    getCurrentUserMock.mockResolvedValue({
      user: { id: 'u-1', email: 'user@example.com' },
      error: null,
    })

    getProfileDetailsMock.mockResolvedValue({
      data: {
        profile: {
          id: 'p-1',
          firstName: 'Jane',
          lastName: 'Doe',
          headline: 'QA Engineer',
          phone: '123',
          location: 'Remote',
          bio: 'Bio',
          website: 'example.com',
          linkedinUrl: 'linkedin.com/in/jane',
          githubUrl: 'github.com/jane',
          avatarUrl: null,
          resumeUrl: null,
          completionScore: 40,
          languages: ['English'],
        },
        skills: [],
        experiences: [],
        educations: [],
        certifications: [],
      },
      error: null,
    })

    upsertProfileMock.mockResolvedValue({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        headline: 'QA Engineer',
        phone: '123',
        location: 'Remote',
        bio: 'Bio',
        website: 'example.com',
        linkedinUrl: 'linkedin.com/in/jane',
        githubUrl: 'github.com/jane',
        avatarUrl: null,
        resumeUrl: null,
      },
      error: null,
    })

    updateCompletionScoreMock.mockResolvedValue({
      data: { completionScore: 50 },
      error: null,
    })

    const ProfilePage = (await import('@/app/(dashboard)/dashboard/profile/page')).default

    render(<ProfilePage />)

    await waitFor(() => expect(getProfileDetailsMock).toHaveBeenCalledWith('u-1'))

    // name visible in header
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(upsertProfileMock).toHaveBeenCalled())
    expect(upsertProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        headline: 'QA Engineer',
        phone: '123',
        location: 'Remote',
        bio: 'Bio',
        website: 'example.com',
        linkedinUrl: 'linkedin.com/in/jane',
        githubUrl: 'github.com/jane',
      })
    )

    await waitFor(() => expect(updateCompletionScoreMock).toHaveBeenCalled())
    expect(await screen.findByText('Profile saved successfully!')).toBeInTheDocument()
  }, 25_000)
})
