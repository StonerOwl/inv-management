import { useState, useEffect, useCallback } from 'react'
import {
  getTrackingDashboard, getTrackingHistory, reassignTrackingCategory,
  revertTrackingCategory, resetTracking, addTrackingNote, listCategories
} from '../api/client'
import {
  Settings2, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Loader2, X, RefreshCw, Package, RotateCcw, AlertTriangle,
  FileText, Clock, User, GitBranch, ArrowRightLeft, Trash2,
  MessageSquare, History, ShieldAlert, Undo2
} from 'lucide-react'
import clsx from 'clsx'

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, size = 'md' }) {
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'
  const color = progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-[#FCD535]' : 'bg-orange-500'
  return (
    <div className={clsx('w-full bg-[#222] overflow-hidden', h)}>
      <div
        className={clsx(color, h, 'transition-all duration-500 ease-out')}
        style={{ width: `${Math.min(100, progress)}%` }}
      />
    </div>
  )
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="aiq-card w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className={danger ? 'text-red-500 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'} />
          <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
              danger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            )}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reassign Category Modal ──────────────────────────────────────────────────

function ReassignModal({ invoiceId, currentCategory, categories, onClose, onSuccess }) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReassign = async () => {
    if (!selectedCategory) return
    setLoading(true)
    try {
      await reassignTrackingCategory(invoiceId, { category_name: selectedCategory })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reassign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="aiq-card w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Reassign Workflow</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">Invoice #{invoiceId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current */}
          <div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-2">Current Category</p>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-lg">
              <GitBranch size={16} className="text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {currentCategory || 'NONE'}
              </span>
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-2">New Category</p>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="aiq-input w-full appearance-none pr-10 cursor-pointer text-sm"
              >
                <option value="">Select Category...</option>
                {categories
                  .filter(c => c.name !== currentCategory)
                  .map(c => (
                    <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                  ))
                }
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30 p-4 rounded-lg">
            <AlertTriangle size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700 dark:text-primary-300 font-medium leading-relaxed">
              This will override the workflow for this invoice only. The PO's category will not change. Existing tracking progress will be preserved but may not align with the new workflow.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleReassign}
              disabled={!selectedCategory || loading}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                selectedCategory
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              )}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              REASSIGN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: resp } = await getTrackingHistory(invoiceId)
        setData(resp)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [invoiceId])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="aiq-card w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Tracking History</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
              Invoice #{invoiceId} · {data?.invoice_number || '—'}
              {data?.is_overridden && (
                <span className="text-orange-500 dark:text-orange-400 ml-2">· OVERRIDDEN</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-primary-500 mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info Bar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">Current Category</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.current_category || '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">Original (PO)</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-1">{data?.original_category || '—'}</p>
                </div>
              </div>

              {/* Records */}
              <div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-3">
                  Tracking Records ({data?.records?.length || 0})
                </p>
                {!data?.records || data.records.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">No records yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.records.map(r => (
                      <div key={r.id} className={clsx(
                        'flex items-start gap-3 p-4 rounded-lg border transition-colors',
                        r.completed
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      )}>
                        {r.completed ? (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={18} className="text-gray-600 dark:text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {r.workflow_name}
                            </span>
                            <span className={clsx(
                              'text-sm font-bold truncate',
                              r.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'
                            )}>
                              {r.process_name}
                            </span>
                          </div>
                          {(r.completed_at || r.completed_by || r.notes) && (
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                              {r.completed_at && (
                                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                                  <Clock size={12} />{new Date(r.completed_at).toLocaleString()}
                                </span>
                              )}
                              {r.completed_by && (
                                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                                  <User size={12} />{r.completed_by}
                                </span>
                              )}
                              {r.notes && (
                                <span className="text-xs text-gray-800 dark:text-gray-200 font-medium flex items-center gap-1.5 italic bg-white dark:bg-gray-900/50 px-2 py-1 rounded">
                                  <MessageSquare size={12} />{r.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Note Modal ───────────────────────────────────────────────────────────

function NoteModal({ invoiceId, onClose, onSuccess }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!note.trim()) return
    setLoading(true)
    try {
      await addTrackingNote(invoiceId, { note: note.trim() })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="aiq-card w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Add Note</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">Invoice #{invoiceId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter note..."
            rows={4}
            className="aiq-input w-full resize-none py-3"
          />
          <div className="flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={!note.trim() || loading}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                note.trim()
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              )}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              ADD NOTE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageTracking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [reassignInvoice, setReassignInvoice] = useState(null) // { id, category }
  const [historyInvoice, setHistoryInvoice] = useState(null)
  const [noteInvoice, setNoteInvoice] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(null) // invoice_id
  const [revertConfirm, setRevertConfirm] = useState(null) // invoice_id
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      const { data: resp } = await getTrackingDashboard(params)
      setData(resp)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const { data: resp } = await listCategories()
      setCategories(resp.items || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const summary = data?.summary || {}
  let items = (data?.items || []).filter(i => i.total_processes > 0)
  const allCategories = summary.categories || []

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    items = items.filter(i =>
      (i.invoice_number || '').toLowerCase().includes(term) ||
      (i.category || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term) ||
      (i.po_number || '').toLowerCase().includes(term)
    )
  }

  const overriddenCount = items.filter(i => i.is_overridden).length

  const handleReset = async (invoiceId) => {
    setActionLoading(true)
    try {
      await resetTracking(invoiceId)
      setResetConfirm(null)
      fetchDashboard()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reset')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevert = async (invoiceId) => {
    setActionLoading(true)
    try {
      await revertTrackingCategory(invoiceId)
      setRevertConfirm(null)
      fetchDashboard()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to revert')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Settings2 size={28} />
              </div>
              Manage Tracking
            </h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400 mt-3 flex items-center gap-4">
              <span>&gt; REASSIGN · RESET · NOTES · HISTORY</span>
              <div className="w-24 h-[1px] bg-primary-500"></div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="aiq-input appearance-none pr-10 cursor-pointer text-sm font-bold"
              >
                <option value="">ALL CATEGORIES</option>
                {allCategories.map(c => (
                  <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 pointer-events-none" />
            </div>
            <button onClick={fetchDashboard} className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Settings2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Category, PO Number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="aiq-input w-full pl-10 py-2.5"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Tracked</p>
              <p className="text-3xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">{items.length}</p>
            </div>
          </div>
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-orange-500 dark:hover:border-orange-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Overridden</p>
              <p className="text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">{overriddenCount}</p>
            </div>
          </div>
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Completed</p>
              <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {items.filter(i => i.progress >= 100).length}
              </p>
            </div>
          </div>
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-purple-500 dark:hover:border-purple-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <GitBranch size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Categories</p>
              <p className="text-3xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">{allCategories.length}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="aiq-card relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  {['INVOICE #', 'PO', 'CATEGORY', 'PROGRESS', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold tracking-normal">
                      <Settings2 size={48} className="mx-auto mb-4 opacity-20" />
                      {loading ? 'LOADING...' : 'NO INVOICES WITH WORKFLOWS FOUND.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.invoice_id}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                      )}
                    >
                      <td className="py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {item.invoice_number || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.po_number || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-wide text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                            {item.category || '—'}
                          </span>
                          {item.is_overridden && (
                            <span className="text-[10px] font-bold tracking-wide text-orange-500 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <ArrowRightLeft size={10} />
                              OVERRIDE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-3">
                          <ProgressBar progress={item.progress} size="sm" />
                          <span className={clsx(
                            'text-[10px] font-bold tracking-normal whitespace-nowrap',
                            item.progress >= 100 ? 'text-emerald-400' : item.progress > 0 ? 'text-primary-600' : 'text-gray-800 dark:text-gray-200'
                          )}>
                            {item.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.current_stage ? (
                          <span className={clsx(
                            'text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full',
                            item.current_stage === 'COMPLETED'
                              ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-primary-600 dark:text-primary-400 bg-primary-500/10 border border-primary-500/20'
                          )}>
                            {item.current_stage}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-700 dark:text-gray-300 font-bold uppercase">Not Started</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {/* Reassign */}
                          <button
                            onClick={() => setReassignInvoice({ id: item.invoice_id, category: item.category })}
                            className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                            title="Reassign Workflow"
                          >
                            <ArrowRightLeft size={16} />
                          </button>

                          {/* Revert (only if overridden) */}
                          {item.is_overridden && (
                            <button
                              onClick={() => setRevertConfirm(item.invoice_id)}
                              className="p-1.5 text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                              title="Revert to PO Default"
                            >
                              <Undo2 size={16} />
                            </button>
                          )}

                          {/* History */}
                          <button
                            onClick={() => setHistoryInvoice(item.invoice_id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                            title="View History"
                          >
                            <History size={16} />
                          </button>

                          {/* Add Note */}
                          <button
                            onClick={() => setNoteInvoice(item.invoice_id)}
                            className="p-1.5 text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md transition-colors"
                            title="Add Note"
                          >
                            <MessageSquare size={16} />
                          </button>

                          {/* Reset */}
                          <button
                            onClick={() => setResetConfirm(item.invoice_id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Reset Tracking"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-normal text-gray-700 dark:text-gray-300 px-2 ">
          <span>{items.length} TRACKED ITEMS</span>
          <span>·</span>
          <span className="text-orange-400">{overriddenCount} OVERRIDDEN</span>
          <span>·</span>
          <span>
            <ArrowRightLeft size={10} className="inline mr-1" />REASSIGN
            <span className="mx-2">|</span>
            <Undo2 size={10} className="inline mr-1" />REVERT
            <span className="mx-2">|</span>
            <History size={10} className="inline mr-1" />HISTORY
            <span className="mx-2">|</span>
            <MessageSquare size={10} className="inline mr-1" />NOTE
            <span className="mx-2">|</span>
            <Trash2 size={10} className="inline mr-1" />RESET
          </span>
        </div>
      </div>

      {/* Modals */}
      {reassignInvoice && (
        <ReassignModal
          invoiceId={reassignInvoice.id}
          currentCategory={reassignInvoice.category}
          categories={categories}
          onClose={() => setReassignInvoice(null)}
          onSuccess={() => { setReassignInvoice(null); fetchDashboard(); }}
        />
      )}

      {historyInvoice && (
        <HistoryModal
          invoiceId={historyInvoice}
          onClose={() => setHistoryInvoice(null)}
        />
      )}

      {noteInvoice && (
        <NoteModal
          invoiceId={noteInvoice}
          onClose={() => setNoteInvoice(null)}
          onSuccess={() => { setNoteInvoice(null); fetchDashboard(); }}
        />
      )}

      {resetConfirm && (
        <ConfirmModal
          title="RESET TRACKING"
          message="THIS WILL DELETE ALL TRACKING PROGRESS FOR THIS INVOICE. THIS ACTION CANNOT BE UNDONE."
          confirmLabel="RESET"
          danger={true}
          loading={actionLoading}
          onConfirm={() => handleReset(resetConfirm)}
          onCancel={() => setResetConfirm(null)}
        />
      )}

      {revertConfirm && (
        <ConfirmModal
          title="REVERT OVERRIDE"
          message="THIS WILL REMOVE THE WORKFLOW OVERRIDE AND REVERT TO THE PO'S ORIGINAL CATEGORY. EXISTING TRACKING PROGRESS WILL BE PRESERVED."
          confirmLabel="REVERT"
          danger={false}
          loading={actionLoading}
          onConfirm={() => handleRevert(revertConfirm)}
          onCancel={() => setRevertConfirm(null)}
        />
      )}
    </div>
  )
}
