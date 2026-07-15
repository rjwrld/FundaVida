import { Hero } from '@/components/landing/Hero'
import { LandingNav } from '@/components/landing/LandingNav'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { FeatureBento } from '@/components/landing/FeatureBento'
import { RearchitectureDelta } from '@/components/landing/RearchitectureDelta'
import { TechStackMarquee } from '@/components/landing/TechStackMarquee'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function LandingPage() {
  return (
    <main className="relative">
      <LandingNav />
      <Hero />
      <TrustStrip />
      <FeatureBento />
      <RearchitectureDelta />
      <TechStackMarquee />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
