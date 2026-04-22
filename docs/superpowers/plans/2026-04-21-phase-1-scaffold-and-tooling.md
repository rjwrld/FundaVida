# Phase 1 — Scaffold & Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the FundaVida repository as a strict-mode Vite + React + TypeScript application, with shadcn/ui primitives, testing infrastructure, CI, commit hygiene, and a live deployment, so later phases can port domain code into a solid foundation.

**Architecture:** Vite SPA. Strict TypeScript. Tailwind 3 + shadcn/ui. Vitest for unit/component. Playwright for E2E. GitHub Actions for typecheck/lint/test/build on every PR. Conventional commits enforced via commitlint + husky. Deployed to Vercel with PR preview builds.

**Tech Stack:** Vite 5.4 · React 18.3 · TypeScript 5.6 · Tailwind 3.4 · shadcn/ui · Vitest 2 · @testing-library/react · Playwright 1.47 · ESLint 9 · Prettier 3 · commitlint · husky · lint-staged · GitHub Actions · Vercel · npm.

**Phase output:** an empty-but-polished app at `https://fundavida.vercel.app` (or custom domain) with a green CI badge, 8 merged PRs, and strict quality gates. No domain code yet — that starts in Phase 2.

**Workflow reminders:**

- Every Task is one branch → one PR → one merge into `main`.
- Start each Task by checking out `main`, pulling, and branching: `git checkout main && git pull && git checkout -b <branch>`.
- End each Task by pushing the branch and opening a PR via `gh pr create`. User merges in GitHub UI before starting the next Task.
- Never add `Co-Authored-By` trailers to commits or "Generated with Claude Code" footers to PR bodies.
- Never force-push. Never push directly to `main`.

---

## Task 1: Scaffold Vite + React + TypeScript (strict) + ESLint + Prettier

**Branch:** `chore/scaffold-vite-react-ts`

**Files:**

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `README.md` (replace placeholder with scaffold-stage note)

---

- [ ] **Step 1: Branch from main**

Run:

```bash
git checkout main && git pull origin main && git checkout -b chore/scaffold-vite-react-ts
```

Expected: `Switched to a new branch 'chore/scaffold-vite-react-ts'`

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "fundavida",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.11.0",
    "@types/node": "^22.7.4",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "eslint": "^9.11.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.12",
    "globals": "^15.9.0",
    "prettier": "^3.3.3",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.7.0",
    "vite": "^5.4.8"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "composite": true
  },
  "include": ["vite.config.ts"]
}
```

> Note: `composite: true` (not `noEmit: true`) is required on referenced tsconfigs per TypeScript project references semantics (errors TS6306 and TS6310 otherwise).

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FundaVida</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 8: Create `src/App.tsx`**

```tsx
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>FundaVida</h1>
      <p>
        Scaffolding in progress. See <a href="https://github.com/rjwrld/FundaVida">repo</a>.
      </p>
    </main>
  )
}
```

- [ ] **Step 9: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 10: Create `eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict, ...tseslint.configs.stylistic],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier
)
```

- [ ] **Step 11: Create `.prettierrc.json`**

```json
{
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 12: Create `.prettierignore`**

```
dist
node_modules
coverage
playwright-report
test-results
package-lock.json
*.lockb
```

- [ ] **Step 13: Update `README.md` with a scaffold-stage note**

Replace the entire file contents with:

````md
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
````

````

- [ ] **Step 14: Install dependencies**

Run:
```bash
npm install
````

Expected: creates `node_modules/` and `package-lock.json`. No errors.

- [ ] **Step 15: Verify typecheck passes**

Run:

```bash
npm run typecheck
```

Expected: exits 0 with no output.

- [ ] **Step 16: Verify lint passes**

Run:

```bash
npm run lint
```

Expected: exits 0 with no output.

- [ ] **Step 17: Verify dev server boots**

Run:

```bash
timeout 10 npm run dev || true
```

Expected: Vite logs `Local: http://localhost:5173/` before the timeout kills it.

- [ ] **Step 18: Verify production build succeeds**

Run:

```bash
npm run build
```

Expected: build output in `dist/`. No type errors.

- [ ] **Step 19: Stage and commit**

Run:

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html eslint.config.js .prettierrc.json .prettierignore src/ README.md
git commit -m "$(cat <<'EOF'
chore: scaffold vite + react + typescript

Adds a strict-mode Vite scaffold as the foundation for later phases:
typecheck, lint, and format all pass on a blank App shell. tsconfig
enables strict, noImplicitAny, strictNullChecks, and
noUncheckedIndexedAccess. ESLint forbids any and unused vars; Prettier
handles formatting.
EOF
)"
```

Expected: one commit on `chore/scaffold-vite-react-ts`.

- [ ] **Step 20: Push and open PR**

Run:

```bash
git push -u origin chore/scaffold-vite-react-ts
gh pr create --base main --head chore/scaffold-vite-react-ts --title "chore: scaffold vite + react + typescript" --body "$(cat <<'EOF'
## Summary

