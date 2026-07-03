import React, { useMemo, useState } from 'react'

export default function WorkflowTimeline({ data }) {
  const workflowItems = useMemo(() => data?.workflows || [], [data])
  const stateItems = useMemo(() => data?.states || [], [data])
  const currentWorkflow = data?.current_workflow || 'Not Started'

  const [expandedWorkflow, setExpandedWorkflow] = useState(null)

  const workflowNodes = useMemo(() => {
    return workflowItems.map(workflow => {
      const stages = stateItems.filter(s => s.workflow_id === workflow.id)
      const completed = stages.filter(s => s.completed).length
      const total = stages.length || workflow.states?.length || 0
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0
      const isActive = workflow.name === currentWorkflow

      const stageNodes = (workflow.states || stages).map((state, idx) => ({
        id: state.id || idx,
        name: state.name,
        completed: state.completed || false,
        completedAt: state.completed_at || null,
        description: state.description || null,
        processes: [],
      }))

      return { ...workflow, stages: stageNodes, completedCount: completed, total, progress, isActive }
    })
  }, [workflowItems, stateItems, currentWorkflow])

  const toggleExpand = (id) => {
    setExpandedWorkflow(prev => (prev === id ? null : id))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Workflow Timeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">Click a workflow node to expand its stages</p>
        </div>
      </div>

      {workflowNodes.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          No workflows defined for this project.
        </div>
      ) : (
        <div className="px-6 py-8 overflow-x-auto">

          <div className="relative flex items-start min-w-max">
            {workflowNodes.map((workflow, idx) => {
              const isLast = idx === workflowNodes.length - 1
              const isExpanded = expandedWorkflow === workflow.id

              return (
                <div key={workflow.id} className="relative flex items-start">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => toggleExpand(workflow.id)}
                      className={`group relative flex flex-col items-center focus:outline-none w-36`}
                    >
                      <div className={`
                        w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-sm
                        transition-all duration-200 group-hover:scale-105
                        ${workflow.isActive
                          ? 'border-blue-500 bg-blue-600 text-white ring-4 ring-blue-100'
                          : workflow.progress === 100
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : 'border-gray-300 bg-white text-gray-600 group-hover:border-blue-400'
                        }
                      `}>
                        {workflow.progress === 100 ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-sm font-black">{idx + 1}</span>
                        )}
                      </div>

                      <div className="mt-3 text-center px-1">
                        <p className={`text-xs font-bold leading-tight ${workflow.isActive ? 'text-blue-600' : 'text-gray-800'}`}>
                          {workflow.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">{workflow.completedCount}/{workflow.total} stages</p>

                        <div className="mt-2 w-20 mx-auto bg-gray-100 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              workflow.progress === 100 ? 'bg-emerald-500' : workflow.isActive ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${workflow.progress}%` }}
                          />
                        </div>

                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                          isExpanded ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'
                        }`}>
                          {isExpanded ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              Collapse
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              {workflow.stages.length} stage{workflow.stages.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && workflow.stages.length > 0 && (
                      <div className="mt-4 w-36 px-1">
                        <div className="relative flex flex-col gap-0">
                          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>
                          {workflow.stages.map((stage, sIdx) => (
                            <div key={stage.id} className="relative z-10 flex items-start gap-3 py-2">
                              <div className={`
                                w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-white
                                ${stage.completed ? 'border-emerald-400 text-emerald-600' : 'border-gray-300 text-gray-500'}
                              `}>
                                {stage.completed ? (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span>{sIdx + 1}</span>
                                )}
                              </div>
                              <div className="pt-1 min-w-0">
                                <p className={`text-[11px] font-semibold leading-tight ${stage.completed ? 'text-emerald-700' : 'text-gray-700'}`}>
                                  {stage.name}
                                </p>
                                {stage.completedAt && (
                                  <p className="text-[9px] text-gray-400 mt-0.5">
                                    {new Date(stage.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                )}
                                {!stage.completed && (
                                  <p className="text-[9px] text-gray-300 mt-0.5 uppercase tracking-wide">Pending</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isLast && (
                    <div className="flex items-center mt-7 mx-1">
                      <div className="w-10 h-0.5 bg-gray-200 relative">
                        <div
                          className="h-full bg-blue-400 transition-all duration-700"
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                      <svg className="w-3 h-3 text-gray-300 flex-shrink-0 -ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 flex flex-wrap gap-5 text-xs text-gray-500">
            <LegendItem color="bg-blue-600" label="Active workflow" />
            <LegendItem color="bg-emerald-500" label="Completed" />
            <LegendItem color="bg-gray-300" label="Not started" />
          </div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}