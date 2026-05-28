import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInvoices, exportCSV, exportExcel } from '../api/client'
import { Search, Filter, Download, FileText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const PLATFORMS = ['', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Other']
const STATUSES = ['', 'processed', 'needs_review', 'error']
const PAGE_SIZE = 25

function StatusBadge({ status }) {
  const cls = {
    processed: 'badge-processed',
    needs_review: 'badge-review',
    error: 'badge-error',
    duplicate: 'badge-duplicate',
  }
  const label = { processed: 'Processed', needs_review: 'Review', error: 'Error', duplicate: 'Dup.' }
  return <span className={cls[status] || 'badge-processed'}>{label[status] || status}</span>
}

function ConfidenceDot({ score }) {
  if (score == null) return <span className="text-white/20">—</span>
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className={clsx('w-2 h-2 rounded-full', color)} />
      <span className="text-xs text-white/60">{pct}%</span>
    </div>
  )
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listInvoices({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        platform: platform || undefined,
        status: status || undefined,
      })
      setInvoices(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, platform, status])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, platform, status])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoices</h1>
          <p className="text-white/40 mt-0.5 text-sm">{total.toLocaleString()} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV({ platform, status })} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => exportExcel({ platform, status })} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={15} /> Excel
          </button>
          <button onClick={fetchInvoices} className="btn-ghost p-2.5">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input pl-9"
            placeholder="Search invoice #, seller, order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44 cursor-pointer"
          value={platform}
          onChange={e => setPlatform(e.target.value)}
        >
          {PLATFORMS.map(p => <option key={p} value={p} className="bg-surface-800">{p || 'All Platforms'}</option>)}
        </select>
        <select
          className="input w-40 cursor-pointer"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s} className="bg-surface-800">{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-surface-900/50 flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="animate-spin text-brand-400" size={24} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                {['File', 'Platform', 'Invoice #', 'Date', 'Seller', 'Total', 'Confidence', 'Status'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-white/30">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr
                    key={inv.id}
                    className="table-row"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="table-cell font-medium text-white max-w-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-brand-400 shrink-0" />
                        <span className="truncate text-sm">{inv.file_name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {inv.platform ? (
                        <span className="bg-brand-600/20 text-brand-300 text-xs px-2 py-0.5 rounded-full">{inv.platform}</span>
                      ) : '—'}
                    </td>
                    <td className="table-cell font-mono text-xs">{inv.invoice_number || '—'}</td>
                    <td className="table-cell text-xs text-white/60">{inv.invoice_date || '—'}</td>
                    <td className="table-cell max-w-[150px]">
                      <span className="truncate block text-sm">{inv.seller_name || '—'}</span>
                    </td>
                    <td className="table-cell font-semibold text-white">{formatCurrency(inv.grand_total)}</td>
                    <td className="table-cell"><ConfidenceDot score={inv.confidence_score} /></td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-white/40">
              Page {page + 1} of {totalPages} · {total} records
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
