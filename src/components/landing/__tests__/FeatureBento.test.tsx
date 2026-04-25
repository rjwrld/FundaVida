import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { FeatureBento } from '../FeatureBento'

function renderBento() {
  return render(
    <I18nProvider>
      <FeatureBento />
    </I18nProvider>
  )
}

describe('FeatureBento', () => {
  it('renders the four cell titles', () => {
    renderBento()
    expect(screen.getByText('CRUD hero modules')).toBeInTheDocument()
    expect(screen.getByText('PDF certificates in the browser')).toBeInTheDocument()
    expect(screen.getByText('Bilingual from day one')).toBeInTheDocument()
    expect(screen.getByText('Deterministic demo data')).toBeInTheDocument()
  })
})
