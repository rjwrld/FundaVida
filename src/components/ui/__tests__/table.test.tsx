import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Table, TableBody, TableCell, TableRow } from '../table'

function renderTable() {
  render(
    <Table aria-label="Hours">
      <TableBody>
        <TableRow>
          <TableCell>Row</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
  const container = screen.getByRole('table').parentElement
  if (!container) throw new Error('expected a table container')
  return container
}

function mockBox(width: { scroll: number; client: number }) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(width.scroll)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width.client)
}

describe('<Table />', () => {
  afterEach(() => vi.restoreAllMocks())

  it('stays out of the tab order and unfaded when it fits', () => {
    mockBox({ scroll: 300, client: 300 })
    const container = renderTable()
    expect(container).not.toHaveAttribute('tabindex')
    expect(container).not.toHaveAttribute('data-fade-end')
  })

  it('becomes keyboard-scrollable and fades the clipped edge when it overflows', () => {
    mockBox({ scroll: 800, client: 300 })
    const container = renderTable()
    expect(container).toHaveAttribute('tabindex', '0')
    expect(container).toHaveAttribute('data-fade-end')
    expect(container).not.toHaveAttribute('data-fade-start')

    container.scrollLeft = 500
    fireEvent.scroll(container)
    expect(container).toHaveAttribute('data-fade-start')
    expect(container).not.toHaveAttribute('data-fade-end')
  })
})
