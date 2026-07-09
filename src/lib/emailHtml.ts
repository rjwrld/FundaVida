export interface EmailHtmlInput {
  /** The campaign subject, rendered as the document's heading. */
  subject: string
  /** The campaign body, verbatim: blank lines separate paragraphs, nothing else. */
  body: string
  /** Document language for `<html lang>` — the active i18next locale. */
  lang: string
  /** Localized "demo — no email was actually sent" line for the footer. */
  disclaimer: string
}

// The four brand colours of the FundaVida mark, and the Figure Green accent
// (hue 138) the app paints its primary surfaces with. Hard-coded rather than
// read from CSS custom properties: the document is standalone and light-only
// (ADR-0045), so it cannot inherit the app's theme tokens.
const GREEN = '#32982d'
const BLUE = '#2961cd'
const YELLOW = '#fdcb02'
const RED = '#d20105'
const ACCENT = '#2a8426'

/**
 * A compact, hand-authored stand-in for the FundaVida mark: four figures ringed
 * around a shared centre, one per brand colour. The traced `public/logo-mark.svg`
 * is 77 KB — an email document that inlines every asset cannot carry it, and a
 * data-URI of it would be larger still. No `xmlns` attribute: inline SVG in HTML
 * needs none, and the document must reference no URL at all.
 */
// A head and a pair of shoulders, drawn in the top quarter of the 48×48 box. The
// body's half-width (4.9) stays under its clearance from the centre (5.1), which is
// what keeps four rotated copies inside their own 45° wedges — widen it and the
// figures cross into each other.
const FIGURE =
  'M24 4.1a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm-4.9 13.4c0-3.1 2.2-5 4.9-5s4.9 1.9 4.9 5v.4a1 1 0 0 1-1 1h-7.8a1 1 0 0 1-1-1Z'

// Each figure stands clear of the others: the bodies stop short of the centre, so
// four rotated copies ring an open space rather than piling into a blot.
const MARK = [GREEN, BLUE, YELLOW, RED]
  .map((fill, i) => `<path fill="${fill}" d="${FIGURE}" transform="rotate(${i * 90} 24 24)" />`)
  .join('')

const LOGO = `<svg class="fv-mark" viewBox="0 0 48 48" width="44" height="44" role="img" aria-label="FundaVida">${MARK}</svg>`

const STYLES = `
    :root { color-scheme: light; }
    body { margin: 0; padding: 24px 12px; background: #f4f5f3; color: #1f2320;
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    .fv-shell { max-width: 600px; margin: 0 auto; background: #ffffff;
      border: 1px solid #e3e6e2; border-radius: 12px; overflow: hidden; }
    .fv-header { display: flex; align-items: center; gap: 12px; padding: 20px 28px;
      background: #f3f8f2; border-bottom: 3px solid ${ACCENT}; }
    .fv-mark { display: block; flex: none; }
    .fv-wordmark { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: ${ACCENT}; }
    .fv-main { padding: 28px; }
    .fv-subject { margin: 0 0 20px; font-size: 22px; line-height: 1.3; font-weight: 700;
      color: #1f2320; }
    .fv-p { margin: 0 0 16px; }
    .fv-p:last-child { margin-bottom: 0; }
    .fv-footer { padding: 18px 28px 22px; border-top: 1px solid #e3e6e2; background: #fafbfa;
      font-size: 12px; line-height: 1.5; color: #6b716c; }
`.trim()

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/**
 * Render the campaign body verbatim (ADR-0045): blank lines separate paragraphs,
 * a lone newline is a line break inside one, and every character is escaped. No
 * markdown, no auto-linking — the composer is a plain textarea, so the reader
 * sees exactly what the sender typed.
 */
function renderBody(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p class="fv-p">${escapeHtml(block).split('\n').join('<br />')}</p>`)
    .join('\n      ')
}

/**
 * Build the self-contained HTML document a campaign "sends" (ADR-0045): inline
 * styles, an inline SVG mark, no scripts, no external references, and a light
 * colour scheme regardless of the app theme — an inbox does not inherit the
 * reader's dark mode. Pure and total: chrome copy arrives already localized, so
 * the generator never touches i18next.
 *
 * The result is fed to a sandboxed `<iframe srcDoc>`; every caller-supplied
 * string is escaped, so the document is inert by construction.
 */
export function buildEmailHtml({ subject, body, lang, disclaimer }: EmailHtmlInput): string {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(subject)}</title>
    <style>
${STYLES}
    </style>
  </head>
  <body>
    <div class="fv-shell">
      <header class="fv-header">
        ${LOGO}
        <span class="fv-wordmark">FundaVida</span>
      </header>
      <main class="fv-main">
        <h1 class="fv-subject">${escapeHtml(subject)}</h1>
      ${renderBody(body)}
      </main>
      <footer class="fv-footer">${escapeHtml(disclaimer)}</footer>
    </div>
  </body>
</html>
`
}
