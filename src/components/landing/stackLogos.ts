// Full-colour brand logos for the stack grid, extracted from tech-stack-icons
// (MIT) into local assets so the landing carries no runtime icon dependency —
// the 8.3 MB all-icons bundle never ships. Icons whose artwork differs per
// theme carry a `dark` URL; the rest read fine on both surfaces.
import i18next from './stackLogos/i18next.svg'
import motion from './stackLogos/motion.svg'
import motionDark from './stackLogos/motion-dark.svg'
import playwright from './stackLogos/playwright.svg'
import radixui from './stackLogos/radixui.svg'
import radixuiDark from './stackLogos/radixui-dark.svg'
import react from './stackLogos/react.svg'
import reactquery from './stackLogos/reactquery.svg'
import reactrouter from './stackLogos/reactrouter.svg'
import reactrouterDark from './stackLogos/reactrouter-dark.svg'
import tailwind from './stackLogos/tailwind.svg'
import typescript from './stackLogos/typescript.svg'
import vite from './stackLogos/vite.svg'
import viteDark from './stackLogos/vite-dark.svg'
import vitest from './stackLogos/vitest.svg'
import vitestDark from './stackLogos/vitest-dark.svg'
import zustand from './stackLogos/zustand.svg'
import zustandDark from './stackLogos/zustand-dark.svg'

export interface StackLogo {
  light: string
  dark: string
}

const logo = (light: string, dark = light): StackLogo => ({ light, dark })

/** Keyed by the dep's display name in `StackGrid`. */
export const STACK_LOGOS: Record<string, StackLogo> = {
  React: logo(react),
  TypeScript: logo(typescript),
  Vite: logo(vite, viteDark),
  Tailwind: logo(tailwind),
  'Radix UI': logo(radixui, radixuiDark),
  Zustand: logo(zustand, zustandDark),
  'TanStack Query': logo(reactquery),
  'React Router': logo(reactrouter, reactrouterDark),
  'react-i18next': logo(i18next),
  'Framer Motion': logo(motion, motionDark),
  Vitest: logo(vitest, vitestDark),
  Playwright: logo(playwright),
}
