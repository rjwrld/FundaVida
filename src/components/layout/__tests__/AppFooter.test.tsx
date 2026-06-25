import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { AppFooter } from '../AppFooter'

function renderFooter() {
  return render(
    <I18nProvider>
      <AppFooter />
    </I18nProvider>
  )
}

describe('<AppFooter />', () => {
  it('is a contentinfo landmark', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders the developer byline', () => {
    renderFooter()
    expect(screen.getByText(/developed by josue calderon/i)).toBeInTheDocument()
  })

  it('links the FundaVida wordmark to the org site, opening safely in a new tab', () => {
    renderFooter()
    const org = screen.getByRole('link', { name: /fundavida/i })
    expect(org).toHaveAttribute('href', 'https://www.fundavida.org/')
    expect(org).toHaveAttribute('target', '_blank')
    expect(org).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders GitHub and LinkedIn links with accessible names and safe rel', () => {
    renderFooter()
    const github = screen.getByRole('link', { name: /github/i })
    const linkedin = screen.getByRole('link', { name: /linkedin/i })
    expect(github).toHaveAttribute('href', 'https://github.com/rjwrld/FundaVida')
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/rjwrld/')
    for (const link of [github, linkedin]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })
})
