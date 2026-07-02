import React from 'react'

export default function AnalyticsCards({ data }) {
  const processes = data?.processes || []
  const states = data?.states || []

  const uniqueStageNames = new Set(states.map((state) => state.name))
  const totalStages = uniqueStageNames.size
  const totalProcesses = processes.length
  const avgProcesses = totalStages > 0 ? (totalProcesses / totalStages).toFixed(1) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
       <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Overview Metrics
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 text-center">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Stages</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalStages}</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Processes</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalProcesses}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 col-span-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Avg Processes / Stage</p>
            <p className="text-sm text-purple-500 mt-0.5">Based on defined workflows</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{avgProcesses}</p>
        </div>
      </div>
    </div>
  )
}