Foundation scaffold: strict-mode Vite + React 18 + TypeScript 5.6 with ESLint (strict + no-explicit-any) and Prettier.

## Changes

- `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json` — tooling config.
- `index.html`, `src/main.tsx`, `src/App.tsx` — minimal app shell.
- `README.md` — replaced placeholder with scaffold-stage note.

## Test plan

- [x] \`npm run typecheck\` passes
- [x] \`npm run lint\` passes with zero warnings
- [x] \`npm run build\` produces \`dist/\`
- [x] \`npm run dev\` serves on :5173
EOF
)"
```

- [ ] **Step 21: Wait for user to merge PR, then sync**

After merge, locally:

```bash
git checkout main && git pull origin main
```

Expected: local `main` includes the scaffold commit.

---

## Task 2: Tailwind + shadcn/ui primitives

**Branch:** `feat/tailwind-shadcn`

**Files:**

- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Modify: `src/main.tsx` (import `index.css`)
- Modify: `src/App.tsx` (switch to Tailwind classes)
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Modify: `package.json` (new deps)
- Modify: `tsconfig.json` (ensure paths resolve for `@/lib/utils`)

---

- [ ] **Step 1: Branch from main**

```bash
git checkout main && git pull origin main && git checkout -b feat/tailwind-shadcn
```

- [ ] **Step 2: Install Tailwind + shadcn dependencies**

```bash
npm install -D tailwindcss@^3.4.13 postcss@^8.4.47 autoprefixer@^10.4.20
npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot
```

- [ ] **Step 3: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }

  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

- [ ] **Step 6: Update `src/main.tsx` to import the stylesheet**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 7: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Create `components.json` (for shadcn CLI compatibility)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 9: Create `src/components/ui/button.tsx` (shadcn Button)**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants }
```

- [ ] **Step 10: Create `src/components/ui/card.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'
```

- [ ] **Step 11: Update `src/App.tsx` to use Tailwind + shadcn primitives**

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function App() {
  return (
    <main className="container mx-auto max-w-2xl py-12 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">FundaVida</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Scaffolding in progress. Domain modules arrive in later phases.
          </p>
          <Button asChild>
            <a href="https://github.com/rjwrld/FundaVida">View repository</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 12: Typecheck, lint, build**

```bash
npm run typecheck && npm run lint && npm run build
```

Expected: all three exit 0.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tailwind.config.ts postcss.config.js components.json src/
git commit -m "$(cat <<'EOF'
feat: add tailwind 3 and shadcn/ui base

Wires up Tailwind with the shadcn design-token system (CSS variables for
light and dark themes) and ports two primitives (Button, Card) plus the
\`cn\` utility. \`components.json\` is configured so later primitives can be
pulled in via \`npx shadcn add <name>\` without more setup.
EOF
)"
```

- [ ] **Step 14: Push and open PR**

```bash
git push -u origin feat/tailwind-shadcn
gh pr create --base main --head feat/tailwind-shadcn --title "feat: add tailwind 3 and shadcn/ui base" --body "$(cat <<'EOF'
## Summary

Tailwind 3.4 with the shadcn design-token system (light/dark CSS variables) and two base primitives (Button, Card). \`components.json\` is wired so later primitives can be pulled in via \`npx shadcn add\`.

## Changes

- \`tailwind.config.ts\`, \`postcss.config.js\`, \`src/index.css\` — Tailwind + theme tokens.
- \`components.json\`, \`src/lib/utils.ts\`, \`src/components/ui/{button,card}.tsx\` — shadcn primitives.
- \`src/App.tsx\` — demo usage of the primitives.

## Test plan

- [x] \`npm run build\` passes
- [x] Dev server renders the Card + Button with correct styling
EOF
)"
```

