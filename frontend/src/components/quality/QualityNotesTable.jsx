import { useMemo, useState } from 'react'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react'
import clsx from 'clsx'

/**
 * Generic table with client-side search + column sorting. Swap the `rows`
 * prop for the response of GET /api/quality/notes (optionally with
 * ?pending_approval=true for the Approvals Queue) once wired into api/client.js.
 *
 * columns: [{ key, label, sortable = true, render?: (row) => ReactNode }]
 */
export default function QualityNotesTable({
  title,
  icon: Icon,
  columns,
  rows,
  searchKeys = [],
  statusOptions,
  statusKey = 'status',
  emptyMessage = 'No records found.',
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    let out = rows
    if (statusFilter) out = out.filter((r) => r[statusKey] === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, search, statusFilter, statusKey, searchKeys, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    }
  }

  return (
    <div className="card-brutal-dark overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
        {Icon && <Icon size={17} className="text-primary-600" />}
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">{title}</h3>
        <span className="text-xs font-bold text-gray-400">{filtered.length}</span>

        <div className="ml-auto flex items-center gap-2">
          {statusOptions && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold px-3 py-2 rounded-lg outline-none focus:border-primary-600"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {searchKeys.length > 0 && (
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs pl-7 pr-3 py-2 rounded-lg outline-none focus:border-primary-600 w-40"
              />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={clsx(
                    'py-3 px-4 text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap select-none',
                    col.sortable !== false && 'cursor-pointer hover:text-primary-600'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      sortKey === col.key
                        ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                        : <ArrowUpDown size={11} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14 text-gray-400">
                  <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                  <span className="text-xs font-semibold">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={clsx(
                    'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
