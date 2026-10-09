import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { PostAnnouncementDialog } from '@/components/announcements/PostAnnouncementDialog'
import { useStore } from '@/data/store'
import { shortCourseName } from '@/lib/courseName'
import type { Course } from '@/types'

function renderDialog(props: Partial<React.ComponentProps<typeof PostAnnouncementDialog>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const courses = useStore.getState().courses.filter((c) => c.status === 'published')
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <PostAnnouncementDialog
          open
          onClose={() => undefined}
          courses={courses.slice(0, 1)}
          {...props}
        />
      </QueryClientProvider>
    </I18nProvider>
  )
}

const firstLive = (): Course => {
  const course = useStore.getState().courses.find((c) => c.status === 'published')
  if (!course) throw new Error('seed: no published course')
  return course
}

// A post has no undo (ADR-0040), so the dialog never posts somewhere unnamed.
describe('<PostAnnouncementDialog /> — names where the post goes', () => {
  beforeEach(() => {
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('names the one composable course when there is nothing to choose', () => {
    const course = firstLive()
    renderDialog({ courses: [course] })

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(`Posting to ${shortCourseName(course)}`)).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('offers the picker when there is a choice', () => {
    const courses = useStore
      .getState()
      .courses.filter((c) => c.status === 'published')
      .slice(0, 2)
    renderDialog({ courses })

    expect(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Choose a course' })
    ).toBeInTheDocument()
  })

  // On a Course's own page the course is the page itself.
  it('stays quiet about the course on that course’s page', () => {
    const course = firstLive()
    renderDialog({ courses: [course], courseIsContext: true })

    expect(screen.queryByText(/^Posting to /)).not.toBeInTheDocument()
  })
})
