import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducedMotion } from 'framer-motion'
import { I18nProvider } from '@/lib/i18n'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { ListView } from '@/components/shared/ListView'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { listViewState } from '@/lib/listViewState'

/**
 * The DataTable contract suite (ADR-0047 phase 3a).
 *
 * `DataTable` is about to be rebased onto TanStack Table. The ADR names three
 * contracts the rebase must preserve — the dual render, the framer-motion row
 * enter/exit behind `useReducedMotion`, and the `Pager`/`usePagination`
 * integration — and this file pins them (plus sorting and the empty/loading
 * seam) against the CURRENT implementation, so the swap is a refactor and not a
 * silent behavior change. Every test here is behavioral: it asserts what a user
 * or a Playwright selector can observe, never how the component is wired.
 */

/**
 * The reduced-motion opt-out hangs off framer's `useReducedMotion()`, which reads the
 * `(prefers-reduced-motion: reduce)` media query itself — it does NOT consult the
 * `<MotionConfig reducedMotion>` the app wraps around it (that only steers framer's own
 * animation engine). jsdom has no preference to flip, and framer latches its answer in a
 * module-level singleton on the first read, so the hook is the seam: mock it (per the
 * sonner/StatCard precedent) and let each test drive it. The rest of the module is the
 * real thing — the rows have to actually animate here.
 */
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

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

/** Body (data) row elements in the rendered table, in DOM order. */
function dataRows(): HTMLElement[] {
  const table = screen.getByRole('table')
  return within(table).getAllByRole('row').slice(1) // drop header row
}

/** First body (data) row element in the rendered table. */
function firstBodyRow() {
  const table = screen.getByRole('table')
  const row = within(table).getAllByRole('row')[1]
  if (!row) throw new Error('expected at least one body row')
  return row as HTMLElement
}

/** The sort indicator icon rendered inside a column header. */
function sortIcon(headerName: string) {
  const header = screen.getByRole('columnheader', { name: headerName })
  const icon = header.querySelector('svg')
  if (!icon) throw new Error(`no sort indicator in the "${headerName}" header`)
  return icon
}

function sortButton(headerName: string) {
  const header = screen.getByRole('columnheader', { name: headerName })
  return within(header).getByRole('button')
}

