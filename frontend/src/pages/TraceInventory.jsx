import { useState, useEffect, useCallback } from 'react'
import { getTrackingDashboard, getInvoiceTracking, toggleProcess, toggleWorkflow } from '../api/client'
import {
  Search, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Loader2, X, RefreshCw, Package, Layers, Clock, User, GitBranch, Cog,
  ArrowUpDown
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

// ─── Combined Inventory Detail Modal ──────────────────────────────────────────

function InventoryDetailModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [togglingWf, setTogglingWf] = useState(null)

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

  // Group processes by workflow
  const workflowGroups = {}
  if (data?.processes) {
    for (const proc of data.processes) {
      if (!workflowGroups[proc.workflow_name]) {
        workflowGroups[proc.workflow_name] = { processes: [], workflow_id: proc.workflow_id }
      }
      workflowGroups[proc.workflow_name].processes.push(proc)
      if (!workflowGroups[proc.workflow_name].workflow_id && proc.workflow_id) {
        workflowGroups[proc.workflow_name].workflow_id = proc.workflow_id
      }
    }
  }

  const handleToggleProcess = async (processId, currentCompleted) => {
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

  const handleToggleWorkflow = async (wfName, allCompleted) => {
    const group = workflowGroups[wfName]
    if (!group || !group.workflow_id) return

    setTogglingWf(wfName)
    try {
      await toggleWorkflow(invoiceId, group.workflow_id, { completed: !allCompleted })
      await fetchTracking()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update workflow')
    } finally {
      setTogglingWf(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-800/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white dark:bg-gray-800 border-2 border-primary-600 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-primary-600 tracking-tighter ">TRACE INVENTORY</h2>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-normal mt-1">INVOICE #{invoiceId} · {data?.category || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors p-2">
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
              <Search size={48} className="mx-auto mb-4 text-gray-700 dark:text-gray-300" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">NO TRACKING DATA</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-bold">Add workflows and processes to this category in Configure.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">OVERALL PROGRESS</span>
                  <span className={clsx(
                    'text-sm font-black tracking-normal',
                    data.progress >= 100 ? 'text-emerald-400' : 'text-primary-600'
                  )}>{data.progress}%</span>
                </div>
                <ProgressBar progress={data.progress} size="lg" />
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold tracking-normal mt-2 ">
                  {data.completed_count} OF {data.total_processes} STEPS COMPLETED
                </p>
              </div>

              {/* Combined Workflow + Process view */}
              <div className="space-y-4">
                {Object.entries(workflowGroups).map(([wfName, group]) => {
                  const allCompleted = group.processes.every(p => p.completed)
                  const completedCount = group.processes.filter(p => p.completed).length
                  const totalCount = group.processes.length
                  const wfProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                  return (
                    <div key={wfName} className={clsx(
                      'border transition-all',
                      allCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    )}>
                      {/* Workflow header — toggles entire workflow */}
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer group border-b border-gray-100 dark:border-gray-800"
                        onClick={() => handleToggleWorkflow(wfName, allCompleted)}
                      >
                        <div className="shrink-0">
                          {togglingWf === wfName ? (
                            <Loader2 size={20} className="animate-spin text-primary-600" />
                          ) : allCompleted ? (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          ) : (
                            <Circle size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-primary-600 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <GitBranch size={12} className="text-primary-600 shrink-0" />
                            <span className={clsx(
                              'text-xs font-black font-semibold tracking-normal',
                              allCompleted ? 'text-emerald-400 line-through' : 'text-gray-900 dark:text-gray-100'
                            )}>
                              {wfName}
                            </span>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400 font-bold tracking-normal bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 border border-gray-200 dark:border-gray-700">
                              WORKFLOW · {completedCount}/{totalCount}
                            </span>
                          </div>
                        </div>
                        <span className={clsx(
                          'text-xs font-black tracking-normal',
                          allCompleted ? 'text-emerald-400' : wfProgress > 0 ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
                        )}>
                          {wfProgress}%
                        </span>
                      </div>

                      {/* Individual processes — individually toggleable */}
                      <div className="px-2 pb-2">
                        {group.processes.map((proc, idx) => (
                          <div
                            key={proc.process_id}
                            className={clsx(
                              'flex items-center gap-3 p-2.5 mx-2 mt-1 border transition-all cursor-pointer group/proc',
                              proc.completed
                                ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30'
                                : 'bg-white dark:bg-gray-800 border-[#1a1a1a] hover:border-[#444]'
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleProcess(proc.process_id, proc.completed)
                            }}
                          >
                            <div className="shrink-0">
                              {toggling === proc.process_id ? (
                                <Loader2 size={14} className="animate-spin text-primary-600" />
                              ) : proc.completed ? (
                                <CheckCircle2 size={14} className="text-emerald-500/70" />
                              ) : (
                                <Circle size={14} className="text-gray-700 dark:text-gray-300 group-hover/proc:text-primary-600 transition-colors" />
                              )}
                            </div>
                            <Cog size={10} className="text-gray-700 dark:text-gray-300 shrink-0" />
                            <span className={clsx(
                              'text-[10px] font-bold font-semibold tracking-normal truncate',
                              proc.completed ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-300'
                            )}>
                              {proc.name}
                            </span>
                            {proc.completed && proc.completed_at && (
                              <div className="flex items-center gap-1 ml-auto shrink-0">
                                <Clock size={8} className="text-gray-700 dark:text-gray-300" />
                                <span className="text-[8px] text-gray-700 dark:text-gray-300 font-bold">
                                  {new Date(proc.completed_at).toLocaleDateString()}
                                </span>
                                {proc.completed_by && (
                                  <>
                                    <User size={8} className="text-gray-700 dark:text-gray-300 ml-1" />
                                    <span className="text-[8px] text-gray-700 dark:text-gray-300 font-bold">{proc.completed_by}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TraceInventory() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('progress') // 'progress' | 'invoice' | 'category'
  const [sortDir, setSortDir] = useState('desc')
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
  const categories = summary.categories || []

  // Filter to only items with workflows, and apply search
  let items = (data?.items || []).filter(i => i.total_processes > 0)

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    items = items.filter(i =>
      (i.invoice_number || '').toLowerCase().includes(term) ||
      (i.category || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term) ||
      (i.current_stage || '').toLowerCase().includes(term)
    )
  }

  // Sort
  items = [...items].sort((a, b) => {
    let va, vb
    switch (sortBy) {
      case 'progress': va = a.progress; vb = b.progress; break
      case 'invoice': va = a.invoice_number || ''; vb = b.invoice_number || ''; break
      case 'category': va = a.category || ''; vb = b.category || ''; break
      default: va = a.progress; vb = b.progress
    }
    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const completedItems = items.filter(i => i.progress >= 100).length
  const inProgressItems = items.filter(i => i.progress > 0 && i.progress < 100).length
  const notStartedItems = items.filter(i => i.progress === 0).length

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter  flex items-center gap-5">
              <div className="w-14 h-14 bg-[#FCD535] flex items-center justify-center">
                <Search size={30} className="text-black" />
              </div>
              TRACE INVENTORY
            </h1>
            <div className="text-sm font-bold tracking-normal text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-4">
              <span>&gt; COMBINED WORKFLOW + PROCESS VIEW BY INVENTORY</span>
              <div className="w-24 h-[1px] bg-[#333]"></div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 pr-10 text-xs font-black tracking-normal text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none  cursor-pointer"
              >
                <option value="">ALL CATEGORIES</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
            <button onClick={fetchDashboard} className="btn-brutal-dark p-3 text-xs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search + Sort Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH INVOICES, CATEGORIES, STAGES..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-2.5 text-xs font-bold tracking-normal text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none  placeholder:text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400">
            <span>SORT:</span>
            {['progress', 'invoice', 'category'].map(f => (
              <button
                key={f}
                onClick={() => handleSort(f)}
                className={clsx(
                  'px-2 py-1.5 border transition-colors ',
                  sortBy === f
                    ? 'border-primary-600 text-primary-600 bg-[#FCD535]/5'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:border-[#555]'
                )}
              >
                {f}
                {sortBy === f && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-primary-600 transition-colors">
            <div className="w-10 h-10 bg-[#FCD535] text-black flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">TOTAL</p>
              <p className="text-xl font-black tracking-tight text-primary-600">{items.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-emerald-500/50 transition-colors">
            <div className="w-10 h-10 bg-emerald-500 text-black flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">COMPLETED</p>
              <p className="text-xl font-black tracking-tight text-emerald-400">{completedItems}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-orange-500/50 transition-colors">
            <div className="w-10 h-10 bg-orange-500 text-black flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">IN PROGRESS</p>
              <p className="text-xl font-black tracking-tight text-orange-400">{inProgressItems}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-gray-500/50 transition-colors">
            <div className="w-10 h-10 bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-center shrink-0">
              <Circle size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black font-semibold tracking-normal">NOT STARTED</p>
              <p className="text-xl font-black tracking-tight text-gray-400">{notStartedItems}</p>
            </div>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {/* Inventory Items Table */}
        <div className="card-brutal-dark relative">
          {loading && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800/80 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                <tr>
                  {[
                    { label: 'INVOICE #', field: 'invoice' },
                    { label: 'CATEGORY', field: 'category' },
                    { label: 'DESCRIPTION', field: null },
                    { label: 'WORKFLOWS', field: null },
                    { label: 'PROCESSES', field: null },
                    { label: 'CURRENT STAGE', field: null },
                    { label: 'PROGRESS', field: 'progress' },
                    { label: 'ACTION', field: null },
                  ].map(h => (
                    <th
                      key={h.label}
                      className={clsx(
                        "py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800 last:border-0",
                        h.field && 'cursor-pointer hover:text-gray-900 dark:text-gray-100'
                      )}
                      onClick={h.field ? () => handleSort(h.field) : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.field && sortBy === h.field && (
                          <ArrowUpDown size={10} className="text-primary-600" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-gray-600 dark:text-gray-400 font-bold tracking-normal">
                      <Search size={48} className="mx-auto mb-4 opacity-20" />
                      {loading ? 'LOADING...' : searchTerm ? 'NO MATCHING ITEMS FOUND.' : 'NO INVOICES WITH WORKFLOWS FOUND.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.invoice_id}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-colors',
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                      )}
                    >
                      <td className="py-3 px-4 text-sm font-bold border-r border-gray-100 dark:border-gray-800">
                        {item.invoice_number || '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-black font-semibold tracking-normal text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1">
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300 max-w-[150px] truncate border-r border-gray-100 dark:border-gray-800">
                        {item.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 border-r border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5">
                          <GitBranch size={10} className="text-primary-600 shrink-0" />
                          <span className="text-[10px] font-black tracking-normal">
                            {item.total_processes > 0 ? 'ACTIVE' : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5">
                          <Cog size={10} className="text-purple-400 shrink-0" />
                          <span className="text-[10px] font-black tracking-normal text-gray-400">
                            {item.completed_count}/{item.total_processes}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-100 dark:border-gray-800">
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
                          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold font-semibold tracking-normal">NOT STARTED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 min-w-[130px] border-r border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <ProgressBar progress={item.progress} size="sm" />
                          <span className={clsx(
                            'text-[10px] font-black tracking-normal whitespace-nowrap',
                            item.progress >= 100 ? 'text-emerald-400' : item.progress > 0 ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
                          )}>
                            {item.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedInvoice(item.invoice_id)}
                          className="text-[10px] font-black font-semibold tracking-normal text-primary-600 hover:text-gray-900 dark:text-gray-100 border border-primary-600 hover:bg-[#FCD535] hover:text-black px-3 py-1.5 transition-all"
                        >
                          VIEW
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
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 px-2 ">
          <span>{items.length} INVENTORY ITEMS</span>
          <span>·</span>
          <span className="text-emerald-400">{completedItems} COMPLETED</span>
          <span>·</span>
          <span className="text-primary-600">{inProgressItems} IN PROGRESS</span>
          <span>·</span>
          <span className="text-gray-600 dark:text-gray-400">{notStartedItems} NOT STARTED</span>
          <span>·</span>
          <span>COMBINED WORKFLOW + PROCESS VIEW</span>
        </div>
      </div>

      {/* Combined Detail Modal */}
      {selectedInvoice && (
        <InventoryDetailModal
          invoiceId={selectedInvoice}
          onClose={() => { setSelectedInvoice(null); fetchDashboard(); }}
        />
      )}
    </div>
  )
}