- [ ] **Step 15: Wait for merge, sync main**

```bash
git checkout main && git pull origin main
```

---

## Task 3: Vitest + React Testing Library

**Branch:** `test/add-vitest-rtl`

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/components/ui/__tests__/button.test.tsx`
- Create: `src/lib/__tests__/utils.test.ts`
- Modify: `package.json` (scripts + deps)
- Modify: `tsconfig.json` (include test files)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b test/add-vitest-rtl
```

- [ ] **Step 2: Install deps**

```bash
npm install -D vitest@^2.1.1 @vitest/coverage-v8@^2.1.1 jsdom@^25.0.1 @testing-library/react@^16.0.1 @testing-library/jest-dom@^6.5.0 @testing-library/user-event@^14.5.2
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/test/**', 'src/main.tsx', '**/*.config.{js,ts}', 'dist/**'],
    },
  },
})
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Add scripts and types to `package.json`**

In `package.json`, the `scripts` section should now read:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 6: Update `tsconfig.json` `types` and `include` for Vitest globals**

In `tsconfig.json`, add `"vitest/globals"` to a new `types` array under `compilerOptions`, and expand `include`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vitest.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Write the failing test for `cn`**

Create `src/lib/__tests__/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('merges conflicting tailwind classes — last wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
```

- [ ] **Step 8: Run it and confirm it passes**

```bash
npm test -- src/lib/__tests__/utils.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 9: Write the failing test for `Button`**

Create `src/components/ui/__tests__/button.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('<Button />', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <Button
        onClick={() => {
          clicked = true
        }}
      >
        Go
      </Button>
    )
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(clicked).toBe(true)
  })

  it('applies the destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })
})
```

- [ ] **Step 10: Run it**

```bash
npm test -- src/components/ui/__tests__/button.test.tsx
```

Expected: 3 passing tests.

- [ ] **Step 11: Run the full suite, typecheck, lint**

```bash
npm test && npm run typecheck && npm run lint
```

Expected: all pass. Coverage report available via `npm run test:coverage`.

- [ ] **Step 12: Commit and open PR**

```bash
git add .
git commit -m "$(cat <<'EOF'
test: add vitest + react testing library infrastructure

Wires Vitest with jsdom, Testing Library, and user-event. Covers
\`cn\` and \`<Button />\` as smoke tests so CI has something to run
starting this PR. Coverage collector uses v8.
EOF
)"
git push -u origin test/add-vitest-rtl
gh pr create --base main --head test/add-vitest-rtl --title "test: add vitest + RTL infrastructure" --body "$(cat <<'EOF'
## Summary

Vitest (jsdom) + React Testing Library + user-event, with two smoke tests (\`cn\` utility and \`<Button />\`). \`npm run test:coverage\` produces a v8 coverage report.

## Changes

- \`vitest.config.ts\`, \`src/test/setup.ts\` — runner config + global setup.
- \`package.json\` — \`test\`, \`test:watch\`, \`test:coverage\` scripts.
- \`src/lib/__tests__/utils.test.ts\`, \`src/components/ui/__tests__/button.test.tsx\` — initial coverage.

## Test plan

- [x] \`npm test\` — 6 tests pass
- [x] \`npm run test:coverage\` — v8 report generated
- [x] \`npm run typecheck\` — passes
EOF
)"
```

- [ ] **Step 13: After merge, sync**

```bash
git checkout main && git pull origin main
```

---

## Task 4: Playwright E2E scaffold

**Branch:** `test/add-playwright`

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts + deps)
- Modify: `.gitignore` (confirm `playwright-report/`, `test-results/` already present)
- Modify: `eslint.config.js` (ignore `e2e/` from react-refresh rule)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b test/add-playwright
```

- [ ] **Step 2: Install Playwright**

```bash
npm install -D @playwright/test@^1.47.2
npx playwright install --with-deps chromium
```

Expected: Chromium browser downloaded; no errors.

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 4: Create `e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('landing renders the FundaVida heading and CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View repository' })).toBeVisible()
})
```

- [ ] **Step 5: Add scripts**

Update `package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 6: Adjust ESLint to ignore `e2e/` from the react-refresh rule**

