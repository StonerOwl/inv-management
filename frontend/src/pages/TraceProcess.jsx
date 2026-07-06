import { useState, useEffect, useCallback } from 'react'
import { getTrackingDashboard, getInvoiceTracking, toggleProcess } from '../api/client'
import {
  Cog, CheckCircle2, Circle, ChevronDown,
  Loader2, X, RefreshCw, Package, Layers, Clock, User, GitBranch
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

// ─── Process Toggle Modal ─────────────────────────────────────────────────────

function ProcessModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  const fetchTracking = useCallback(async () => {
    setLoading(true)
    try {
      const { data: resp } = await getInvoiceTracking(invoiceId)
      setData(resp)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { fetchTracking() }, [fetchTracking])

  const handleToggle = async (processId, currentCompleted) => {
    setToggling(processId)
    try {
      await toggleProcess(invoiceId, processId, { completed: !currentCompleted })
      await fetchTracking()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="aiq-card w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Trace Process</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">Invoice #{invoiceId} · {data?.category || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-primary-600 mx-auto" />
            </div>
          ) : !data?.processes || data.processes.length === 0 ? (
            <div className="text-center py-12">
              <Cog size={48} className="mx-auto mb-4 text-gray-700 dark:text-gray-300" />
              <p className="text-sm text-gray-700 dark:text-gray-300 font-black font-semibold tracking-normal">NO PROCESSES DEFINED</p>
              <p className="text-xs text-gray-800 dark:text-gray-200 mt-2 font-bold">Add workflows and processes to this category in Configure.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-700 dark:text-gray-300 font-black font-semibold tracking-normal">PROGRESS</span>
                  <span className={clsx(
                    'text-sm font-black tracking-normal',
                    data.progress >= 100 ? 'text-emerald-400' : 'text-primary-600'
                  )}>{data.progress}%</span>
                </div>
                <ProgressBar progress={data.progress} size="lg" />
                <p className="text-[10px] text-gray-800 dark:text-gray-200 font-bold tracking-normal mt-2 ">
                  {data.completed_count} OF {data.total_processes} STEPS COMPLETED
                </p>
              </div>

              {/* Process Steps - individually toggleable */}
              <div className="space-y-1">
                <p className="text-[10px] text-primary-600 font-black font-semibold tracking-normal mb-3">PROCESS STEPS</p>
                {data.processes.map((proc, idx) => (
                  <div
                    key={proc.process_id}
                    className={clsx(
                      'flex items-center gap-3 p-3 border transition-all cursor-pointer group',
                      proc.completed
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-[#444]'
                    )}
                    onClick={() => handleToggle(proc.process_id, proc.completed)}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      {toggling === proc.process_id ? (
                        <Loader2 size={18} className="animate-spin text-primary-600" />
                      ) : proc.completed ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} className="text-gray-800 dark:text-gray-200 group-hover:text-primary-600 transition-colors" />
                      )}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-800 dark:text-gray-200 font-black w-5 shrink-0">{idx + 1}.</span>
                        <span className="text-[10px] font-black font-semibold tracking-normal text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5">
                          {proc.workflow_name}
                        </span>
                        <span className={clsx(
                          'text-xs font-black font-semibold tracking-normal truncate',
                          proc.completed ? 'text-emerald-400 line-through' : 'text-gray-900 dark:text-gray-100'
                        )}>
                          {proc.name}
                        </span>
                      </div>
                      {proc.completed && proc.completed_at && (
                        <div className="flex items-center gap-2 mt-1 ml-7">
                          <Clock size={8} className="text-gray-800 dark:text-gray-200" />
                          <span className="text-[9px] text-gray-800 dark:text-gray-200 font-bold">
                            {new Date(proc.completed_at).toLocaleString()}
                          </span>
                          {proc.completed_by && (
                            <>
                              <User size={8} className="text-gray-800 dark:text-gray-200 ml-1" />
                              <span className="text-[9px] text-gray-800 dark:text-gray-200 font-bold">{proc.completed_by}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TraceProcess() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)

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

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const summary = data?.summary || {}
  const items = (data?.items || []).filter(i => i.total_processes > 0)
  const categories = summary.categories || []

  const completedItems = items.filter(i => i.progress >= 100).length
  const inProgressItems = items.filter(i => i.progress > 0 && i.progress < 100).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Cog size={28} />
              </div>
              Trace Process
            </h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400 mt-3 flex items-center gap-4">
              <span>&gt; TOGGLE INDIVIDUAL PROCESSES FOR INVOICES</span>
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
                {categories.map(c => (
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Tracked Invoices</p>
              <p className="text-3xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">{items.length}</p>
            </div>
          </div>
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">Fully Completed</p>
              <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{completedItems}</p>
            </div>
          </div>
          <div className="aiq-card p-6 flex items-start gap-4 hover:border-orange-500 dark:hover:border-orange-400 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">In Progress</p>
              <p className="text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">{inProgressItems}</p>
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
                  {['INVOICE #', 'CATEGORY', 'DESCRIPTION', 'CURRENT STAGE', 'PROGRESS', 'ACTION'].map(h => (
                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold tracking-normal">
                      <Cog size={48} className="mx-auto mb-4 opacity-20" />
                      {loading ? 'LOADING...' : 'NO INVOICES WITH PROCESSES FOUND.'}
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
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold tracking-wide text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                        {item.description || '—'}
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
                        <button
                          onClick={() => setSelectedInvoice(item.invoice_id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/30 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                        >
                          TOGGLE
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-normal text-gray-700 dark:text-gray-300 px-2 ">
          <span>{items.length} TRACKED ITEMS</span>
          <span>·</span>
          <span className="text-emerald-400">{completedItems} COMPLETED</span>
          <span>·</span>
          <span className="text-primary-600">{inProgressItems} IN PROGRESS</span>
          <span>·</span>
          <span>CLICK TOGGLE TO UPDATE INDIVIDUAL PROCESSES</span>
        </div>
      </div>

      {/* Process Modal */}
      {selectedInvoice && (
        <ProcessModal
          invoiceId={selectedInvoice}
          onClose={() => { setSelectedInvoice(null); fetchDashboard(); }}
        />
      )}
    </div>
  )
}