describe('<DataTable /> — pager integration (usePagination)', () => {
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

  it('reports the visible row range', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument()
  })

  it('honors a caller-supplied initial page size', () => {
    renderTable({ pageSize: 5, pageSizeOptions: [5, 15] })

    expect(bodyRowNames()).toHaveLength(5)
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toHaveValue('5')
  })

  it('offers the caller-supplied page sizes in the select', () => {
    renderTable({ pageSize: 5, pageSizeOptions: [5, 15] })

    const options = within(screen.getByLabelText('Rows per page')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['5', '15'])
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

  it('returns to the first page when the page size changes', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '25')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(bodyRowNames()[0]).toBe('Name 1')
  })

  it('clamps the page when the data shrinks beneath the current window', async () => {
    // A filter narrowing the list must never strand the window past the end
    // (usePagination clamps; the rows re-window instead of rendering blank).
    const user = userEvent.setup()
    const { rerender } = renderTable()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    rerender(
      <I18nProvider>
        <DataTable data={makeRows(4)} columns={columns} getRowKey={(r) => r.id} />
      </I18nProvider>
    )

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(bodyRowNames()).toEqual(['Name 1', 'Name 2', 'Name 3', 'Name 4'])
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
})

describe('<DataTable /> — sorting', () => {
  const unsorted: Row[] = [
    { id: 'a', name: 'Charlie', score: 30 },
    { id: 'b', name: 'Alice', score: 10 },
    { id: 'c', name: 'Bob', score: 20 },
  ]

  it('toggles a sortable column through ascending, descending and none', async () => {
    const user = userEvent.setup()
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

  it('shows the sort direction in the header indicator', async () => {
    // The icon is the only sighted cue for the sort state (aria-sort carries it
    // for AT), so the up/down/idle triple is part of the contract, not chrome.
    const user = userEvent.setup()
    renderTable({ data: unsorted })

    expect(sortIcon('Name').classList.contains('lucide-arrow-up-down')).toBe(true)
    expect(sortIcon('Name')).toHaveClass('opacity-40') // idle: dimmed

    await user.click(sortButton('Name'))
    expect(sortIcon('Name').classList.contains('lucide-arrow-up')).toBe(true)
    expect(sortIcon('Name')).not.toHaveClass('opacity-40')

    await user.click(sortButton('Name'))
    expect(sortIcon('Name').classList.contains('lucide-arrow-down')).toBe(true)

    await user.click(sortButton('Name'))
    expect(sortIcon('Name').classList.contains('lucide-arrow-up-down')).toBe(true)
  })

  it('keeps the idle indicator on the columns that are not the active sort', async () => {
    const user = userEvent.setup()
    renderTable({ data: unsorted })

    await user.click(sortButton('Name'))
    expect(sortIcon('Score').classList.contains('lucide-arrow-up-down')).toBe(true)
  })

  it('moves the sort to another column, restarting at ascending', async () => {
    // Sorting is single-column: taking Score hands Name back to its unsorted state.
    const user = userEvent.setup()
    renderTable({ data: unsorted })

    await user.click(sortButton('Name'))
    await user.click(sortButton('Name')) // Name is now descending
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending'
    )

    await user.click(sortButton('Score'))
    expect(bodyRowNames()).toEqual(['Alice', 'Bob', 'Charlie']) // 10, 20, 30
    expect(screen.getByRole('columnheader', { name: 'Score' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'none')
  })

  it('sorts numeric columns by value, not lexically', async () => {
    const user = userEvent.setup()
    renderTable({
      data: [
        { id: 'a', name: 'Charlie', score: 30 },
        { id: 'b', name: 'Alice', score: 100 },
        { id: 'c', name: 'Bob', score: 9 },
      ],
    })

    await user.click(sortButton('Score')) // ascending
    expect(bodyRowNames()).toEqual(['Bob', 'Charlie', 'Alice']) // 9, 30, 100
  })

  it('sorts the whole data set before windowing it, not just the visible page', async () => {
    const user = userEvent.setup()
    renderTable() // 25 rows, scores 1…25

    await user.click(sortButton('Score')) // ascending
    await user.click(sortButton('Score')) // descending

    // Descending over all 25 rows — not a re-ordering of page 1's ten rows.
    // Waited, not read synchronously: a sort that swaps the windowed rows leaves
    // the outgoing ones mounted until their exit animation finishes, so the body
    // briefly holds both sets (see "row motion" below).
    await waitFor(() => {
      expect(bodyRowNames()).toHaveLength(10)
      expect(bodyRowNames()[0]).toBe('Name 25')
      expect(bodyRowNames()[9]).toBe('Name 16')
    })
  })

  it('stays on the current page when the sort changes', async () => {
    // Today the page index survives a sort change. TanStack's `autoResetPageIndex`
    // defaults to TRUE (it would snap back to page 1), so the rebase has to opt
    // out to keep this behavior — that is exactly why it is pinned here.
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    await user.click(sortButton('Score')) // ascending
    await user.click(sortButton('Score')) // descending

    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    // Page 3 of the descending order: scores 5…1.
    await waitFor(() =>
      expect(bodyRowNames()).toEqual(['Name 5', 'Name 4', 'Name 3', 'Name 2', 'Name 1'])
    )
  })

  it('does not mutate the array it was handed', async () => {
    const user = userEvent.setup()
    const data = [...unsorted]

    renderTable({ data })
    await user.click(sortButton('Name'))

    expect(data).toEqual(unsorted) // the caller's (scoped) array is untouched
  })

  it('keys rows by getRowKey, so sorting reorders nodes instead of remounting them', async () => {
    // Row identity is what lets the exit/enter animations and any future row
    // state survive a re-sort; a rebase that keys rows by index would remount
    // every row on every sort.
    const user = userEvent.setup()
    renderTable({ data: unsorted })

    const aliceRow = screen.getByText('Alice').closest('tr')
    await user.click(sortButton('Name'))

    expect(screen.getByText('Alice').closest('tr')).toBe(aliceRow)
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
})

describe('<DataTable /> — columns', () => {
  it('renders the columns in declared order, right-aligning where asked', () => {
    renderTable({ data: makeRows(1) })

    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Name', 'Score'])

    const cells = within(firstBodyRow()).getAllByRole('cell')
    expect(cells.map((c) => c.textContent)).toEqual(['Name 1', '1'])
    expect(headers[1]).toHaveClass('text-right')
    expect(cells[1]).toHaveClass('text-right')
  })
})

describe('<DataTable /> — dual render (table ≥sm, cards <sm)', () => {
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

  it('renders each row TWICE when cards are on — the strict-mode implication', () => {
    // Both renders are always in the DOM; only CSS decides which one is visible.
    // So a text/CSS selector matches twice and Playwright's strict mode fails on
    // it (`getByText` resolves to 2), while role queries stay unambiguous because
    // the card's markup is not a table cell. Every e2e selector over a DataTable
    // surface depends on this, so the rebase must keep both renders mounted.
    renderTable({ renderCard: (r: Row) => <span>{r.name}</span> })

    expect(screen.getAllByText('Name 1')).toHaveLength(2)
    expect(screen.getAllByRole('cell', { name: 'Name 1' })).toHaveLength(1)
  })

  it('renders each row once when no cards are given', () => {
    renderTable()

    expect(screen.getAllByText('Name 1')).toHaveLength(1)
  })
})

describe('<DataTable /> — row motion', () => {
  it('holds a removed row in the DOM for its exit animation, then drops it', async () => {
    // AnimatePresence defers the unmount so the row can fade out; a rebase that
    // renders rows without it would rip the node out synchronously.
    const { rerender } = renderTable({ data: makeRows(3) })
    expect(bodyRowNames()).toEqual(['Name 1', 'Name 2', 'Name 3'])

    rerender(
      <I18nProvider>
        <DataTable data={makeRows(3).slice(1)} columns={columns} getRowKey={(r) => r.id} />
      </I18nProvider>
    )

    // Still mounted on the commit that removed it from `data`…
    expect(bodyRowNames()).toEqual(['Name 1', 'Name 2', 'Name 3'])
    // …and gone once the exit animation finishes.
    await waitFor(() => expect(bodyRowNames()).toEqual(['Name 2', 'Name 3']))
  })

  it('settles every windowed row to fully visible', async () => {
    renderTable({ data: makeRows(3) })

    await waitFor(() => {
      expect(screen.getByText('Name 1')).toBeVisible()
      expect(screen.getByText('Name 3')).toBeVisible()
    })
  })

  it('keeps rows mounted and visible under prefers-reduced-motion (no hidden initial state)', () => {
    // With the preference on, the body opts out of the enter/exit variants entirely, so
    // no row is left in an opacity-0 initial state that depends on an animation firing to
    // become visible — the failure mode that would strand every row invisible for a user
    // whose OS suppresses animations. toBeVisible() is what carries it: an opacity-0 row
    // fails it. Read synchronously, on the mount commit: there is nothing to wait for.
    vi.mocked(useReducedMotion).mockReturnValue(true)
    renderTable()

    expect(within(firstBodyRow()).getByRole('cell', { name: 'Name 1' })).toBeVisible()
    expect(screen.getByText('Name 10')).toBeVisible()
    expect(dataRows().every((row) => row.style.opacity === '')).toBe(true)
  })

  it('still removes a row under prefers-reduced-motion', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { rerender } = renderTable({ data: makeRows(3) })

    rerender(
      <I18nProvider>
        <DataTable data={makeRows(3).slice(1)} columns={columns} getRowKey={(r) => r.id} />
      </I18nProvider>
    )

    await waitFor(() => expect(bodyRowNames()).toEqual(['Name 2', 'Name 3']))
  })

  it('leaves the mobile cards visible under prefers-reduced-motion too', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    renderTable({ renderCard: (r: Row) => <span>Card {r.name}</span> })

    const cards = screen.getAllByRole('listitem')
    expect(cards).toHaveLength(10)
    cards.forEach((card) => expect(card).toBeVisible())
  })

  /**
   * The staggered entrance (#349). Rows inherit `initial="hidden"`/`animate="visible"`
   * from `MotionTableBody`, whose `staggerChildren` walks them in order — so each row
   * mounts at the `fadeUp` hidden target and settles later than the one above it.
   *
   * Two things this guards, because both were once broken and neither is visible to a
   * text query: a row that passes a *string* variant label to `exit` is classified as
   * variant-controlling and stops inheriting the body's `initial`/`animate` entirely
   * (it then renders with no motion styles at all), and an `<AnimatePresence
   * initial={false}>` suppresses the entrance of the children present at its own first
   * mount — which, inside a body that remounts per page, is every page.
   */
  // A whole page on one screen: 25 rows means the last one waits out 24 stagger steps
  // (~1.4s) before it even starts, which is the margin the mid-flight sample below
  // spends. The window is generous on purpose — a stagger read on a loaded CI box is a
  // race if you give it only a couple of frames.
  const onePage = { pageSize: 25, pageSizeOptions: [25] }
  const allOf = (value: number) => Array(25).fill(value)

  it('staggers the row entrance when motion is enabled', async () => {
    renderTable(onePage)

    // Every row mounts at fadeUp's hidden target. (Pre-fix the rows carried no motion
    // styles at all, so this read was '' — NaN — rather than 0.)
    const opacities = () => dataRows().map((row) => Number(row.style.opacity))
    expect(opacities()).toEqual(allOf(0))

    // Staggered: sampled once the first row is under way, the last row — 24 stagger
    // steps behind it — is still further from visible. A simultaneous fade would tie
    // here instead of trailing.
    await waitFor(() => expect(opacities()[0]).toBeGreaterThan(0))
    const midFlight = opacities()
    expect(midFlight[24]).toBeLessThan(midFlight[0] as number)

    // …and every row settles fully visible, none stranded hidden.
    await waitFor(() => expect(opacities()).toEqual(allOf(1)), { timeout: 4000 })
  })

  it('staggers the mobile card entrance too', async () => {
    renderTable({ ...onePage, renderCard: (r: Row) => <span>Card {r.name}</span> })

    const cardOpacities = () =>
      screen.getAllByRole('listitem').map((li) => Number(li.style.opacity))
    expect(cardOpacities()).toEqual(allOf(0))

    await waitFor(() => expect(cardOpacities()[0]).toBeGreaterThan(0))
    const midFlight = cardOpacities()
    expect(midFlight[24]).toBeLessThan(midFlight[0] as number)

    await waitFor(() => expect(cardOpacities()).toEqual(allOf(1)), { timeout: 4000 })
  })

  it('re-runs the entrance on the next page, not just the first', async () => {
    // The body remounts per page precisely so the entrance replays. An
    // `<AnimatePresence initial={false}>` inside it would silently swallow that: the
    // page's rows would snap straight to visible instead of entering.
    const user = userEvent.setup()
    renderTable()
    await waitFor(() => expect(dataRows()[0]?.style.opacity).toBe('1'))

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(bodyRowNames()[0]).toBe('Name 11')
    const entering = dataRows().map((row) => Number(row.style.opacity))
    expect(entering[9]).toBeLessThan(1) // still entering, not already settled
    await waitFor(() => expect(dataRows()[9]?.style.opacity).toBe('1'), { timeout: 4000 })
  })
})

describe('<DataTable /> — empty state', () => {
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

  it('drops the card list along with the table when empty', () => {
    const { container } = renderTable({ data: [], renderCard: (r: Row) => <span>{r.name}</span> })

    expect(container.querySelector('ul')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })
})

describe('<DataTable /> — loading is the list shell’s branch, not the table’s', () => {
  // DataTable owns no loading state by design: the pages wrap it in <ListView>,
  // which renders the skeleton *instead of* the table while the query is in
  // flight (ADR-0032). Pinned here because the rebase must not grow its own
  // loading branch — that would double-render the skeleton on every list page.
  const listView = (isLoading: boolean) => (
    <I18nProvider>
      <ListView
        state={listViewState({ isLoading, count: isLoading ? 0 : 25, hasFilters: false })}
        skeleton={<SkeletonTable rows={8} columns={2} />}
        empty={<p>Nothing yet</p>}
        noResults={<p>No matches</p>}
        content={<DataTable data={makeRows(25)} columns={columns} getRowKey={(r) => r.id} />}
      />
    </I18nProvider>
  )

  it('shows the skeleton and never mounts the table while loading', () => {
    render(listView(true))

    expect(screen.getByRole('status', { name: 'Loading table' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument()
  })

  it('swaps the skeleton for the table once the rows arrive', () => {
    const { rerender } = render(listView(true))
    rerender(listView(false))

    expect(screen.queryByRole('status', { name: 'Loading table' })).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(bodyRowNames()).toHaveLength(10)
  })
})

describe('<DataTableCard />', () => {
  const withActions: DataTableColumn<Row>[] = [
    ...columns,
    { id: 'actions', header: 'Actions', cell: () => <button type="button">Edit</button> },
  ]

  it('renders the title cell prominently and every other column as a labeled value', () => {
    const row: Row = { id: 'r1', name: 'Name 1', score: 1 }
    render(
      <I18nProvider>
        <DataTableCard row={row} columns={columns} titleColumnId="name" />
      </I18nProvider>
    )
    // Title column: just the value, no label.
    expect(screen.getByText('Name 1')).toBeInTheDocument()
    // Non-title column: header rendered as the label, cell as the value.
    const scoreLabel = screen.getByText('Score')
    expect(scoreLabel.tagName).toBe('DT')
    expect(screen.getByText('1')).toBeInTheDocument()
    // Title is not repeated as a label row.
    expect(screen.queryByText('Name')).not.toBeInTheDocument()
  })

  it('renders the actions column in its own slot, not as a labeled row', () => {
    const row: Row = { id: 'r1', name: 'Name 1', score: 1 }
    render(
      <I18nProvider>
        <DataTableCard
          row={row}
          columns={withActions}
          titleColumnId="name"
          actionsColumnId="actions"
        />
      </I18nProvider>
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    // The actions header is not rendered as a detail label.
    expect(screen.queryByText('Actions')).not.toBeInTheDocument()
  })

  it('shows the same data the table row shows, column for column', () => {
    // The card is the mobile counterpart of the row — if a rebase changes the
    // column set, both renders must move together (ADR-0047's dual render).
    const row: Row = { id: 'r1', name: 'Name 1', score: 42 }
    render(
      <I18nProvider>
        <DataTableCard row={row} columns={columns} titleColumnId="name" />
      </I18nProvider>
    )

    const labels = screen.getAllByRole('term').map((dt) => dt.textContent)
    const values = screen.getAllByRole('definition').map((dd) => dd.textContent)
    expect(labels).toEqual(['Score'])
    expect(values).toEqual(['42'])
  })
})
