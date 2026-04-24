import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonStatCard } from '../SkeletonStatCard'

describe('<SkeletonStatCard />', () => {
  it('exposes a loading status role', () => {
    render(<SkeletonStatCard />)
    expect(screen.getByRole('status', { name: /loading stat/i })).toBeInTheDocument()
  })
})
