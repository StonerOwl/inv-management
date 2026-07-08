import React, { useMemo, useState } from 'react'

export default function WorkflowTimeline({ data }) {
  const stageItems = useMemo(() => data?.stages || [], [data])
  const currentStage = data?.invoice?.current_stage || 'Not Started'
  const [expandedStage, setExpandedStage] = useState(null)

  const stageNodes = useMemo(() => {
    return stageItems.map((stage, idx) => {
      const processes = stage.processes || []
      const completed = processes.filter(p => p.completed).length
      const total = processes.length
      const progress = total > 0 ? Math.round((completed / total) * 100) : (stage.completed ? 100 : 0)
      const isActive = stage.name === currentStage

      return { ...stage, processes, completedCount: completed, total, progress, isActive }
    })
  }, [stageItems, currentStage])

  const toggleStage = (id) => setExpandedStage(prev => prev === id ? null : id)

  return (
    <div className="aiq-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50">
        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Stage Timeline</h2>
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">Click a stage node to expand its processes</p>
        </div>
      </div>

      {stageNodes.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-700 dark:text-gray-300">No stages defined for this project.</div>
      ) : (
        <div className="px-6 py-8 overflow-x-auto">
          <div className="relative flex items-start w-full min-w-max">
            {/* Connecting line that goes through all nodes */}
            <div className="absolute top-[1.65rem] h-px bg-black dark:bg-white z-0" style={{ left: `${100 / (2 * stageNodes.length)}%`, right: `${100 / (2 * stageNodes.length)}%` }}></div>
            {stageNodes.map((stage, idx) => {
              const isLast = idx === stageNodes.length - 1
              const isExpanded = expandedStage === stage.id

              return (
                <div key={stage.id} className="relative flex items-start flex-1">
                  <div className="flex flex-col items-center w-full">
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="group relative flex flex-col items-center focus:outline-none w-full max-w-[160px]"
                    >
                      <div className={`
                        relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-sm
                        transition-all duration-200 group-hover:scale-105
                        ${stage.isActive
                          ? 'border-primary-500 bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900'
                          : stage.progress === 100
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'border-black dark:border-white bg-white dark:bg-gray-800 text-black dark:text-white group-hover:border-primary-400'
                        }
                      `}>
                        {stage.progress === 100 ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-sm font-black">{idx + 1}</span>
                        )}
                      </div>

                      <div className="mt-3 text-center px-1">
                        <p className={`text-xs font-bold leading-tight ${stage.isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {stage.name}
                        </p>
                        {(stage.progress === 100 || stage.completed_at) && (
                          <p className="text-[9px] text-gray-700 dark:text-gray-300 mt-0.5">
                            {stage.completed_at ? new Date(stage.completed_at).toLocaleString() : new Date().toLocaleString()}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-1">{stage.total} process{stage.total !== 1 ? 'es' : ''}</p>

                        <div className="mt-2 w-20 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${stage.progress === 100 ? 'bg-emerald-500' : stage.isActive ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>

                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors ${isExpanded ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                          }`}>
                          {isExpanded ? (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Collapse</>
                          ) : (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>{stage.total} process{stage.total !== 1 ? 'es' : ''}</>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && stage.processes.length > 0 && (
                      <div className="mt-4 w-40 px-1">
                        <div className="relative flex flex-col gap-0">
                          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
                          {stage.processes.map((proc, pIdx) => {
                            return (
                              <div key={proc.id} className="relative z-10">
                                <div className="flex items-center gap-3 py-2">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-white dark:bg-gray-800 transition-colors
                                      ${proc.completed ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}
                                    `}
                                  >
                                    {proc.completed ? (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span>{pIdx + 1}</span>
                                    )}
                                  </div>
                                  <div className="pt-1 min-w-0 flex-1">
                                    <p className={`text-[11px] font-semibold leading-tight ${proc.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {proc.name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>


                </div>
              )
            })}
          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center flex-wrap gap-5 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap gap-5">
              <LegendItem color="bg-primary-600" label="Active stage" />
              <LegendItem color="bg-emerald-500" label="Completed" />
              <LegendItem color="bg-gray-300 dark:bg-gray-600" label="Not started" />
              <LegendItem color="bg-violet-200 dark:bg-violet-900" label="Process" />
            </div>
            <div>
              <select className="aiq-input text-xs py-2 px-3 min-w-[160px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm font-semibold cursor-pointer">
                <option value="none">Default View</option>
                <option value="quality">Quality Notes</option>
                <option value="thermal">Thermal Image</option>
                <option value="logs">Process Logs</option>
              </select>
            </div>
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
      <span className="text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  )
}