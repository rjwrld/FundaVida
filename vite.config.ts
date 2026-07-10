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
