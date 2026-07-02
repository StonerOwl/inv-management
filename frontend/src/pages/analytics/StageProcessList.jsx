import React from 'react'

export default function StageProcessList({ data }) {
  const stateItems = data?.states || []

  const stageMap = new Map()
  stateItems.forEach((state) => {
    const stageName = state.name
    if (!stageMap.has(stageName)) {
      stageMap.set(stageName, {
        name: stageName,
        workflows: new Map(),
      })
    }
    const stage = stageMap.get(stageName)
    if (!stage.workflows.has(state.workflow_id)) {
      stage.workflows.set(state.workflow_id, {
        id: state.workflow_id,
        name: state.workflow_name,
      })
    }
  })

  const stages = Array.from(stageMap.values()).map((stage) => ({
    ...stage,
    workflows: Array.from(stage.workflows.values()),
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Stage & Process Breakdown
      </h2>
      
      {stages.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No stages defined for this project.</p>
      ) : (
        <div className="space-y-6">
          {stages.map((stage, idx) => (
            <div key={stage.name} className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <h3 className="font-bold text-gray-800">{stage.name}</h3>
                <span className="ml-auto text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  {stage.workflows.length} Workflow{stage.workflows.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="p-4 bg-white">
                {stage.workflows.length > 0 ? (
                  <ul className="space-y-2">
                    {stage.workflows.map((workflow) => (
                      <li key={workflow.id} className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-800">{workflow.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No workflows mapped to this stage.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
