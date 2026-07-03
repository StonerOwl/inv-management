import React, { useState } from 'react'

export default function StageProcessList({ data }) {
  const workflows = data?.workflows || []
  const [expandedWorkflow, setExpandedWorkflow] = useState(null)
  const [expandedStage, setExpandedStage] = useState(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Stage Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Expand each workflow to see its stages and processes</p>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">No workflows defined for this project.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {workflows.map((wf, idx) => {
            const isWfOpen = expandedWorkflow === wf.id
            const stages = wf.stages || []
            const totalProcesses = stages.reduce((sum, s) => sum + (s.processes || []).length, 0)

            return (
              <div key={wf.id}>
                <button
                  onClick={() => setExpandedWorkflow(isWfOpen ? null : wf.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150 focus:outline-none text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{wf.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stages.length} stage{stages.length !== 1 ? 's' : ''}
                      {totalProcesses > 0 && (
                        <span className="ml-2 text-violet-500 font-semibold">{totalProcesses} process{totalProcesses !== 1 ? 'es' : ''}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                      {stages.length}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isWfOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isWfOpen && (
                  <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
                    {stages.length === 0 ? (
                      <p className="px-12 py-4 text-xs text-gray-400 italic">No stages assigned to this workflow.</p>
                    ) : (
                      stages.map((stage, sIdx) => {
                        const isStageOpen = expandedStage === stage.id
                        const processes = stage.processes || []

                        return (
                          <div key={stage.id}>
                            <button
                              onClick={() => setExpandedStage(isStageOpen ? null : stage.id)}
                              className="w-full flex items-center gap-4 px-10 py-3 hover:bg-gray-100 transition-colors duration-150 focus:outline-none text-left"
                            >
                              <span className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                {sIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800">{stage.name}</p>
                                {processes.length > 0 && (
                                  <p className="text-[10px] text-violet-500 font-semibold mt-0.5">
                                    {processes.length} process{processes.length !== 1 ? 'es' : ''}
                                  </p>
                                )}
                              </div>
                              {processes.length > 0 && (
                                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isStageOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>

                            {isStageOpen && processes.length > 0 && (
                              <div className="px-14 pb-3 pt-1 bg-gray-100 grid gap-1.5 sm:grid-cols-2">
                                {processes.map((proc, pIdx) => (
                                  <div key={proc.id} className="flex items-center gap-2.5 bg-white border border-violet-100 rounded-lg px-3 py-2">
                                    <div className="w-5 h-5 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[9px] font-black text-violet-600">{pIdx + 1}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700">{proc.name}</p>
                                  </div>
                                ))}
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