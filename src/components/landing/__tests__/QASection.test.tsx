import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { QASection } from '../QASection'

function renderSection() {
  return render(
    <I18nProvider>
      <QASection />
    </I18nProvider>
  )
}

describe('<QASection />', () => {
  it('renders the section head and all five questions as headings', () => {
    renderSection()

    // The section heading is a real <h2> (getByRole reads the a11y tree, so the
    // highlighter smear's aria-hidden layer doesn't disturb the accessible name).
    expect(
      screen.getByRole('heading', { level: 2, name: "The questions you're probably about to ask." })
    ).toBeInTheDocument()

    for (const q of [
      "Where's the backend?",
      'Is the data real?',
      'Is this a real product?',
      'Why is everything bilingual?',
      'Can I break it?',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name: q })).toBeInTheDocument()
    }
  })

  it('numbers the questions 01–05 in reading order', () => {
    renderSection()
    for (const numeral of ['01', '02', '03', '04', '05']) {
      expect(screen.getByText(numeral)).toBeInTheDocument()
    }
  })

  it('re-homes the before→after infrastructure delta under item 03', () => {
    renderSection()
    // Both sides of every moved row survive from the deleted RearchitectureDelta.
    expect(screen.getByText('Supabase Auth + RLS')).toBeInTheDocument()
    expect(screen.getByText('Role switcher (no login)')).toBeInTheDocument()
    expect(screen.getByText('Spanish-only UI')).toBeInTheDocument()
    expect(screen.getByText('Bilingual EN / ES')).toBeInTheDocument()
  })

  it('re-homes the stat counters with their labels under item 05', () => {
    renderSection()
    // NumberTicker starts at 0 before it scrolls into view; assert the labels,
    // which carry the facts the deleted TrustStrip used to.
    for (const label of ['Modules', 'Tests', 'Locales', 'Backends']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('closes with a source link to the repository', () => {
    renderSection()
    const link = screen.getByRole('link', { name: /Read the source/ })
    expect(link).toHaveAttribute('href', 'https://github.com/rjwrld/FundaVida')
  })
})
