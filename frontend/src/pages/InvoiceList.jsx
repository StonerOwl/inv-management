import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInvoices, exportCSV, exportExcel } from '../api/client'
import { Search, Filter, Download, FileText, ChevronLeft, ChevronRight, RefreshCw, Loader2, Edit2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'


const STATUSES = ['', 'processed', 'needs_review', 'error']
const PAGE_SIZE = 25

function StatusBadge({ status }) {
  const cls = {
    processed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    needs_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    duplicate: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  }
  const label = { processed: 'PROCESSED', needs_review: 'REVIEW', error: 'ERROR', duplicate: 'DUP' }
  return <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide border', cls[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700')}>{label[status] || status}</span>
}

function ConfidenceDot({ score }) {
  if (score == null) return <span className="text-gray-700 dark:text-gray-300">—</span>
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-3 h-3 rounded-full', color)} />
      <span className="text-xs text-gray-900 dark:text-gray-100 font-bold">{pct}%</span>
    </div>
  )
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listInvoices({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
      })
      setInvoices(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, status])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        <div className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Invoices</h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400 mt-2 flex items-center gap-4">
              <span>&gt; DATABASE · RECORDS [{total}]</span>
              <div className="w-32 h-[1px] bg-primary-500"></div>
            </div>
          </div>
          <div className="flex gap-3">
            {(user?.role === 'admin' || user?.can_upload) && (
              <button onClick={() => navigate('/modify')} className="aiq-btn px-4 py-2.5 flex items-center gap-2 text-xs">
                <Edit2 size={14} /> EDIT
              </button>
            )}
            <button onClick={() => exportCSV({ status })} className="px-4 py-2.5 flex items-center gap-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => exportExcel({ status })} className="px-4 py-2.5 flex items-center gap-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download size={14} /> EXCEL
            </button>
            <button onClick={fetchInvoices} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 dark:text-primary-400" />
            <input
              className="aiq-input w-full pl-10"
              placeholder="Search invoice #, seller, order ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="aiq-input w-48 appearance-none cursor-pointer font-bold"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s ? s.toUpperCase() : 'ALL STATUSES'}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="aiq-card relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['INVOICE #', 'DATE', 'PRODUCT', 'QTY', 'TOTAL', 'PO #', 'ITEM CODE', 'ITEM CATEGORY', 'CONF.', 'STATUS'].map(h => (
                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold tracking-normal">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      NO INVOICES FOUND.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={clsx(
                        "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors",
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                      )}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">{inv.invoice_number || '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{inv.invoice_date || '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 max-w-xs">
                        <span className="truncate block">{inv.product_description || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-800 dark:text-gray-200 text-center">{inv.quantity != null ? inv.quantity : '—'}</td>
                      <td className="py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</td>
                      <td className="py-3.5 px-4 text-xs font-bold text-primary-600 dark:text-primary-400">{inv.po_number || '—'}</td>
                      <td className="py-3.5 px-4 text-xs font-bold text-cyan-500 dark:text-cyan-400 font-mono">{inv.linked_po?.item_code || '—'}</td>
                      <td className="py-3.5 px-4">
                        {inv.linked_po?.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full border bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                            {inv.linked_po.category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-4"><ConfidenceDot score={inv.confidence_score} /></td>
                      <td className="py-3.5 px-4"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
