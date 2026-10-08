import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonCard } from '../SkeletonCard'
// The label is translated; load the app's i18next instance (English default).
import '@/lib/i18n'

describe('<SkeletonCard />', () => {
  it('exposes a loading status role', () => {
    render(<SkeletonCard />)
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })
})
