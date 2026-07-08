import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AnnouncementFilters } from '@/data/api/announcements'
import { makeEntityMutation } from './makeEntityMutation'
import { ANNOUNCEMENTS_KEY } from './queryKeys'

/**
 * Read a Course's feed through the scope seam (ADR-0040): admin all, teacher own
 * Courses, student enrolled Courses, TCU the assigned Course. Role/userId are in
 * the key so per-viewer cache entries stay isolated, mirroring the other scoped
 * read hooks.
 */
export function useAnnouncements(filters: AnnouncementFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...ANNOUNCEMENTS_KEY, role, userId, filters],
    queryFn: () => api.announcements.list(filters),
  })
}

export const useCreateAnnouncement = makeEntityMutation('createAnnouncement')({
  toastKey: 'toasts.announcementPosted',
})

export const useDeleteAnnouncement = makeEntityMutation('deleteAnnouncement')({
  toastKey: 'toasts.announcementDeleted',
})
