import { describe, it, expect } from 'vitest'
import { buildEmailHtml } from '../emailHtml'

const base = {
  subject: 'Bienvenidos al nuevo trimestre',
  body: 'Primer párrafo.\n\nSegundo párrafo.',
  lang: 'es',
  disclaimer: 'Demostración — no se envió ningún correo.',
}

describe('buildEmailHtml — the document is inert (ADR-0045)', () => {
  it('never emits a script tag, even when the body is one', () => {
    const html = buildEmailHtml({ ...base, body: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes HTML in the subject', () => {
    const html = buildEmailHtml({ ...base, subject: 'Notas <b>finales</b> & becas' })
    expect(html).not.toContain('<b>finales</b>')
    expect(html).toContain('Notas &lt;b&gt;finales&lt;/b&gt; &amp; becas')
  })

  it('escapes quotes so an attribute cannot be broken out of', () => {
    const html = buildEmailHtml({ ...base, subject: '" onload="alert(1)' })
    expect(html).not.toContain('onload="alert(1)"')
    expect(html).toContain('&quot; onload=&quot;alert(1)')
  })

  it('references no external asset — not even an xmlns URL', () => {
    const html = buildEmailHtml(base)
    expect(html).not.toMatch(/https?:\/\//)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<link')
  })

  it('carries no event handlers', () => {
    expect(buildEmailHtml(base)).not.toMatch(/\son[a-z]+=/)
  })
})

describe('buildEmailHtml — the document is a branded email (ADR-0045)', () => {
  it('is a complete HTML document in the requested language', () => {
    const html = buildEmailHtml(base)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<html lang="es">')
    expect(html.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('pins itself to a light colour scheme regardless of the app theme', () => {
    expect(buildEmailHtml(base)).toContain('color-scheme')
  })

  it('inlines the FundaVida mark as SVG', () => {
    const html = buildEmailHtml(base)
    expect(html).toContain('<svg')
    expect(html).toContain('FundaVida')
  })

  it('carries the localized demo disclaimer in the footer', () => {
    expect(buildEmailHtml(base)).toContain(base.disclaimer)
    expect(
      buildEmailHtml({ ...base, lang: 'en', disclaimer: 'Demo — no email was sent.' })
    ).toContain('Demo — no email was sent.')
  })

  it('shows the subject as the document heading', () => {
    expect(buildEmailHtml(base)).toContain('Bienvenidos al nuevo trimestre')
  })
})

describe('buildEmailHtml — the body is verbatim (ADR-0045)', () => {
  it('splits blank-line-separated blocks into paragraphs', () => {
    const html = buildEmailHtml({ ...base, body: 'Uno.\n\nDos.\n\n\nTres.' })
    expect(html).toContain('>Uno.<')
    expect(html).toContain('>Dos.<')
    expect(html).toContain('>Tres.<')
    expect(html.match(/<p class="fv-p"/g)).toHaveLength(3)
  })

  it('keeps a single newline inside a paragraph as a line break', () => {
    const html = buildEmailHtml({ ...base, body: 'Línea uno\nLínea dos' })
    expect(html.match(/<p class="fv-p"/g)).toHaveLength(1)
    expect(html).toContain('Línea uno<br />Línea dos')
  })

  it('ignores leading and trailing blank lines', () => {
    const html = buildEmailHtml({ ...base, body: '\n\n  Solo.  \n\n' })
    expect(html.match(/<p class="fv-p"/g)).toHaveLength(1)
    expect(html).toContain('>Solo.<')
  })

  it('renders no paragraph at all for an empty body', () => {
    expect(buildEmailHtml({ ...base, body: '   \n\n  ' })).not.toContain('<p class="fv-p"')
  })

  it('does not interpret markdown or auto-link URLs', () => {
    const html = buildEmailHtml({ ...base, body: '**negrita** y www.fundavida.cr' })
    expect(html).not.toContain('<strong>')
    expect(html).not.toContain('<a ')
    expect(html).toContain('**negrita** y www.fundavida.cr')
  })
})
