import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BrandLockup } from '@/components/brand/BrandLockup'

function renderLockup(props?: Parameters<typeof BrandLockup>[0]) {
  return render(
    <MemoryRouter>
      <BrandLockup {...props} />
    </MemoryRouter>
  )
}

describe('<BrandLockup />', () => {
  it('renders a FundaVida link to /app using the transparent mark', () => {
    renderLockup()
    const link = screen.getByRole('link', { name: /fundavida/i })
    expect(link).toHaveAttribute('href', '/app')
    expect(link.querySelector('img')).toHaveAttribute('src', '/logo-mark.svg')
  })

  it('hides the wordmark text below sm by default (responsive mode)', () => {
    renderLockup()
    const wordmark = screen.getByText('FundaVida')
    expect(wordmark.className).toContain('hidden')
    expect(wordmark.className).toContain('sm:inline')
  })

  it('keeps the wordmark text visible at all widths with wordmark="always"', () => {
    renderLockup({ wordmark: 'always' })
    const wordmark = screen.getByText('FundaVida')
    expect(wordmark.className).not.toContain('hidden')
  })

  it('fires onClick when the lockup is clicked (drawer hosts close on it)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderLockup({ onClick })

    await user.click(screen.getByRole('link', { name: /fundavida/i }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
