import { Hero } from '@/components/landing/Hero'
import { LandingNav } from '@/components/landing/LandingNav'
import { ProofMarquee } from '@/components/landing/ProofMarquee'
import { QASection } from '@/components/landing/QASection'
import { StackGrid } from '@/components/landing/StackGrid'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function LandingPage() {
  return (
    // The nav and footer sit beside <main>, not inside it, so they keep their
    // navigation / contentinfo landmark roles (the app shell does the same).
    <div className="relative">
      <LandingNav />
      <main>
        <Hero />
        <ProofMarquee />
        <QASection />
        <StackGrid />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
