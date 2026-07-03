import React, { useState } from 'react'

export default function StageProcessList({ data }) {
  const stateItems = data?.states || []
  const workflows = data?.workflows || []
  const [expandedWorkflow, setExpandedWorkflow] = useState(null)

  const workflowMap = new Map()

  workflows.forEach(wf => {
    workflowMap.set(wf.id, {
      id: wf.id,
      name: wf.name,
      stages: [],
    })
  })

  stateItems.forEach(state => {
    if (workflowMap.has(state.workflow_id)) {
      workflowMap.get(state.workflow_id).stages.push({
        id: state.id,
        name: state.name,
        completed: state.completed || false,
        completedAt: state.completed_at || null,
      })
    }
  })

  const workflowList = Array.from(workflowMap.values())

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
          <p className="text-xs text-gray-400 mt-0.5">Expand each workflow to see its stages</p>
        </div>
      </div>

      {workflowList.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          No workflows defined for this project.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {workflowList.map((wf, idx) => {
            const isOpen = expandedWorkflow === wf.id
            const completedCount = wf.stages.filter(s => s.completed).length

            return (
              <div key={wf.id}>
                <button
                  onClick={() => setExpandedWorkflow(isOpen ? null : wf.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150 focus:outline-none text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{wf.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {wf.stages.length} stage{wf.stages.length !== 1 ? 's' : ''}
                      {completedCount > 0 && (
                        <span className="ml-2 text-emerald-600 font-semibold">{completedCount} completed</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                      {wf.stages.length}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="pt-4 grid gap-2 sm:grid-cols-2">
                      {wf.stages.length === 0 ? (
                        <p className="text-xs text-gray-400 italic col-span-2">No stages defined in this workflow.</p>
                      ) : (
                        wf.stages.map((stage, sIdx) => (
                          <div
                            key={stage.id}
                            className={`flex items-center gap-3 rounded-lg border px-4 py-3 bg-white ${
                              stage.completed ? 'border-emerald-200' : 'border-gray-200'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.completed ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 truncate">{stage.name}</p>
                              {stage.completedAt ? (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Completed {new Date(stage.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Pending</p>
                              )}
                            </div>
                            {stage.completed && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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