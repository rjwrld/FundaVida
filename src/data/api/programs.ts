import type { Program } from '@/types'
import { scopedGet, scopedList } from './scopedRead'

// The Program catalog read (ADR-0015). Like every other list/detail, it goes
// through the scope seam (ADR-0008) rather than reading the store raw: the
// 'programs' token is 'all' for the viewing roles (org-wide catalog) and 'none'
// for tcu, whose read seam is closed (ADR-0035).
export const programsApi = {
  list(): Promise<Program[]> {
    return scopedList('programs', {})
  },
  get(id: string): Promise<Program | null> {
    return scopedGet('programs', id)
  },
}
