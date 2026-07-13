import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { DEV_PORT, PREVIEW_PORT } from './scripts/ports'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest vendors out of the entry chunk (#353). Route-level
        // lazy() in App.tsx handles per-page code; these rules carve the
        // remaining statically-imported vendors into parallel-loading, cacheable
        // chunks so no single chunk crosses Vite's 500 kB warning threshold.
        // The pdf-* groups slice the dynamically-imported @react-pdf graph
        // (~1.5 MB minified on its own) into pieces the browser can fetch
        // concurrently on first certificate preview.
        manualChunks(id: string) {
          // The demo seed (and faker with it, as its exclusive dependency)
          // moves out of the entry chunk: faker seeds the snapshot at boot (a
          // core behavior of this demo app, not dev-only) so it cannot leave
          // the critical path, but in its own chunk it loads in parallel and
          // caches across deploys. Match only the app's seed files, never
          // '@faker-js' ids: a manualChunks match force-includes the matched
          // module's entire dependency closure, bypassing tree-shaking, and
          // faker's root barrel re-exports every locale (~2.7 MB minified
          // instead of ~450 kB — see the import note in src/data/seed/index.ts,
          // which keeps seed's closure on the en-only deep entry).
          if (id.includes('/src/data/seed/')) return 'seed'
          if (!id.includes('node_modules')) return undefined
          // Compile-time helper shims are imported by eager and lazy code
          // alike; left unassigned, Rollup co-locates them with whichever
          // group it likes (observed: tslib inside pdf-fontkit), and the entry
          // chunk's import of them drags that whole lazy group onto the
          // critical path via modulepreload. Pin them to their own tiny chunk.
          if (/node_modules\/(tslib|@swc\/helpers)\//.test(id)) return 'helpers'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion'
          if (/node_modules\/(i18next|react-i18next)\//.test(id)) return 'i18n'
          if (id.includes('node_modules/date-fns/')) return 'date-fns'
          if (id.includes('@react-pdf/pdfkit') || id.includes('node_modules/pako/')) {
            return 'pdf-pdfkit'
          }
          if (
            /node_modules\/(fontkit|brotli|restructure|unicode-properties|tiny-inflate)\//.test(id)
          ) {
            return 'pdf-fontkit'
          }
          if (
            id.includes('@react-pdf/reconciler') ||
            /node_modules\/(yoga-layout|hyphen|linebreak)\//.test(id)
          ) {
            return 'pdf-layout'
          }
          return undefined
        },
      },
    },
  },
  // Defaults for a bare `npm run dev` / `npm run preview`, so two worktrees can
  // serve at once. Playwright and the screenshot script override these with an
  // explicit `--port`. `strictPort` because a busy port here means a genuine
  // conflict worth surfacing — silently sliding to the next one is how a poller
  // ends up waiting out its timeout against the port nobody is listening on.
  server: {
    port: DEV_PORT,
    strictPort: true,
  },
  preview: {
    port: PREVIEW_PORT,
    strictPort: true,
  },
})
