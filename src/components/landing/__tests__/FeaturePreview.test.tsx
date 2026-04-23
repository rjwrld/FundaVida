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
    expect(screen.getByText('Full-CRUD students module')).toBeInTheDocument()
    expect(screen.getByText('Certificate PDF generation')).toBeInTheDocument()
    expect(screen.getByText('Cross-cutting reports')).toBeInTheDocument()
  })

  it('renders three images with translated alt text', () => {
    renderWithI18n()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute(
      'alt',
      'Students list page with filter controls and seeded data.'
    )
  })
})
