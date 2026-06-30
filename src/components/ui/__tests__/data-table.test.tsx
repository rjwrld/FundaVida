import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

interface Row {
  id: string
  name: string
  score: number
}

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, name: `Name ${i + 1}`, score: i + 1 }))

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true, sortAccessor: (r) => r.name },
  {
    id: 'score',
    header: 'Score',
    cell: (r) => r.score,
    align: 'right',
    sortable: true,
    sortAccessor: (r) => r.score,
  },
]

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <I18nProvider>
      <DataTable data={makeRows(25)} columns={columns} getRowKey={(r) => r.id} {...props} />
    </I18nProvider>
  )
}

/** Data rows in the (single) rendered table, excluding the header row. */
function bodyRowNames() {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1) // drop header row
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
}

describe('<DataTable />', () => {
  it('windows the first page of rows and reports the current page', () => {
    renderTable()

    const names = bodyRowNames()
    expect(names).toHaveLength(10)
    expect(names[0]).toBe('Name 1')
    expect(names[9]).toBe('Name 10')
    expect(screen.queryByText('Name 11')).not.toBeInTheDocument()

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('pages forward and backward through the rows', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyRowNames()[0]).toBe('Name 11')
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(bodyRowNames()).toEqual(['Name 21', 'Name 22', 'Name 23', 'Name 24', 'Name 25'])
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'First page' }))
    expect(bodyRowNames()[0]).toBe('Name 1')
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('disables first/prev on the first page and next/last on the last page', async () => {
    const user = userEvent.setup()
    renderTable()

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('toggles a sortable column through ascending, descending and none', async () => {
    const user = userEvent.setup()
    const unsorted: Row[] = [
      { id: 'a', name: 'Charlie', score: 30 },
      { id: 'b', name: 'Alice', score: 10 },
      { id: 'c', name: 'Bob', score: 20 },
    ]
    renderTable({ data: unsorted })

    // Original insertion order.
    expect(bodyRowNames()).toEqual(['Charlie', 'Alice', 'Bob'])

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    const nameButton = within(nameHeader).getByRole('button')

    await user.click(nameButton) // ascending
    expect(bodyRowNames()).toEqual(['Alice', 'Bob', 'Charlie'])
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.click(nameButton) // descending
    expect(bodyRowNames()).toEqual(['Charlie', 'Bob', 'Alice'])
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending')

    await user.click(nameButton) // none → back to original order
    expect(bodyRowNames()).toEqual(['Charlie', 'Alice', 'Bob'])
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')
  })

  it('sorts numeric columns by value, not lexically', async () => {
    const user = userEvent.setup()
    const unsorted: Row[] = [
      { id: 'a', name: 'Charlie', score: 30 },
      { id: 'b', name: 'Alice', score: 100 },
      { id: 'c', name: 'Bob', score: 9 },
    ]
    renderTable({ data: unsorted })

    const scoreHeader = screen.getByRole('columnheader', { name: 'Score' })
    await user.click(within(scoreHeader).getByRole('button')) // ascending
    expect(bodyRowNames()).toEqual(['Bob', 'Charlie', 'Alice']) // 9, 30, 100
  })

  it('renders a default empty state and no pager when there are zero rows', () => {
    renderTable({ data: [] })

    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('renders a caller-supplied empty state when provided', () => {
    renderTable({ data: [], emptyState: <p>Nothing enrolled yet</p> })

    expect(screen.getByText('Nothing enrolled yet')).toBeInTheDocument()
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
  })

  it('reports the visible row range', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument()
  })

  it('changes the page size and re-windows the rows', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()

    const sizeSelect = screen.getByLabelText('Rows per page')
    await user.selectOptions(sizeSelect, '25')

    expect(bodyRowNames()).toHaveLength(25)
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('does not make non-sortable columns clickable', () => {
    const plainColumns: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name },
    ]
    renderTable({ data: makeRows(3), columns: plainColumns })

    const header = screen.getByRole('columnheader', { name: 'Name' })
    expect(within(header).queryByRole('button')).not.toBeInTheDocument()
    expect(header).not.toHaveAttribute('aria-sort')
  })

  it('announces the current page in a labelled, polite live region', () => {
    renderTable()

    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(nav).toBeInTheDocument()

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Page 1 of 3')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('lets keyboard users operate the pager', async () => {
    const user = userEvent.setup()
    renderTable()

    const next = screen.getByRole('button', { name: 'Next page' })
    next.focus()
    expect(next).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('renders a mobile card for each windowed row when renderCard is given', async () => {
    const user = userEvent.setup()
    renderTable({ renderCard: (r: Row) => <span>Card {r.name}</span> })

    const cards = screen.getAllByRole('listitem')
    expect(cards).toHaveLength(10)
    expect(cards[0]).toHaveTextContent('Card Name 1')

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Card Name 11')
  })

  it('hides the desktop table on mobile and shows the card list, only when cards are given', () => {
    const withCards = renderTable({ renderCard: (r: Row) => <span>{r.name}</span> })
    const desktop = withCards.container.querySelector('.rounded-xl.border')
    expect(desktop).toHaveClass('hidden', 'sm:block')
    expect(withCards.container.querySelector('ul')).toHaveClass('sm:hidden')
    withCards.unmount()

    const plain = renderTable()
    expect(plain.container.querySelector('.rounded-xl.border')).not.toHaveClass('hidden')
    expect(plain.container.querySelector('ul')).toBeNull()
  })
})
