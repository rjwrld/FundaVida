import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BrandLockup } from '@/components/brand/BrandLockup'

describe('<BrandLockup />', () => {
  it('renders a FundaVida link to /app using the transparent mark', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BrandLockup />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /fundavida/i })
    expect(link).toHaveAttribute('href', '/app')
    expect(link.querySelector('img')).toHaveAttribute('src', '/logo-mark.svg')
  })
})
