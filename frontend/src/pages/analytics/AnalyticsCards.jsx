import React from 'react'

export default function AnalyticsCards({ data }) {
  const workflows = data?.workflows || []

  const totalWorkflows = workflows.length
  const totalStages = workflows.reduce((sum, wf) => sum + (wf.stages || []).length, 0)
  const totalProcesses = workflows.reduce((sum, wf) =>
    sum + (wf.stages || []).reduce((s2, stage) => s2 + (stage.processes || []).length, 0), 0)
  const avgStagesPerWorkflow = totalWorkflows > 0 ? (totalStages / totalWorkflows).toFixed(1) : 0

  const cards = [
    {
      label: 'Workflows',
      value: totalWorkflows,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: 'bg-primary-50 dark:bg-primary-900/30',
      border: 'border-primary-100 dark:border-primary-800',
      text: 'text-primary-600 dark:text-primary-400',
      sub: 'Total workflows in this project',
    },
    {
      label: 'Stages',
      value: totalStages,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
      border: 'border-indigo-100 dark:border-indigo-800',
      text: 'text-indigo-600 dark:text-indigo-400',
      sub: 'Total stages across workflows',
    },
    {
      label: 'Processes',
      value: totalProcesses,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-100 dark:border-emerald-800',
      text: 'text-emerald-600 dark:text-emerald-400',
      sub: 'Total processes defined',
    },
    {
      label: 'Avg Stages / Workflow',
      value: avgStagesPerWorkflow,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      bg: 'bg-violet-50 dark:bg-violet-900/30',
      border: 'border-violet-100 dark:border-violet-800',
      text: 'text-violet-600 dark:text-violet-400',
      sub: 'Average across all workflows',
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