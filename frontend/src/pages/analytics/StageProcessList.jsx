import React, { useState } from 'react'
import { GitBranch, GitCommit, Settings2, Package, DollarSign, Clock, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function elapsed(startDateStr) {
  if (!startDateStr) return null
  const start = new Date(startDateStr)
  if (isNaN(start)) return null
  const now = new Date()
  const diffMs = now - start
  if (diffMs < 0) return { label: 'Not started', future: true }
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
  const mins = Math.floor((diffMs % 3_600_000) / 60_000)
  if (days > 0) return { label: `${days}d ${hours}h elapsed`, future: false }
  if (hours > 0) return { label: `${hours}h ${mins}m elapsed`, future: false }
  return { label: `${mins}m elapsed`, future: false }
}

function ElapsedBadge({ startDate }) {
  const e = elapsed(startDate)
  if (!e) return <span className="text-gray-400 text-[10px]">No start date</span>
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${e.future
        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      }`}>
      <Clock size={9} />
      {e.label}
    </span>
  )
}

function CostBadge({ cost }) {
  if (cost == null || cost === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
      <DollarSign size={9} />
      {Number(cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// ── inventory mini-table inside a stage ───────────────────────────────────────
function StageInventoryTable({ items }) {
  if (!items || items.length === 0) return (
    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 italic px-1 py-2">
      <AlertCircle size={11} /> No inventory linked — use Manage Workflow to assign items
    </div>
  )
  const total = items.reduce((s, i) => s + (i.total_amount || 0), 0)
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden mt-2">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-3 py-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
            <th className="text-right px-3 py-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
            <th className="text-right px-3 py-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Price</th>
            <th className="text-right px-3 py-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
            <th className="text-left px-3 py-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {items.map((item, i) => (
            <tr key={item.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Package size={10} className="text-primary-400 shrink-0" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[160px]" title={item.item_name}>{item.item_name}</span>
                </div>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{item.quantity ?? '—'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(item.unit_price)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-bold text-gray-900 dark:text-gray-100">{fmt(item.total_amount)}</td>
              <td className="px-3 py-1.5">
                {item.invoice_number
                  ? <span className="font-mono text-primary-600 dark:text-primary-400">{item.invoice_number}</span>
                  : <span className="text-gray-400">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <td colSpan={3} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Stage Total</td>
            <td className="px-3 py-1.5 text-right tabular-nums font-black text-primary-600 dark:text-primary-400">{fmt(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function StageProcessList({ data }) {
  const workflows = data?.workflows || []
  const startDate = data?.project?.start_date || null

  const [openWf, setOpenWf] = useState({})
  const [openStage, setOpenStage] = useState({})

  const toggleWf = (id) => setOpenWf(p => ({ ...p, [id]: !p[id] }))
  const toggleStage = (id) => setOpenStage(p => ({ ...p, [id]: !p[id] }))

  // project-level totals
  const allStages = workflows.flatMap(wf => wf.stages || [])
  const projectCost = allStages.reduce((s, st) => s + (st.stage_cost || 0), 0)
  const totalItems = allStages.reduce((s, st) => s + (st.inventory_items?.length || 0), 0)

  return (
    <div className="aiq-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center">
            <GitBranch size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Stage Breakdown</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Time elapsed, linked inventory, and cost per stage</p>
          </div>
        </div>

        {/* Project-level summary pills */}
        <div className="flex items-center gap-2">
          <ElapsedBadge startDate={startDate} />
          {totalItems > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Package size={9} />{totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          )}
          {projectCost > 0 && <CostBadge cost={projectCost} />}
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No workflows defined for this project.</div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {workflows.map((wf, wfIdx) => {
            const stages = wf.stages || []
            const wfCost = stages.reduce((s, st) => s + (st.stage_cost || 0), 0)
            const wfItems = stages.reduce((s, st) => s + (st.inventory_items?.length || 0), 0)
            const isWfOpen = !!openWf[wf.id]

            return (
              <div key={wf.id}>
                {/* Workflow row */}
                <button
                  onClick={() => toggleWf(wf.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left focus:outline-none"
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {wfIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{wf.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {stages.length} stage{stages.length !== 1 ? 's' : ''}
                      {wf.batch_id && <span className="ml-2 font-mono text-gray-400 dark:text-gray-500">{wf.batch_id}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {wfItems > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Package size={9} />{wfItems}
                      </span>
                    )}
                    {wfCost > 0 && <CostBadge cost={wfCost} />}
                    {isWfOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </div>
                </button>

                {/* Stages */}
                {isWfOpen && (
                  <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {stages.length === 0 ? (
                      <p className="px-12 py-4 text-xs text-gray-400 italic">No stages assigned to this workflow.</p>
                    ) : (
                      stages.map((stage, sIdx) => {
                        const procs = stage.processes || []
                        const invItems = stage.inventory_items || []
                        const stageCost = stage.stage_cost || 0
                        const isStgOpen = !!openStage[stage.id]

                        return (
                          <div key={stage.id}>
                            {/* Stage row */}
                            <button
                              onClick={() => toggleStage(stage.id)}
                              className="w-full flex items-center gap-4 px-10 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none"
                            >
                              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <GitCommit size={13} className="text-primary-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{stage.name}</p>
                                {procs.length > 0 && (
                                  <p className="text-[10px] text-violet-500 dark:text-violet-400 font-semibold mt-0.5">
                                    {procs.length} process{procs.length !== 1 ? 'es' : ''}
                                  </p>
                                )}
                              </div>

                              {/* Stage badges: time · items · cost */}
                              <div className="flex items-center gap-2 shrink-0">
                                <ElapsedBadge startDate={startDate} />
                                {invItems.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                    <Package size={9} />{invItems.length}
                                  </span>
                                )}
                                {stageCost > 0 && <CostBadge cost={stageCost} />}
                                {isStgOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                              </div>
                            </button>

                            {/* Stage expanded: inventory table + processes */}
                            {isStgOpen && (
                              <div className="px-10 pb-5 pt-2 bg-white dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">

                                {/* ── Inventory & cost ── */}
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package size={11} className="text-primary-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                      Linked Inventory
                                    </span>
                                    {stageCost > 0 && (
                                      <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-primary-600 dark:text-primary-400">
                                        <DollarSign size={10} /> Stage cost: {fmt(stageCost)}
                                      </span>
                                    )}
                                  </div>
                                  <StageInventoryTable items={invItems} />
                                </div>

                                {/* ── Processes ── */}
                                {procs.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Settings2 size={11} className="text-violet-500" />
                                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Processes</span>
                                    </div>
                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                      {procs.map((proc, pIdx) => (
                                        <div key={proc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-violet-100 dark:border-violet-800/30 rounded-lg px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 flex items-center justify-center shrink-0">
                                              <span className="text-[9px] font-black text-violet-600 dark:text-violet-400">{pIdx + 1}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{proc.name}</p>
                                          </div>
                                          {proc.allowed_image_types?.length > 0 && (
                                            <div className="flex gap-1 flex-wrap justify-end">
                                              {proc.allowed_image_types.map(t => (
                                                <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">{t}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}