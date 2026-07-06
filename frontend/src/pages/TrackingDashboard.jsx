import { useState, useEffect, useCallback } from 'react'
import { getTrackingDashboard, getInvoiceTracking, toggleProcess } from '../api/client'
import {
  BarChart3, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Loader2, X, RefreshCw, IndianRupee, Package, GitBranch,
  Layers, Clock, User, FileText
} from 'lucide-react'
import clsx from 'clsx'

const COLOR_MAP = {
  cyan:    { color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30', bar: 'bg-cyan-500' },
  purple:  { color: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/30', bar: 'bg-purple-500' },
  orange:  { color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30', bar: 'bg-orange-500' },
  emerald: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', bar: 'bg-emerald-500' },
  rose:    { color: 'text-rose-400',    bg: 'bg-rose-500/15',    border: 'border-rose-500/30', bar: 'bg-rose-500' },
  amber:   { color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30', bar: 'bg-amber-500' },
}

function formatCurrency(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'
}

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

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtext, color = 'text-primary-600 dark:text-primary-400' }) {
  return (
    <div className="aiq-card p-6 flex items-start gap-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className={clsx('text-3xl font-extrabold tracking-tight', color)}>{value}</p>
        {subtext && <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-1">{subtext}</p>}
      </div>
    </div>
  )
}

// ─── Invoice Tracking Detail Modal ────────────────────────────────────────────

function TrackingDetailModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null) // process_id being toggled

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
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Process Tracking</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">Invoice #{invoiceId}</p>
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
              <GitBranch size={48} className="mx-auto mb-4 text-gray-700 dark:text-gray-300" />
              <p className="text-sm text-gray-700 dark:text-gray-300 font-black font-semibold tracking-normal">
                NO PROCESSES DEFINED
              </p>
              <p className="text-xs text-gray-800 dark:text-gray-200 mt-2 font-bold">
                Add workflows and processes to this category in Item Codes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Workflow Info */}
              <div className="flex items-center gap-3 mb-2">
                <GitBranch size={14} className="text-primary-600" />
                <span className="text-sm font-black tracking-normal text-gray-900 dark:text-gray-100 ">TRACKING PROGRESS</span>
                <span className="text-[10px] text-gray-700 dark:text-gray-300 font-bold tracking-normal">{data.category}</span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-700 dark:text-gray-300 font-black font-semibold tracking-normal">
                    PROGRESS
                  </span>
                  <span className={clsx(
                    'text-sm font-black tracking-normal',
                    data.progress >= 100 ? 'text-emerald-400' : 'text-primary-600'
                  )}>
                    {data.progress}%
                  </span>
                </div>
                <ProgressBar progress={data.progress} size="lg" />
                <p className="text-[10px] text-gray-800 dark:text-gray-200 font-bold tracking-normal mt-2 ">
                  {data.completed_count} OF {data.total_processes} STEPS COMPLETED
                </p>
              </div>

              {/* Process Steps - Tick off */}
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
                        <span className={clsx(
                          'text-[10px] font-black font-semibold tracking-normal text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5'
                        )}>
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

export default function TrackingDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)

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
  const items = data?.items || []
  const categories = summary.categories || []

  // Count items by status
  const completedItems = items.filter(i => i.progress >= 100).length
  const inProgressItems = items.filter(i => i.progress > 0 && i.progress < 100).length
  const notStartedItems = items.filter(i => i.progress === 0 && i.total_processes > 0).length
  const noWorkflow = items.filter(i => i.total_processes === 0).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">

      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <BarChart3 size={28} />
              </div>
              Tracking Dashboard
            </h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400 mt-3 flex items-center gap-4">
              <span>&gt; WORKFLOW · PROCESS TRACKING</span>
              <div className="w-32 h-[1px] bg-primary-500"></div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Package}
            label="Total Items"
            value={summary.total_invoices || 0}
            subtext={`${completedItems} COMPLETED`}
          />
          <StatCard
            icon={IndianRupee}
            label="Total Cost"
            value={formatCurrency(summary.total_cost)}
            subtext="ALL TRACKED ITEMS"
          />
          <StatCard
            icon={Layers}
            label="In Progress"
            value={inProgressItems}
            subtext={`${notStartedItems} NOT STARTED`}
            color="text-orange-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completedItems}
            subtext={`${noWorkflow} NO WORKFLOW`}
            color="text-emerald-400"
          />
        </div>

        {/* Category Breakdown */}
        {summary.category_breakdown?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {summary.category_breakdown.map(cat => {
              const catData = categories.find(c => c.name === cat.name)
              const cc = COLOR_MAP[catData?.color] || COLOR_MAP.cyan
              return (
                <div
                  key={cat.name}
                  className={clsx('border p-4 cursor-pointer transition-colors', cc.border, cc.bg, 'hover:opacity-80')}
                  onClick={() => setCategoryFilter(categoryFilter === cat.name ? '' : cat.name)}
                >
                  <p className={clsx('text-xs font-black font-semibold tracking-normal', cc.color)}>{cat.name}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-gray-100 mt-1">{cat.count} items</p>
                  <p className="text-xs text-gray-400 font-bold mt-1">{formatCurrency(cat.total)}</p>
                </div>
              )
            })}
          </div>
        )}

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
                  {['INVOICE #', 'DATE', 'CATEGORY', 'DESCRIPTION', 'COST', 'CURRENT STAGE', 'PROGRESS'].map(h => (
                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold tracking-normal">
                      <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                      {loading ? 'LOADING...' : 'NO ITEMS WITH CATEGORIES FOUND.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const catData = categories.find(c => c.name === item.category)
                    const cc = COLOR_MAP[catData?.color] || COLOR_MAP.cyan
                    return (
                      <tr
                        key={item.invoice_id}
                        className={clsx(
                          'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
                          idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                        )}
                        onClick={() => setSelectedInvoice(item.invoice_id)}
                      >
                        <td className="py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {item.invoice_number || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {item.invoice_date || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full border',
                            cc.bg, cc.color, cc.border
                          )}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                          {item.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.grand_total)}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.current_stage ? (
                            <span className={clsx(
                              'text-[10px] font-black font-semibold tracking-normal px-2 py-1',
                              item.current_stage === 'COMPLETED'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-primary-600 bg-[#FCD535]/10 border border-primary-600/20'
                            )}>
                              {item.current_stage}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-800 dark:text-gray-200 font-bold font-semibold tracking-normal">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 min-w-[140px]">
                          {item.total_processes > 0 ? (
                            <div className="flex items-center gap-3">
                              <ProgressBar progress={item.progress} size="sm" />
                              <span className={clsx(
                                'text-[10px] font-black tracking-normal whitespace-nowrap',
                                item.progress >= 100 ? 'text-emerald-400' : item.progress > 0 ? 'text-primary-600' : 'text-gray-800 dark:text-gray-200'
                              )}>
                                {item.progress}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-800 dark:text-gray-200 font-bold tracking-normal">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick stats footer */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-normal text-gray-700 dark:text-gray-300 px-2 ">
          <span>{items.length} TRACKED ITEMS</span>
          <span>·</span>
          <span className="text-emerald-400">{completedItems} COMPLETED</span>
          <span>·</span>
          <span className="text-primary-600">{inProgressItems} IN PROGRESS</span>
          <span>·</span>
          <span>CLICK A ROW TO UPDATE PROCESS STATUS</span>
        </div>
      </div>

      {/* Tracking Detail Modal */}
      {selectedInvoice && (
        <TrackingDetailModal
          invoiceId={selectedInvoice}
          onClose={() => { setSelectedInvoice(null); fetchDashboard(); }}
        />
      )}
    </div>
  )
}
