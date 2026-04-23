import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { LandingFooter } from '../LandingFooter'

describe('LandingFooter', () => {
  it('renders external links with rel="noopener noreferrer"', () => {
    render(
      <I18nProvider>
        <LandingFooter />
      </I18nProvider>
    )
    const orgLink = screen.getByRole('link', { name: /fundavida org/i })
    const githubLink = screen.getByRole('link', { name: /source/i })
    const linkedinLink = screen.getByRole('link', { name: /linkedin/i })
    for (const link of [orgLink, githubLink, linkedinLink]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('renders the FundaVida org and source links', () => {
    render(
      <I18nProvider>
        <LandingFooter />
      </I18nProvider>
    )
    expect(screen.getByRole('link', { name: /fundavida org/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source/i })).toBeInTheDocument()
  })
})
