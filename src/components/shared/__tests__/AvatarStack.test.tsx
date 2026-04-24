import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AvatarStack } from '../AvatarStack'

const avatars = [
  { fallback: 'AL', alt: 'Ada Lovelace' },
  { fallback: 'GH', alt: 'Grace Hopper' },
  { fallback: 'AT', alt: 'Alan Turing' },
  { fallback: 'KJ', alt: 'Katherine Johnson' },
  { fallback: 'LT', alt: 'Linus Torvalds' },
]

describe('<AvatarStack />', () => {
  it('renders fallback initials for the first max avatars', () => {
    render(<AvatarStack avatars={avatars} max={3} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('GH')).toBeInTheDocument()
    expect(screen.getByText('AT')).toBeInTheDocument()
  })

  it('shows an overflow counter when there are more avatars', () => {
    render(<AvatarStack avatars={avatars} max={3} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not show a counter when count fits', () => {
    render(<AvatarStack avatars={avatars.slice(0, 2)} max={3} />)
    expect(screen.queryByText(/^\+/)).toBeNull()
  })
})
