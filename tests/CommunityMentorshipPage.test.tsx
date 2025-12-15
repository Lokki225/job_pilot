import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const getMentorsMock = vi.fn()
const getMyMentorProfileMock = vi.fn()
const getMyMentorshipsMock = vi.fn()
const becomeMentorMock = vi.fn()
const requestMentorshipMock = vi.fn()
const respondToMentorshipRequestMock = vi.fn()

vi.mock('@/lib/actions/community.action', () => ({
  getMentors: (...args: any[]) => getMentorsMock(...args),
  getMyMentorProfile: (...args: any[]) => getMyMentorProfileMock(...args),
  getMyMentorships: (...args: any[]) => getMyMentorshipsMock(...args),
  becomeMentor: (...args: any[]) => becomeMentorMock(...args),
  requestMentorship: (...args: any[]) => requestMentorshipMock(...args),
  respondToMentorshipRequest: (...args: any[]) => respondToMentorshipRequestMock(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MentorshipPage (/dashboard/community/hub/mentorship)', () => {
  it('loads mentors and can request mentorship', async () => {
    const user = userEvent.setup()

    getMentorsMock.mockResolvedValue({
      data: [
        {
          id: 'm-1',
          userId: 'u-mentor',
          name: 'Mentor One',
          avatarUrl: null,
          bio: 'I can help',
          expertise: ['Interview Prep'],
          availability: 'Weekends',
          maxMentees: 3,
          currentMentees: 0,
          isActive: true,
        },
      ],
      error: null,
    })

    getMyMentorProfileMock.mockResolvedValue({ data: null, error: null })
    getMyMentorshipsMock.mockResolvedValue({ data: { asMentor: [], asMentee: [] }, error: null })

    requestMentorshipMock.mockResolvedValue({ data: { success: true }, error: null })

    const MentorshipPage = (await import('@/app/(dashboard)/dashboard/community/hub/mentorship/page')).default

    render(<MentorshipPage />)

    await screen.findByRole('heading', { name: 'Mentorship Program' })
    await screen.findByText('Mentor One')

    await user.click(screen.getByRole('button', { name: 'Request Mentorship' }))

    await user.type(
      screen.getByPlaceholderText("Introduce yourself and explain what you're hoping to learn..."),
      'Hi, I would like help'
    )

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    await waitFor(() => expect(requestMentorshipMock).toHaveBeenCalledWith('m-1', 'Hi, I would like help'))

    // after sending, it refreshes data
    await waitFor(() => expect(getMentorsMock).toHaveBeenCalledTimes(2))
  }, 25_000)

  it('can become a mentor via the dialog', async () => {
    const user = userEvent.setup()

    getMentorsMock.mockResolvedValue({ data: [], error: null })
    getMyMentorProfileMock.mockResolvedValue({ data: null, error: null })
    getMyMentorshipsMock.mockResolvedValue({ data: { asMentor: [], asMentee: [] }, error: null })

    becomeMentorMock.mockResolvedValue({ data: { success: true }, error: null })

    const MentorshipPage = (await import('@/app/(dashboard)/dashboard/community/hub/mentorship/page')).default

    render(<MentorshipPage />)

    await screen.findByRole('heading', { name: 'Mentorship Program' })

    // With no mentors, empty state has a Become a Mentor button (opens dialog)
    const becomeMentorButtons = screen.getAllByRole('button', { name: 'Become a Mentor' })
    await user.click(becomeMentorButtons[0]!)

    await user.type(
      await screen.findByPlaceholderText('Tell potential mentees about yourself and your experience...'),
      'I have experience'
    )

    await user.type(
      screen.getByPlaceholderText('e.g., Software Engineering, Resume Writing, Interview Prep'),
      'Resume Writing'
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(becomeMentorMock).toHaveBeenCalledWith({
        bio: 'I have experience',
        expertise: ['Resume Writing'],
        availability: undefined,
        maxMentees: 3,
      })
    )

    // after saving, it refreshes data
    await waitFor(() => expect(getMentorsMock).toHaveBeenCalledTimes(2))
  }, 25_000)
})
