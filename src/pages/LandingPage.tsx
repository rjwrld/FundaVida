import { Hero } from '@/components/landing/Hero'
import { LandingNav } from '@/components/landing/LandingNav'
import { QASection } from '@/components/landing/QASection'
import { StackGrid } from '@/components/landing/StackGrid'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function LandingPage() {
  return (
    <main className="relative">
      <LandingNav />
      <Hero />
      <QASection />
      <StackGrid />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
