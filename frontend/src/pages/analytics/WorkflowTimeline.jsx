import React, { useMemo } from 'react'

export default function WorkflowTimeline({ data }) {
  const categoryName = data?.category || 'Unknown'
  const workflowItems = data?.workflows || []
  const stateItems = data?.states || []

  const uniqueStates = useMemo(() => {
    const map = new Map()
    stateItems.forEach((state) => {
      const key = state.name
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          ...state,
          workflow_names: [state.workflow_name],
        })
      } else {
        if (!existing.workflow_names.includes(state.workflow_name)) {
          existing.workflow_names.push(state.workflow_name)
        }
        existing.completed = existing.completed || state.completed
        if (state.completed_at) {
          const existingDate = existing.completed_at ? new Date(existing.completed_at) : null
          const newDate = new Date(state.completed_at)
          if (!existingDate || newDate > existingDate) {
            existing.completed_at = state.completed_at
          }
        }
      }
    })
    return Array.from(map.values())
  }, [stateItems])

  const workflowProgress = useMemo(() => {
    return workflowItems.map((workflow) => ({
      ...workflow,
      totalStates: workflow.states?.length || 0,
      completedCount: (workflow.states || []).filter((state) => state.completed).length,
    }))
  }, [workflowItems])

  // Compute elapsed time based on completed states
  const elapsedTimeStr = useMemo(() => {
    const completedStates = uniqueStates.filter((state) => state.completed && state.completed_at).map((state) => new Date(state.completed_at).getTime())
    if (completedStates.length < 2) return 'Just started'

    const first = Math.min(...completedStates)
    const latest = Math.max(...completedStates)
    const diffMs = latest - first
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((diffMs / 1000 / 60) % 60)
    let str = ''
    if (days > 0) str += `${days}d `
    if (hours > 0) str += `${hours}h `
    str += `${minutes}m`
    return str
  }, [uniqueStates])

  const formatDate = (dateObj) => {
    if (!dateObj) return null
    return {
      date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const currentStage = data?.invoice?.current_stage || 'Not Started'
  const currentWorkflow = data?.current_workflow || 'Not Started'
  const batchId = data?.invoice?.invoice_number || `Batch #${data?.invoice_id || 'N/A'}`
  const product = data?.invoice?.description || data?.invoice?.category || categoryName
  const stateColumnCount = Math.max(uniqueStates.length, 1)
  const workflowColumnCount = Math.max(workflowProgress.length, 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden flex flex-col gap-8">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Track & Track Timeline
      </h2>

      <div className="grid gap-8">
        <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">State Progress</p>
              <p className="text-sm text-gray-700">Overview of each state across the project.</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>Current State</div>
              <div className="font-semibold text-gray-900">{currentStage}</div>
            </div>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 right-0 top-10 h-0.5 bg-gray-200 z-0"></div>
            <div className={`grid gap-6 w-full py-4 px-4`} style={{ gridTemplateColumns: `repeat(${stateColumnCount}, minmax(0, 1fr))` }}>
              {uniqueStates.map((state, idx) => {
                const isComplete = state.completed
                const isCurrentStage = state.name === currentStage
                const formattedDate = formatDate(state.completed_at ? new Date(state.completed_at) : null)
                return (
                  <div key={state.name} className="relative z-10 flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 shadow-sm flex items-center justify-center mb-3 bg-white ${isCurrentStage ? 'border-blue-500 text-blue-600 ring-2 ring-blue-100' : isComplete ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}`}>
                      {isComplete ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span className="font-bold text-sm">{idx + 1}</span>
                      )}
                    </div>
                    <div className={`text-sm font-semibold text-center ${isCurrentStage ? 'text-blue-600' : 'text-gray-800'}`}>{state.name}</div>
                    {formattedDate ? (
                      <div className="text-[10px] text-gray-400 mt-2 text-center truncate w-full">{formattedDate.date}</div>
                    ) : (
                      <div className="text-[10px] text-gray-400 mt-2 uppercase">Pending</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Workflow Progress</p>
              <p className="text-sm text-gray-700">Shows process progress inside each workflow.</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>Current Workflow</div>
              <div className="font-semibold text-gray-900">{currentWorkflow}</div>
            </div>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 right-0 top-10 h-0.5 bg-gray-200 z-0"></div>
            <div className={`grid gap-6 w-full py-4 px-4`} style={{ gridTemplateColumns: `repeat(${workflowColumnCount}, minmax(0, 1fr))` }}>
              {workflowProgress.map((workflow, idx) => {
                const total = workflow.totalStates || 1
                const completedCount = workflow.completedCount || 0
                const progress = Math.round((completedCount / total) * 100)
                const isCurrentWorkflow = workflow.name === currentWorkflow
                return (
                  <div key={workflow.id} className="relative z-10 flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 shadow-sm flex items-center justify-center mb-3 bg-white ${isCurrentWorkflow ? 'border-blue-500 text-blue-600 ring-2 ring-blue-100' : progress === 100 ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}`}>
                      {progress === 100 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span className="font-bold text-sm">{idx + 1}</span>
                      )}
                    </div>
                    <div className={`text-sm font-semibold text-center ${isCurrentWorkflow ? 'text-blue-600' : 'text-gray-800'}`}>{workflow.name}</div>
                    <div className="text-[10px] text-gray-500 text-center mt-1">{completedCount}/{total} states</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-1.5" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto shrink-0 bg-gray-50/50 rounded-xl border border-gray-100 p-5 flex flex-wrap gap-6 justify-between items-center text-sm">
        <div className="flex items-center gap-3">
          <div className="text-gray-400">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold">Batch ID</p>
            <p className="font-bold text-blue-600">{batchId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-gray-400">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold">Product</p>
            <p className="font-bold text-blue-600">{product}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-gray-400">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold">Current Stage</p>
            <p className="font-bold text-blue-600">{currentStage}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-green-500">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold">Total Elapsed Time</p>
            <p className="font-bold text-gray-900">{elapsedTimeStr}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
