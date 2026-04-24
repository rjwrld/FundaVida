import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonCard } from '../SkeletonCard'

describe('<SkeletonCard />', () => {
  it('exposes a loading status role', () => {
    render(<SkeletonCard />)
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })
})
