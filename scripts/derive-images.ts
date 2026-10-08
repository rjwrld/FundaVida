/**
 * Images derived from committed sources, no dev server needed:
 *
 * - Landing marquee thumbnails: each `public/screenshots/*.png` capture is
 *   re-encoded as an 800px-wide WebP (`*.thumb.webp`). The marquee shows the
 *   shots ~350px wide, so the full 2880px PNGs (kept for the README) were
 *   ~1.6MB of mostly wasted bytes. Encoding runs in Chromium's canvas, so the
 *   pipeline needs no image dependency.
 * - The social preview card (`public/og-image.png`): a purpose-built 1200×630
 *   card rendered at 2× with the brand's own fonts and mark, rather than a
 *   crop of the landing page.
 *
 * Run: `npm run images:derive` (also runs at the end of `npm run screenshots`).
 */
import { chromium, type Page } from '@playwright/test'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const SHOTS_DIR = join(PUBLIC, 'screenshots')
const FONTS = join(ROOT, 'node_modules', '@fontsource')

const THUMB_WIDTH = 800
const THUMB_QUALITY = 0.82

async function writeThumbnails(page: Page) {
  const files = (await readdir(SHOTS_DIR)).filter((f) => f.endsWith('.png'))
  for (const file of files) {
    const png = await readFile(join(SHOTS_DIR, file))
    const dataUrl = await page.evaluate(
      async ({ src, width, quality }) => {
        const img = new Image()
        img.src = src
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * width)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no 2d context')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/webp', quality)
      },
      {
        src: `data:image/png;base64,${png.toString('base64')}`,
        width: THUMB_WIDTH,
        quality: THUMB_QUALITY,
      }
    )
    const out = file.replace(/\.png$/, '.thumb.webp')
    await writeFile(join(SHOTS_DIR, out), Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
    console.log(`wrote screenshots/${out}`)
  }
}

async function fontFace(family: string, pkg: string, weight: number) {
  const file = join(FONTS, pkg, 'files', `${pkg}-latin-${weight}-normal.woff2`)
  const data = (await readFile(file)).toString('base64')
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`
}

async function ogCardHtml() {
  const fonts = (
    await Promise.all([
      fontFace('Inter Tight', 'inter-tight', 900),
      fontFace('Inter Tight', 'inter-tight', 700),
      fontFace('Geist Mono', 'geist-mono', 500),
    ])
  ).join('')
  const mark = (await readFile(join(PUBLIC, 'logo-mark.svg'))).toString('base64')

  // Light theme tokens from src/index.css (Figure Green, hue 138).
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
:root{--bg:oklch(1 0 0);--fg:oklch(0.145 0 0);--muted:oklch(0.5 0 0);--border:oklch(0.922 0 0);
--g400:oklch(0.68 0.16 138);--g600:oklch(0.5 0.16 138);--g700:oklch(0.42 0.14 138)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;background:var(--bg);color:var(--fg);
font-family:'Inter Tight',sans-serif;
background-image:linear-gradient(color-mix(in oklab,var(--border) 70%,transparent) 1px,transparent 1px),
linear-gradient(90deg,color-mix(in oklab,var(--border) 70%,transparent) 1px,transparent 1px);
background-size:56px 56px;background-position:-1px -1px}
.wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between}
.eyebrow{font-family:'Geist Mono',monospace;font-weight:500;font-size:17px;letter-spacing:.16em;
text-transform:uppercase;white-space:nowrap;color:var(--g700);display:flex;align-items:center;gap:14px}
.eyebrow i{width:10px;height:10px;border-radius:50%;background:var(--g600)}
.eyebrow span{color:var(--muted)}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:30px;letter-spacing:-.02em}
.brand img{width:48px;height:48px}
h1{margin-top:26px;font-weight:900;font-size:118px;line-height:.92;letter-spacing:-.022em;text-transform:uppercase}
.smear{position:relative;white-space:nowrap}
.smear:before{content:"";position:absolute;left:-.12em;right:-.12em;top:.14em;bottom:0;z-index:-1;
background:color-mix(in oklab,var(--g400) 32%,transparent);
border-radius:.18em .3em .22em .35em/.5em .28em .45em .3em;transform:skewX(-6deg)}
.accent{color:var(--g600)}
.foot{margin-top:auto;display:flex;justify-content:flex-end;gap:10px;
font-family:'Geist Mono',monospace;font-weight:500;font-size:18px;color:var(--muted)}
.foot b{font-weight:500;border:1.5px solid var(--border);background:var(--bg);border-radius:999px;padding:8px 16px}
.foot b.live{color:var(--g700);border-color:color-mix(in oklab,var(--g600) 45%,transparent)}
</style></head><body><div class="wrap">
<div class="top"><div class="eyebrow"><i></i>Education management <span>· Costa Rican non-profit</span></div>
<div class="brand"><img alt="" src="data:image/svg+xml;base64,${mark}">FundaVida</div></div>
<h1>The <span class="smear">platform</span><br>I built for<br><span class="accent">FundaVida.</span></h1>
<div class="foot"><b class="live">● Live demo</b><b>4 roles</b><b>EN / ES</b></div>
</div></body></html>`
}

async function writeOgImage(page: Page) {
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.setContent(await ogCardHtml(), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(PUBLIC, 'og-image.png'), fullPage: false })
  console.log('wrote og-image.png')
}

export async function deriveImages() {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ deviceScaleFactor: 2 })
    const page = await context.newPage()
    await writeThumbnails(page)
    await writeOgImage(page)
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  deriveImages().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
