import React from 'react'

export default function AnalyticsCards({ data }) {
  const processes = data?.processes || []
  const states = data?.states || []
  const workflows = data?.workflows || []

  const uniqueStageNames = new Set(states.map(s => s.name))
  const totalStages = uniqueStageNames.size
  const totalProcesses = processes.length
  const totalWorkflows = workflows.length
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
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-600',
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
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      text: 'text-indigo-600',
      sub: 'Unique stages across workflows',
    },
    {
      label: 'Processes',
      value: totalProcesses,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
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
      bg: 'bg-violet-50',
      border: 'border-violet-100',
      text: 'text-violet-600',
      sub: 'Average across all workflows',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`rounded-xl border ${card.border} ${card.bg} p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow duration-200`}
        >
          <div className={`w-9 h-9 rounded-lg bg-white border ${card.border} flex items-center justify-center ${card.text} shadow-sm`}>
            {card.icon}
          </div>
          <div>
            <p className={`text-3xl font-black ${card.text}`}>{card.value}</p>
            <p className="text-xs font-bold text-gray-700 mt-1">{card.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}