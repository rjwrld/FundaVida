# FundaVida

Educational management platform — portfolio rearchitecture of a college project into a zero-cost, always-on demo.

## Status

Scaffolding phase. Tooling and a blank app shell are in place; domain modules are being ported incrementally per the [design spec](docs/superpowers/specs/2026-04-21-fundavida-portfolio-polish-design.md).

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind · shadcn/ui · Vitest · Playwright · GitHub Actions · Vercel.

## Scripts

```bash
npm run dev          # start dev server
npm run build        # typecheck + production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (zero warnings allowed)
npm run format       # prettier write
```
