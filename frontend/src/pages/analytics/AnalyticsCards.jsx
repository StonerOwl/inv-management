import React from 'react'

// ── time helpers ──────────────────────────────────────────────────────────────
// Elapsed time in this app is measured from when an entity started (its
// created_at timestamp, or start_date for the project) up to now.
function msSince(dateStr) {
  if (!dateStr) return null
  const start = new Date(dateStr)
  if (isNaN(start)) return null
  const diff = Date.now() - start.getTime()
  return diff < 0 ? null : diff
}

function formatDuration(ms) {
  if (ms == null) return 'N/A'
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return '<1m'
}

function averageMs(values) {
  const valid = values.filter(v => v != null)
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

export default function AnalyticsCards({ data }) {
  const workflows = data?.workflows || []
  const stages = workflows.flatMap(wf => wf.stages || [])
  const processes = stages.flatMap(st => st.processes || [])

  const workflowElapsedMs = workflows.map(wf => msSince(wf.created_at))
  const stageElapsedMs = stages.map(st => msSince(st.created_at))
  const processElapsedMs = processes.map(p => msSince(p.created_at))

  // Total time elapsed tracks the project as a whole — since its start date,
  // falling back to when the project record was created if no start date was set.
  const totalElapsedMs = msSince(data?.project?.start_date) ?? msSince(data?.project?.created_at)

  const cards = [
    {
      label: 'Time Elapsed / Workflow',
      value: formatDuration(averageMs(workflowElapsedMs)),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: 'bg-primary-50 dark:bg-primary-900/30',
      border: 'border-primary-100 dark:border-primary-800',
      text: 'text-primary-600 dark:text-primary-400',
      sub: `Average across ${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Time Elapsed / Stage',
      value: formatDuration(averageMs(stageElapsedMs)),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
      border: 'border-indigo-100 dark:border-indigo-800',
      text: 'text-indigo-600 dark:text-indigo-400',
      sub: `Average across ${stages.length} stage${stages.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Time Elapsed / Process',
      value: formatDuration(averageMs(processElapsedMs)),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-100 dark:border-emerald-800',
      text: 'text-emerald-600 dark:text-emerald-400',
      sub: `Average across ${processes.length} process${processes.length !== 1 ? 'es' : ''}`,
    },
    {
      label: 'Total Time Elapsed',
      value: formatDuration(totalElapsedMs),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-violet-50 dark:bg-violet-900/30',
      border: 'border-violet-100 dark:border-violet-800',
      text: 'text-violet-600 dark:text-violet-400',
      sub: 'Since project start',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`aiq-card ${card.border} ${card.bg} p-5 flex flex-col gap-3`}
        >
          <div className={`w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border ${card.border} flex items-center justify-center ${card.text} shadow-sm`}>
            {card.icon}
          </div>
          <div>
            <p className={`text-3xl font-black ${card.text}`}>{card.value}</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">{card.label}</p>
            <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-0.5 leading-tight">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}