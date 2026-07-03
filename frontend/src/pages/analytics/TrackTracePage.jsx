import React, { useState, useEffect, useRef } from 'react'
import { getPWSItems, getProjectAnalytics } from '../../api/client'
import WorkflowTimeline from './WorkflowTimeline'
import AnalyticsCards from './AnalyticsCards'
import StageProcessList from './StageProcessList'

const NAV_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'analytics', label: 'Flow Analytics' },
]

export default function TrackTracePage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectAnalytics, setProjectAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')

  const summaryRef = useRef(null)
  const analyticsRef = useRef(null)

  useEffect(() => {
    getPWSItems()
      .then(res => {
        const projectItems = (res.data || []).filter(item => item.type === 'project')
        setProjects(projectItems)
        if (projectItems.length > 0) setSelectedProject(projectItems[0])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProject) { setProjectAnalytics(null); return }
    setFetchingDetails(true)
    getProjectAnalytics(selectedProject.id)
      .then(res => setProjectAnalytics(res.data))
      .catch(() => setProjectAnalytics(null))
      .finally(() => setFetchingDetails(false))
  }, [selectedProject])

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    const target = tabId === 'summary' ? summaryRef : analyticsRef
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
        processes: (projectAnalytics.workflows || []).flatMap(workflow =>
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
        states: (projectAnalytics.workflows || []).flatMap(workflow =>
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
    <div className="flex flex-col gap-0 w-full">

      <div className="bg-white border-b border-gray-200 px-6 pt-6 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Analytics Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Track & Trace</h1>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Project</label>
            <select
              className="border border-gray-200 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3 bg-white outline-none min-w-[220px] text-gray-800 font-medium"
              value={selectedProject?.id || ''}
              onChange={handleProjectChange}
            >
              {projects.length === 0 ? (
                <option value="">No projects created yet</option>
              ) : (
                projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex gap-1">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150 focus:outline-none ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white p-16 text-center mt-6 mx-6 rounded-xl border border-gray-100 shadow-sm">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">No Projects Found</h3>
          <p className="text-gray-400 mt-1 text-sm">Create projects in the project management flow to view analytics.</p>
        </div>
      ) : fetchingDetails || !timelineData ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-10 pb-16">

          <section ref={summaryRef} className="scroll-mt-24 px-6 pt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetaCard
                icon={<BatchIcon />}
                label="Batch ID"
                value={timelineData.invoice.invoice_number}
                accent="blue"
              />
              <MetaCard
                icon={<StageIcon />}
                label="Current Stage"
                value={timelineData.invoice.current_stage}
                accent="indigo"
              />
              <MetaCard
                icon={<WorkflowIcon />}
                label="Current Workflow"
                value={timelineData.current_workflow}
                accent="violet"
              />
            </div>

            <AnalyticsCards data={timelineData} />
          </section>

          <section ref={analyticsRef} className="scroll-mt-24 px-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Flow Analytics</h2>
            </div>

            <WorkflowTimeline data={timelineData} />

            <div className="mt-6">
              <StageProcessList data={timelineData} />
            </div>
          </section>

          <section className="px-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Linked Invoices</h2>
              <span className="ml-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {timelineData.invoices.length}
              </span>
            </div>

            {timelineData.invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400 bg-gray-50">
                No invoices have been mapped to this project yet.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {timelineData.invoices.map(invoice => (
                  <div key={invoice.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{invoice.file_name}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">
                        {invoice.status || 'pending'}
                      </span>
                    </div>
                    {invoice.description && (
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed">{invoice.description}</p>
                    )}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Stage: <span className="font-semibold text-gray-600">{invoice.current_stage || 'Not started'}</span></span>
                        <span className="font-semibold text-gray-600">{invoice.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${invoice.progress || 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function MetaCard({ icon, label, value, accent }) {
  const accentMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
  }
  const iconClass = accentMap[accent] || accentMap.blue

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  )
}

function BatchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function StageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function WorkflowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}