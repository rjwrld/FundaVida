import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoResults } from '@/components/shared/NoResults'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { usePrograms } from '@/hooks/api'
import { listViewState } from '@/lib/listViewState'
import { fadeUp, staggerContainer, transitionFast } from '@/lib/motion'

// The read-only Program catalog (ADR-0015). Data comes through the scope seam
// (usePrograms → programsApi → applyScope), never a raw store read. Programs are
// a fixed, org-wide taxonomy, so there is no create/edit/delete here.
export function ProgramsListPage() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { data: programs = [], isLoading } = usePrograms()

  return (
    <div className="space-y-6">
      <PageHeader title={t('programs.list.title')} description={t('programs.list.subtitle')} />

      <ListView
        state={listViewState({ isLoading, count: programs.length, hasFilters: false })}
        skeleton={<SkeletonTable rows={6} columns={1} />}
        noResults={<NoResults message={t('programs.list.empty')} />}
        content={
          // Staggered card entrance on the DataTable card-grid pattern (phase
          // 6a): the grid staggers its children, each card fades up, and
          // reduced motion opts the whole grid out.
          <motion.ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate={reduce ? false : 'visible'}
          >
            {programs.map((program) => (
              <motion.li
                key={program.id}
                variants={reduce ? undefined : fadeUp}
                transition={transitionFast}
              >
                <Link
                  to={`/app/programs/${program.id}`}
                  className="group block h-full focus-visible:outline-hidden"
                  aria-label={program.name}
                >
                  <Card className="h-full transition-colors hover:border-primary/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span>{program.name}</span>
                        <ArrowRight
                          size={16}
                          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {program.description}
                    </CardContent>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        }
      />
    </div>
  )
}
