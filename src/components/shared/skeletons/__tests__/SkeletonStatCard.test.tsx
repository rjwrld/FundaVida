import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonStatCard } from '../SkeletonStatCard'
// The label is translated; load the app's i18next instance (English default).
import '@/lib/i18n'

describe('<SkeletonStatCard />', () => {
  it('exposes a loading status role', () => {
    render(<SkeletonStatCard />)
    expect(screen.getByRole('status', { name: /loading stat/i })).toBeInTheDocument()
  })
})
