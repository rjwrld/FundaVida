import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useStore, userIdForRole } from '@/data/store'
import { landingPathForRole } from '@/lib/roleLanding'
import { fullName } from '@/lib/personName'
import { staggerEntrance } from '@/lib/motion'
import type { Role } from '@/types'
import { GithubMark } from './GithubMark'
import { HighlighterSmear } from './HighlighterSmear'
import { PersonaBadge } from './PersonaBadge'

/**
 * Admin is a sentinel id, not a seeded person (ADR-0049), so its badge names
 * the office. A proper noun, never passed through t() (the ADR-0017 rule).
 */
const ADMIN_OFFICE = 'Fundación Vida Nueva'

interface BadgeSpec {
  role: Role
  tilt: number
  tiltIn: number
  delay: number
}

/** 2+2 flanking the headline on desktop; deal-in runs left column then right. */
const LEFT_BADGES: BadgeSpec[] = [
  { role: 'admin', tilt: -3.5, tiltIn: -9, delay: 0.55 },
  { role: 'teacher', tilt: 2.5, tiltIn: 8, delay: 0.7 },
]
const RIGHT_BADGES: BadgeSpec[] = [
  { role: 'student', tilt: 3.5, tiltIn: 9, delay: 0.85 },
  { role: 'tcu', tilt: -2.5, tiltIn: -8, delay: 1.0 },
]

export function Hero() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const setRole = useStore((s) => s.setRole)
  const teachers = useStore((s) => s.teachers)
  const students = useStore((s) => s.students)
  const tcuTrainees = useStore((s) => s.tcuTrainees)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)

  const personaName = (role: Role): string => {
    const id = userIdForRole(role)
    switch (role) {
      case 'admin':
        return ADMIN_OFFICE
      case 'teacher': {
        const person = teachers.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
      case 'student': {
        const person = students.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
      case 'tcu': {
        const person = tcuTrainees.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
    }
  }

  // The badge entry: sign in as the role, then land where the role should
  // land — the teacher badge inherits the golden-path drop onto its gradeable
  // Course (ADR-0007) via landingPathForRole.
  const enterAs = (role: Role) => {
    setRole(role)
    navigate(
      landingPathForRole(role, { courses, enrollments, grades, currentUserId: userIdForRole(role) })
    )
  }

  // The admin fast path — the other explicit admin CTA (with the nav pill)
  // allowed to hard-code the role (ADR-0049).
  const enterAsAdmin = () => {
    setRole('admin')
    navigate('/app')
  }

  const center = staggerEntrance(reduce)

  const renderBadge = ({ role, tilt, tiltIn, delay }: BadgeSpec) => (
    <PersonaBadge
      key={role}
      role={role}
      roleLabel={t(`roles.${role}.label`)}
      name={personaName(role)}
      desc={t(`landing.badges.${role}.desc`)}
      tilt={tilt}
      tiltIn={tiltIn}
      delay={delay}
      onEnter={enterAs}
    />
  )

  return (
    <section className="grid-paper overflow-hidden border-b">
      <div className="container mx-auto grid gap-10 px-6 py-14 lg:grid-cols-[230px_minmax(0,1fr)_230px] lg:items-center lg:gap-8 lg:px-10 lg:py-24">
        <div className="order-2 grid grid-cols-2 gap-4 lg:order-none lg:flex lg:flex-col lg:gap-7">
          {LEFT_BADGES.map(renderBadge)}
        </div>

        <motion.div {...center.container} className="order-1 text-center lg:order-none">
          <motion.p
            variants={center.item.variants}
            transition={center.item.transition}
            className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-primary"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            <span>
              <Trans
                i18nKey="landing.hero.eyebrow"
                components={{ muted: <span key="muted" className="text-muted-foreground" /> }}
              />
            </span>
          </motion.p>
          <motion.h1
            variants={center.item.variants}
            transition={center.item.transition}
            className="mt-5 font-display text-[clamp(3rem,7.2vw,6.4rem)] font-black uppercase leading-[0.96] tracking-[-0.03em] text-balance"
          >
            <Trans
              i18nKey="landing.hero.headline"
              components={{
                smear: <HighlighterSmear key="smear" delay={0.9} />,
                accent: <span key="accent" className="text-primary" />,
              }}
            />
          </motion.h1>
          <motion.p
            variants={center.item.variants}
            transition={center.item.transition}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance"
          >
            {t('landing.hero.subhead')}
          </motion.p>
          <motion.div
            variants={center.item.variants}
            transition={center.item.transition}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" onClick={enterAsAdmin} className="group gap-2">
              {t('landing.hero.primaryCta')}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/rjwrld/FundaVida"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <GithubMark size={16} />
                {t('landing.hero.secondaryCta')}
              </a>
            </Button>
          </motion.div>
          <motion.p
            variants={center.item.variants}
            transition={center.item.transition}
            className="mt-5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            <Trans
              i18nKey="landing.hero.footnote"
              components={{ green: <span key="green" className="text-primary" /> }}
            />
          </motion.p>
        </motion.div>

        <div className="order-3 grid grid-cols-2 gap-4 lg:order-none lg:flex lg:flex-col lg:gap-7">
          {RIGHT_BADGES.map(renderBadge)}
        </div>
      </div>
    </section>
  )
}
