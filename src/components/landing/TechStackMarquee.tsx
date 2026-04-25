import { Marquee } from './Marquee'

const tech = [
  'React 18',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'shadcn/ui',
  'Radix',
  'Zustand',
  'TanStack Query',
  'React Hook Form',
  'Zod',
  'React Router',
  'react-i18next',
  '@react-pdf/renderer',
  'Vitest',
  'Playwright',
  'Vercel',
]

function Badge({ label }: { label: string }) {
  return (
    <div className="mx-2 flex h-12 items-center gap-2 rounded-full border border-border bg-card px-4 font-mono text-sm text-foreground transition-colors hover:bg-brand-blue-50">
      {label}
    </div>
  )
}

export function TechStackMarquee() {
  return (
    <section className="border-y border-border py-16">
      <Marquee className="py-2">
        {tech.map((label) => (
          <Badge key={label} label={label} />
        ))}
      </Marquee>
      <Marquee reverse className="mt-2 py-2">
        {tech
          .slice()
          .reverse()
          .map((label) => (
            <Badge key={`${label}-r`} label={label} />
          ))}
      </Marquee>
    </section>
  )
}