Replace the existing `eslint.config.js` with:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict, ...tseslint.configs.stylistic],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier
)
```

- [ ] **Step 7: Run E2E locally**

```bash
npm run e2e
```

Expected: smoke test passes; Playwright starts the dev server, hits `/`, sees the heading and link.

- [ ] **Step 8: Commit and PR**

```bash
git add package.json package-lock.json playwright.config.ts e2e/ eslint.config.js
git commit -m "$(cat <<'EOF'
test: add playwright e2e scaffold

Single Chromium project, dev-server boot handled by the Playwright
runner, a smoke spec that verifies the blank landing renders. CI will
run the same spec in GitHub Actions once the workflow lands.
EOF
)"
git push -u origin test/add-playwright
gh pr create --base main --head test/add-playwright --title "test: add playwright e2e scaffold" --body "$(cat <<'EOF'
## Summary

Adds Playwright (Chromium-only for now) with a smoke test that verifies the blank landing renders. Playwright boots the dev server itself; no separate run step needed.

## Test plan

- [x] \`npm run e2e\` — smoke test passes
- [x] \`npm run typecheck\` — passes
EOF
)"
```

- [ ] **Step 9: Sync after merge**

```bash
git checkout main && git pull origin main
```

---

## Task 5: Conventional commits with commitlint + husky

**Branch:** `chore/commitlint-husky`

**Files:**

- Create: `.husky/commit-msg`
- Create: `.husky/pre-commit`
- Create: `commitlint.config.js`
- Create: `.lintstagedrc.json`
- Modify: `package.json` (deps + `prepare` script)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b chore/commitlint-husky
```

- [ ] **Step 2: Install**

```bash
npm install -D husky@^9.1.6 lint-staged@^15.2.10 @commitlint/cli@^19.5.0 @commitlint/config-conventional@^19.5.0
```

- [ ] **Step 3: Create `commitlint.config.js`**

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'refactor',
        'style',
        'docs',
        'test',
        'ci',
        'build',
        'perf',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
  },
}
```

- [ ] **Step 4: Create `.lintstagedrc.json`**

```json
{
  "*.{ts,tsx,js}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

- [ ] **Step 5: Add `prepare` script to `package.json`**

In `scripts`, append:

```json
"prepare": "husky"
```

- [ ] **Step 6: Initialize husky**

```bash
npm run prepare
```

Expected: creates `.husky/` directory.

- [ ] **Step 7: Create `.husky/commit-msg`**

File contents:

```bash
#!/usr/bin/env sh
npx --no-install commitlint --edit "$1"
```

Then mark executable:

```bash
chmod +x .husky/commit-msg
```

- [ ] **Step 8: Create `.husky/pre-commit`**

File contents:

```bash
#!/usr/bin/env sh
npx --no-install lint-staged
```

Then:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 9: Verify the commit-msg hook blocks bad messages**

Stage a small change and try a bad commit message to confirm the hook fires:

```bash
echo "" >> README.md
git add README.md
git commit -m "bad message format" || echo "BLOCKED AS EXPECTED"
git reset HEAD README.md
git checkout README.md
```

Expected: commit rejected by commitlint; output includes `BLOCKED AS EXPECTED`.

- [ ] **Step 10: Commit the changes themselves using a valid message**

```bash
git add .husky/ commitlint.config.js .lintstagedrc.json package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: add commitlint and husky for conventional commits

Pre-commit runs lint-staged (eslint --fix + prettier) so every commit is
clean. commit-msg runs commitlint against config-conventional so message
format is enforced before any push.
EOF
)"
```

- [ ] **Step 11: Push and PR**

```bash
git push -u origin chore/commitlint-husky
gh pr create --base main --head chore/commitlint-husky --title "chore: add commitlint + husky" --body "$(cat <<'EOF'
## Summary

