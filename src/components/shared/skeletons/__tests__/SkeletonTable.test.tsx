import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonTable } from '../SkeletonTable'
// The label is translated; load the app's i18next instance (English default).
import '@/lib/i18n'

describe('<SkeletonTable />', () => {
  it('exposes a loading status role', () => {
    render(<SkeletonTable rows={2} columns={3} />)
    expect(screen.getByRole('status', { name: /loading table/i })).toBeInTheDocument()
  })
})
