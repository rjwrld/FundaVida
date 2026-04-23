import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { FeaturePreview } from '../FeaturePreview'

function renderWithI18n() {
  return render(
    <I18nProvider>
      <FeaturePreview />
    </I18nProvider>
  )
}

describe('FeaturePreview', () => {
  it('renders three feature cards with translated titles', () => {
    renderWithI18n()
    expect(screen.getByText(/CRUD students/i)).toBeInTheDocument()
    expect(screen.getByText(/Certificate PDF/i)).toBeInTheDocument()
    expect(screen.getByText(/Cross-cutting reports/i)).toBeInTheDocument()
  })

  it('renders three images with translated alt text', () => {
    renderWithI18n()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute('alt', expect.stringMatching(/students list/i))
    expect(images[1]).toHaveAttribute('alt', expect.stringMatching(/certificate/i))
    expect(images[2]).toHaveAttribute('alt', expect.stringMatching(/reports/i))
  })
})
