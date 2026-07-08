import type { Announcement } from '@/types'
import { scopedList } from './scopedRead'

export interface AnnouncementFilters {
  courseId?: string
}

function applyFilters(announcements: Announcement[], filters: AnnouncementFilters): Announcement[] {
  return announcements.filter((a) => {
    if (filters.courseId && a.courseId !== filters.courseId) return false
    return true
  })
}

// The feed reads through the scope seam (ADR-0040): admin all, teacher own
// Courses, student enrolled Courses, TCU the assigned Course — the token is
// interpreted in the scope layer, never here. Newest-first so the feed and the
// dashboard's "latest few" (ADR-0043) share one order.
export const announcementsApi = {
  async list(filters: AnnouncementFilters = {}): Promise<Announcement[]> {
    const items = await scopedList('announcements', filters, applyFilters)
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
}
