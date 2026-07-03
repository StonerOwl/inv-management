import React from 'react'

export default function FlowSummary({ data }) {
  const processes = data?.processes || []
  
  // Group processes by workflow
  const workflowsMap = new Map()
  processes.forEach(p => {
    if (!workflowsMap.has(p.workflow_id)) {
      workflowsMap.set(p.workflow_id, {
        id: p.workflow_id,
        name: p.workflow_name,
        processes: []
      })
    }
    workflowsMap.get(p.workflow_id).processes.push(p)
  })
  const workflows = Array.from(workflowsMap.values())

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Flow Summary
      </h2>

      {workflows.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-4">No stages available.</p>
      ) : (
        <div className="flex flex-col gap-2 relative">
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-100 -z-10"></div>
          {workflows.map((wf, idx) => (
            <div key={wf.id} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 shadow-sm z-10">
                <span className="text-gray-600 font-bold text-sm">{idx + 1}</span>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <h4 className="text-sm font-bold text-gray-800">{wf.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{wf.processes?.length || 0} processes</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
