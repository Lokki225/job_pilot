import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const getSuccessStoriesMock = vi.fn()
const getStoryIndustriesMock = vi.fn()
const getStoryTagsMock = vi.fn()
const likeStoryMock = vi.fn()
const unlikeStoryMock = vi.fn()
const bookmarkStoryMock = vi.fn()
const unbookmarkStoryMock = vi.fn()

vi.mock('@/lib/actions/success-stories.action', () => ({
  getSuccessStories: (...args: any[]) => getSuccessStoriesMock(...args),
  getStoryIndustries: (...args: any[]) => getStoryIndustriesMock(...args),
  getStoryTags: (...args: any[]) => getStoryTagsMock(...args),
  likeStory: (...args: any[]) => likeStoryMock(...args),
  unlikeStory: (...args: any[]) => unlikeStoryMock(...args),
  bookmarkStory: (...args: any[]) => bookmarkStoryMock(...args),
  unbookmarkStory: (...args: any[]) => unbookmarkStoryMock(...args),
}))

describe('CommunityPage (/dashboard/community)', () => {
  it('loads and renders stories and can like + bookmark with stable aria-labels', async () => {
    const user = userEvent.setup()

    getSuccessStoriesMock.mockResolvedValue({
      data: {
        stories: [
          {
            id: 's-1',
            userId: 'u1',
            jobTitle: 'QA Engineer',
            companyName: 'ACME',
            industry: 'Tech',
            location: 'Remote',
            title: 'I made it!',
            story: 'Long story',
            tags: ['interview'],
            coverImageUrl: null,
            isAnonymous: false,
            displayName: null,
            isFeatured: false,
            viewCount: 10,
            likeCount: 1,
            hasLiked: false,
            hasBookmarked: false,
            authorName: 'Jane',
            createdAt: '2020-01-01T00:00:00.000Z',
          },
        ],
      },
      error: null,
    })

    getStoryIndustriesMock.mockResolvedValue({ data: ['Tech'], error: null })
    getStoryTagsMock.mockResolvedValue({ data: ['interview'], error: null })

    likeStoryMock.mockResolvedValue({ data: { success: true }, error: null })
    bookmarkStoryMock.mockResolvedValue({ data: { success: true }, error: null })

    const CommunityPage = (await import('@/app/(dashboard)/dashboard/community/page')).default

    render(<CommunityPage />)

    await waitFor(() => expect(getSuccessStoriesMock).toHaveBeenCalled(), { timeout: 5_000 })
    await screen.findByText('I made it!', undefined, { timeout: 5_000 })

    expect(screen.getByRole('heading', { name: 'Success Stories' })).toBeInTheDocument()
    expect(screen.getByText('I made it!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Like story "I made it!"' }))
    await waitFor(() => expect(likeStoryMock).toHaveBeenCalledWith('s-1'))

    await user.click(screen.getByRole('button', { name: 'Bookmark story "I made it!"' }))
    await waitFor(() => expect(bookmarkStoryMock).toHaveBeenCalledWith('s-1'))
  }, 25_000)
})
