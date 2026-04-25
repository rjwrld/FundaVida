import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { FinalCTA } from '../FinalCTA'

function renderFinalCTA() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FinalCTA />} />
          <Route path="/app" element={<div>ON_APP</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('FinalCTA', () => {
  it('renders the admin CTA button', () => {
    renderFinalCTA()
    expect(screen.getByRole('button', { name: 'Enter as admin' })).toBeInTheDocument()
  })

  it('navigates to /app when the CTA is clicked', async () => {
    const user = userEvent.setup()
    renderFinalCTA()
    await user.click(screen.getByRole('button', { name: 'Enter as admin' }))
    expect(await screen.findByText('ON_APP')).toBeInTheDocument()
  })
})
