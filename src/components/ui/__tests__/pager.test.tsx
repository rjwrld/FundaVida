import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { Pager } from '@/components/ui/pager'
import type { UsePaginationResult } from '@/hooks/usePagination'

/** A pagination result with no-op controls; override per test. */
function fakePagination(
  over: Partial<UsePaginationResult<unknown>> = {}
): UsePaginationResult<unknown> {
  return {
    page: 1,
    pageSize: 10,
    pageCount: 3,
    pageItems: [],
    total: 25,
    range: { from: 1, to: 10 },
    canPrev: false,
    canNext: true,
    setPageSize: vi.fn(),
    first: vi.fn(),
    prev: vi.fn(),
    next: vi.fn(),
    last: vi.fn(),
    ...over,
  }
}

function renderPager(pagination: UsePaginationResult<unknown>, pageSizeOptions?: number[]) {
  return render(
    <I18nProvider>
      <Pager pagination={pagination} pageSizeOptions={pageSizeOptions} />
    </I18nProvider>
  )
}

describe('<Pager />', () => {
  it('announces the current page and visible range', () => {
    renderPager(fakePagination())

    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(nav).toBeInTheDocument()

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Page 1 of 3')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
  })

  it('disables first/prev at the start and enables next/last', () => {
    renderPager(fakePagination({ canPrev: false, canNext: true }))

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Last page' })).toBeEnabled()
  })

  it('invokes the matching control when a nav button is pressed', async () => {
    const user = userEvent.setup()
    const pagination = fakePagination({ canPrev: true, canNext: true })
    renderPager(pagination)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(pagination.next).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expect(pagination.last).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(pagination.prev).toHaveBeenCalledOnce()
  })

  it('changes the page size through the select', async () => {
    const user = userEvent.setup()
    const pagination = fakePagination()
    renderPager(pagination, [10, 25, 50])

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await user.click(screen.getByRole('option', { name: '25' }))
    expect(pagination.setPageSize).toHaveBeenCalledWith(25)
  })

  // A pager over rows that all fit on the smallest page is chrome with no job:
  // every control is disabled and the size choice changes nothing.
  it('renders nothing when every row fits on the smallest page size', () => {
    renderPager(fakePagination({ total: 10, pageCount: 1, canNext: false }), [10, 25, 50])

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('stays when the rows outgrow the smallest page size', () => {
    renderPager(fakePagination({ total: 11, pageCount: 2 }), [10, 25, 50])

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })
})
