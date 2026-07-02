import React, { useState, useEffect } from 'react'
import { getPWSItems, getProjectAnalytics } from '../../api/client'
import WorkflowTimeline from './WorkflowTimeline'
import StageProcessList from './StageProcessList'
import AnalyticsCards from './AnalyticsCards'

export default function TrackTracePage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectAnalytics, setProjectAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDetails, setFetchingDetails] = useState(false)

  useEffect(() => {
    getPWSItems()
      .then(res => {
        const projectItems = (res.data || []).filter(item => item.type === 'project')
        setProjects(projectItems)
        if (projectItems.length > 0) {
          setSelectedProject(projectItems[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setProjectAnalytics(null)
      return
    }

    setFetchingDetails(true)
    getProjectAnalytics(selectedProject.id)
      .then(res => {
        setProjectAnalytics(res.data)
      })
      .catch(err => {
        console.error('Failed to load project analytics:', err)
        setProjectAnalytics(null)
      })
      .finally(() => setFetchingDetails(false))
  }, [selectedProject])

  const handleProjectChange = (e) => {
    const project = projects.find(item => item.id === e.target.value) || null
    setSelectedProject(project)
  }

  const timelineData = projectAnalytics
    ? {
        category: projectAnalytics.project?.name || selectedProject?.name,
        invoice: {
          invoice_id: projectAnalytics.invoices?.[0]?.id || null,
          invoice_number: projectAnalytics.invoices?.[0]?.invoice_number || `Batch #${selectedProject?.project_code || selectedProject?.id}`,
          description: projectAnalytics.invoices?.[0]?.description || projectAnalytics.project?.name,
          current_stage: projectAnalytics.invoices?.[0]?.current_stage || projectAnalytics.workflows?.[0]?.states?.[0]?.name || 'Not started',
          progress: projectAnalytics.invoices?.[0]?.progress || 0,
        },
        workflows: projectAnalytics.workflows || [],
        processes: (projectAnalytics.workflows || []).flatMap((workflow) =>
          (workflow.states || []).map((state, index) => ({
            id: state.id,
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            name: state.name,
            description: `State ${index + 1} in ${workflow.name}`,
            completed: false,
            completed_at: null,
          }))
        ),
        states: (projectAnalytics.workflows || []).flatMap((workflow) =>
          (workflow.states || []).map((state, index) => ({
            id: state.id,
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            name: state.name,
            description: `State ${index + 1} in ${workflow.name}`,
            completed: false,
            completed_at: null,
          }))
        ),
        current_workflow: projectAnalytics.workflows?.[0]?.name || 'Not started',
        invoices: projectAnalytics.invoices || [],
      }
    : null

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Track & Trace Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor project workflows, stage progress, and linked invoices.</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap pl-2">Project:</label>
          <select
            className="border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3 bg-white border outline-none min-w-[220px]"
            value={selectedProject?.id || ''}
            onChange={handleProjectChange}
          >
            {projects.length === 0 ? (
              <option value="">No projects created yet</option>
            ) : (
              projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Projects Found</h3>
          <p className="text-gray-500 mt-1">Create projects in the project management flow to view analytics.</p>
        </div>
      ) : fetchingDetails || !timelineData ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              <WorkflowTimeline data={timelineData} />
            </div>
            <div className="flex flex-col gap-6">
              <AnalyticsCards data={timelineData} />
              <StageProcessList data={timelineData} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Invoices linked to this project</h3>
                <p className="text-sm text-gray-500 mt-1">The selected project will show any invoices mapped to it here.</p>
              </div>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {timelineData.invoices.length} invoice{timelineData.invoices.length === 1 ? '' : 's'}
              </span>
            </div>

            {timelineData.invoices.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No invoices have been mapped to this project yet.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {timelineData.invoices.map(invoice => (
                  <div key={invoice.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500 mt-1">{invoice.file_name}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {invoice.status || 'pending'}
                      </span>
                    </div>
                    {invoice.description && (
                      <p className="text-sm text-gray-600 mt-3">{invoice.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                      <span>Current stage: {invoice.current_stage || 'Not started'}</span>
                      <span>{invoice.progress}% progress</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