Pre-commit runs lint-staged (eslint --fix, prettier --write). commit-msg runs commitlint (\`@commitlint/config-conventional\`). Every local commit is now lint-clean and conventionally formatted.

## Test plan

- [x] Attempting \`git commit -m "bad message"\` is rejected
- [x] A properly formatted commit passes
- [x] Editing a file with lint issues triggers auto-fix on commit
EOF
)"
```

- [ ] **Step 12: Sync after merge**

```bash
git checkout main && git pull origin main
```

---

## Task 6: GitHub Actions CI

**Branch:** `ci/add-github-actions`

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/pull_request_template.md`
- Modify: `playwright.config.ts` — fold in Task 4 review follow-ups (see Step 1.5)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b ci/add-github-actions
```

- [ ] **Step 1.5: Adjust `playwright.config.ts` for CI parity (Task 4 review follow-up)**

Two follow-ups were deferred from Task 4's code review to this task so they ship alongside the CI wiring rather than as a standalone fixup PR:

1. Use a production-parity webServer on CI (`npm run build && npm run preview` on port 4173) so the smoke test exercises the built bundle rather than the HMR dev server.
2. Drop CI `retries` from 2 to 1 so genuine flakes surface instead of being masked behind two silent retries.

Replace `playwright.config.ts` with:

```ts
import { defineConfig, devices } from '@playwright/test'

const CI_BASE_URL = 'http://localhost:4173'
const LOCAL_BASE_URL = 'http://localhost:5173'
const baseURL = process.env.CI ? CI_BASE_URL : LOCAL_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run preview' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Verify locally with `npm run e2e` (still passes against dev server on 5173). CI parity is exercised by the GitHub Actions job below.

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: typecheck / lint / test / build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Unit tests
        run: npm run test

      - name: Build
        run: npm run build

  e2e:
    name: playwright
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E
        run: npm run e2e

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Create `.github/pull_request_template.md`**

```markdown
## Summary

<!-- 1–3 bullets. What changes, and why. -->

## Changes

<!-- Files/areas touched. Link to spec/plan section if relevant. -->

## Test plan

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run e2e` (when applicable)
- [ ] Manual verification: <!-- what you clicked through -->
```

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "$(cat <<'EOF'
ci: add github actions for typecheck, lint, test, build, and e2e

Two jobs: a fast \`verify\` job (typecheck, lint, format-check, unit
tests, build) and an \`e2e\` job that runs Playwright against a fresh
install. Concurrency is scoped so stale PR runs cancel when new commits
arrive. A PR template nudges contributors toward a consistent test plan.
EOF
)"
```

- [ ] **Step 5: Push and PR**

```bash
git push -u origin ci/add-github-actions
gh pr create --base main --head ci/add-github-actions --title "ci: add github actions" --body "$(cat <<'EOF'
## Summary

Two CI jobs on every PR: \`verify\` (typecheck, lint, format-check, unit tests, build) and \`e2e\` (Playwright in Chromium). Concurrency cancels stale runs. Uploads the Playwright HTML report as an artifact on failure. PR template standardizes the test plan.

## Test plan

- [x] This PR itself runs both jobs green
EOF
)"
```

- [ ] **Step 6: Verify both jobs pass**

After opening the PR:

```bash
gh pr checks --watch
```

Expected: both `verify` and `playwright` show ✓ before merging.

- [ ] **Step 7: Sync after merge**

```bash
git checkout main && git pull origin main
```

---

## Task 7: Add MIT license

**Branch:** `chore/add-license`

**Files:**

- Create: `LICENSE`

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b chore/add-license
```

- [ ] **Step 2: Create `LICENSE`**

Use this exact content (replace `2026 Josue Calderon` if you prefer a different attribution line):

```
MIT License

Copyright (c) 2026 Josue Calderon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT license"
```

- [ ] **Step 4: Push and PR**

```bash
git push -u origin chore/add-license
gh pr create --base main --head chore/add-license --title "chore: add MIT license" --body "$(cat <<'EOF'
## Summary

MIT license. Standard permissive license for a portfolio project.

## Test plan

- [x] GitHub's license detection picks up \`LICENSE\` once merged.
EOF
)"
```

- [ ] **Step 5: Sync after merge**

```bash
git checkout main && git pull origin main
```

---

## Task 8: App layout shell + React Router

**Branch:** `feat/app-layout-shell`

**Files:**

- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/components/layout/AppHeader.tsx`
- Create: `src/components/layout/AppSidebar.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Modify: `src/App.tsx`
- Modify: `e2e/smoke.spec.ts`
- Modify: `src/components/ui/__tests__/button.test.tsx` (unchanged; referenced so you don't break it)
- Modify: `package.json` (add react-router-dom)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/app-layout-shell
```

- [ ] **Step 2: Install router**

```bash
npm install react-router-dom@^6.26.2
```

- [ ] **Step 3: Create `src/components/layout/AppHeader.tsx`**

