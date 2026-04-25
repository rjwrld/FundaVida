import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { Hero } from '../Hero'

function renderHero() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('Hero', () => {
  it('renders the headline as a level-1 heading', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hope changes everything.' })
    ).toBeInTheDocument()
  })

  it('renders the subhead with the browser-only demo copy', () => {
    renderHero()
    expect(screen.getByText(/browser-only portfolio demo/i)).toBeInTheDocument()
  })

  it('renders the primary admin CTA', () => {
    renderHero()
    expect(screen.getByRole('button', { name: 'Enter as admin' })).toBeInTheDocument()
  })

  it('renders the GitHub link with safe link rels', () => {
    renderHero()
    const githubLink = screen.getByRole('link', { name: /view on github/i })
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
