import { Hero } from '@/components/landing/Hero'
import { LandingNav } from '@/components/landing/LandingNav'
import { QASection } from '@/components/landing/QASection'
import { TechStackMarquee } from '@/components/landing/TechStackMarquee'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function LandingPage() {
  return (
    <main className="relative">
      <LandingNav />
      <Hero />
      <QASection />
      <TechStackMarquee />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