```tsx
export function AppHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <a href="/" className="font-semibold tracking-tight">
          FundaVida
        </a>
        <nav aria-label="Primary" className="text-sm text-muted-foreground">
          <span>Demo</span>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create `src/components/layout/AppSidebar.tsx`**

```tsx
export function AppSidebar() {
  return (
    <aside aria-label="Sections" className="hidden w-56 shrink-0 border-r bg-muted/20 md:block">
      <nav className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Navigation</p>
        <p className="mt-2">Modules arrive in later phases.</p>
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Create `src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/pages/HomePage.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">FundaVida</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Scaffolding phase complete. Domain modules arrive in later phases.
          </p>
          <Button asChild>
            <a href="https://github.com/rjwrld/FundaVida">View repository</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/pages/NotFoundPage.tsx`**

```tsx
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">We couldn't find that page.</p>
      <Button asChild className="mt-6">
        <a href="/">Back to home</a>
      </Button>
    </div>
  )
}
```

- [ ] **Step 8: Replace `src/App.tsx` with router wiring**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 9: Update the E2E smoke test to cover both `/` and `/garbage`**

Replace `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('home renders heading and CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View repository' })).toBeVisible()
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
```

- [ ] **Step 10: Add a unit test for `AppLayout`**

Create `src/components/layout/__tests__/AppLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

describe('<AppLayout />', () => {
  it('renders the header, sidebar, and outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Hello from outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('FundaVida')).toBeInTheDocument()
    expect(screen.getByLabelText('Sections')).toBeInTheDocument()
    expect(screen.getByText('Hello from outlet')).toBeInTheDocument()
  })
})
```

- [ ] **Step 11: Run the full gauntlet**

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```

Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json src/ e2e/
git commit -m "$(cat <<'EOF'
feat: add app layout shell and react router

Introduces \`AppLayout\` (header + sidebar + outlet), \`HomePage\`, and
\`NotFoundPage\`, wired through react-router v6. The sidebar and header
are intentionally sparse — real nav items arrive as modules land in
later phases. E2E smoke now covers both \`/\` and a 404 path.
EOF
)"
```

- [ ] **Step 13: Push and PR**

```bash
git push -u origin feat/app-layout-shell
gh pr create --base main --head feat/app-layout-shell --title "feat: add app layout shell and react router" --body "$(cat <<'EOF'
## Summary

\`AppLayout\` (header + sidebar + outlet), a \`HomePage\`, and a \`NotFoundPage\` behind react-router v6. Sets the structural stage for domain modules in later phases.

## Changes

- \`src/components/layout/{AppLayout,AppHeader,AppSidebar}.tsx\`
- \`src/pages/{HomePage,NotFoundPage}.tsx\`
- \`src/App.tsx\` — router config
- \`e2e/smoke.spec.ts\` — expanded to cover 404
- Unit test for \`AppLayout\`

## Test plan

- [x] \`npm run typecheck\` passes
- [x] \`npm run test\` — 7 tests
- [x] \`npm run e2e\` — 2 smoke tests
- [x] \`npm run build\` produces \`dist/\`
EOF
)"
```

- [ ] **Step 14: Sync after merge**

```bash
git checkout main && git pull origin main
```

---

## Phase 1 Exit Criteria

When all 8 PRs are merged:

- `main` has 9+ clean commits (8 feature/chore PRs plus any merge commits), all authored solely by the owner, all conforming to conventional-commit format.
- GitHub repo page shows a green CI badge, the MIT license auto-detected, topics displayed, description populated, no `.env` anywhere in the tree or history.
- `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e` all pass locally.
- Dev server (`npm run dev`) renders the layout shell at `/`.
- The PR history reads as a disciplined solo engineer's first sprint on a portfolio project.

The **next plan** to write is `docs/superpowers/plans/YYYY-MM-DD-phase-2-data-layer-role-switcher.md`, which introduces the Zustand mock data layer and the role-switcher that replaces Supabase Auth. Do not start Phase 2 until Phase 1 is fully merged and green on CI.

## Deferred to later phases (not in this plan)

- **Vercel deployment.** Intentionally deferred to Phase 7 (Polish & Launch) so the live URL is announced alongside the finished landing page, not during scaffolding. The preview-deploy side-effect of the GitHub / Vercel integration is fine to enable any time via the Vercel dashboard, which doesn't require code changes.
- **i18n setup.** Phase 6.
- **Zustand, seed data, role switcher.** Phase 2.
- **Domain modules.** Phases 3–5.
