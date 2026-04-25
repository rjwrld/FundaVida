import { Hero } from '@/components/landing/Hero'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { FeatureBento } from '@/components/landing/FeatureBento'
import { RearchitectureDelta } from '@/components/landing/RearchitectureDelta'
import { TechStackMarquee } from '@/components/landing/TechStackMarquee'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export function LandingPage() {
  return (
    <main className="relative">
      <div className="absolute right-6 top-6 z-50 flex items-center gap-1 rounded-md border bg-background/90 p-1 backdrop-blur">
        <LanguageToggle />
        <ThemeToggle />
      </div>
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
