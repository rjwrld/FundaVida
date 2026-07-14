/**
 * Hand-rolled canvas confetti for the rare celebration moments (ADR-0047 phase
 * 6b) — a dependency would ship more than these ~90 lines. One burst per call:
 * a fixed, click-through, decorative canvas that removes itself when the last
 * particle settles. Self-guards on `prefers-reduced-motion`, so a call site
 * that forgot its own `useReducedMotion` read still cannot animate.
 */

const DURATION_MS = 1800
const PARTICLE_COUNT = 140
const GRAVITY = 1300 // px/s²

// The Figure-Green ramp plus a warm accent, resolved at fire time so the burst
// follows the active theme; literals cover a canvas that can't read the vars.
const FALLBACK_COLORS = ['#37b874', '#1f8a55', '#8fdcb4', '#f2b04b']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  spin: number
}

function palette(): string[] {
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return primary ? [primary, ...FALLBACK_COLORS.slice(1)] : FALLBACK_COLORS
}

function createParticles(width: number, height: number): Particle[] {
  const colors = palette()
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Fan the burst upward and outward from just above the page's center.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 400 + Math.random() * 700
    return {
      x: width / 2 + (Math.random() - 0.5) * width * 0.2,
      y: height * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5,
      color: colors[i % colors.length] ?? '#37b874',
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 12,
    }
  })
}

export function fireConfetti(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '9999',
  })
  document.body.appendChild(canvas)
  ctx.scale(dpr, dpr)

  const particles = createParticles(width, height)
  let start: number | null = null
  let last: number | null = null

  const frame = (nowMs: number) => {
    if (start === null) start = nowMs
    const dt = Math.min((nowMs - (last ?? nowMs)) / 1000, 0.05)
    last = nowMs
    const elapsed = nowMs - start

    ctx.clearRect(0, 0, width, height)
    // Hold full opacity for the first two thirds, then fade the tail out.
    ctx.globalAlpha = Math.min(1, Math.max(0, (DURATION_MS - elapsed) / (DURATION_MS / 3)))
    for (const p of particles) {
      p.vy += GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.spin * dt
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }

    if (elapsed < DURATION_MS) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
