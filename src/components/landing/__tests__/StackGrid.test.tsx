import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { StackGrid } from '../StackGrid'

function renderStackGrid() {
  return render(
    <I18nProvider>
      <StackGrid />
    </I18nProvider>
  )
}

describe('StackGrid', () => {
  it('renders dependency cells with their name and kind caption', () => {
    renderStackGrid()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Zustand')).toBeInTheDocument()
    expect(screen.getByText('Playwright')).toBeInTheDocument()
    // The kind caption rides alongside the name.
    expect(screen.getByText('E2E')).toBeInTheDocument()
  })

  it('renders the center message with the "It\'s all here." headline', () => {
    renderStackGrid()
    expect(screen.getByRole('heading', { name: /It's all here\./i })).toBeInTheDocument()
    expect(screen.getByText(/Plus 40 more in package\.json\./i)).toBeInTheDocument()
  })
})
