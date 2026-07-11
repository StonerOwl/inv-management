import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, Search, Filter, RefreshCw, Activity, ChevronRight, Package, Hash, DollarSign } from 'lucide-react'
import { getPWSItems, getProjectAnalytics } from '../../api/client'
import WorkflowTimeline from './WorkflowTimeline'
import AnalyticsCards from './AnalyticsCards'
import StageProcessList from './StageProcessList'
import AnalyticsCharts from './AnalyticsCharts'

const NAV_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'summary', label: 'Summary' },
  { id: 'analytics', label: 'Flow Analytics' },
]

export default function TrackTracePage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectAnalytics, setProjectAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const overviewRef = useRef(null)
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
    const target = tabId === 'overview' ? overviewRef : (tabId === 'summary' ? summaryRef : analyticsRef)
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleProjectChange = (e) => {
    const project = projects.find(item => item.id === e.target.value) || null
    setSelectedProject(project)
  }

  const timelineData = projectAnalytics
    ? {
      project: projectAnalytics.project || {},
      category: projectAnalytics.project?.name || selectedProject?.name,
      invoice: {
        invoice_id: projectAnalytics.invoices?.[0]?.id || null,
        invoice_number: projectAnalytics.invoices?.[0]?.invoice_number || `Batch #${selectedProject?.project_code || selectedProject?.id}`,
        description: projectAnalytics.invoices?.[0]?.description || projectAnalytics.project?.name,
        current_stage: projectAnalytics.invoices?.[0]?.current_stage || projectAnalytics.workflows?.[0]?.stages?.[0]?.name || 'Not started',
        progress: projectAnalytics.invoices?.[0]?.progress || 0,
      },
      workflows: projectAnalytics.workflows || [],
      stages: (projectAnalytics.workflows || []).flatMap(workflow =>
        (workflow.stages || []).map((stage, index) => ({
          id: stage.id,
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          name: stage.name,
          description: `Stage ${index + 1} in ${workflow.name}`,
          completed: false,
          completed_at: null,
          processes: stage.processes || [],
        }))
      ),
      current_workflow: projectAnalytics.workflows?.[0]?.name || 'Not started',
      invoices: projectAnalytics.invoices || [],
      inventoryItems: projectAnalytics.inventory_items || [],
    }
    : null

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-1">Analytics Dashboard</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Track & Trace</h1>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Project</label>
            <select
              className="aiq-input appearance-none py-2 px-4 min-w-[220px]"
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
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150 focus:outline-none ${activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="aiq-card p-16 text-center mt-6 mx-6 border-dashed border-2">
          <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2-2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Projects Found</h3>
          <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm font-medium">Create projects in the project management flow to view analytics.</p>
        </div>
      ) : fetchingDetails || !timelineData ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-10 pb-16">

          <section ref={overviewRef} className="scroll-mt-24">
            <ProjectsOverview projects={projects} />
          </section>

          <section ref={summaryRef} className="scroll-mt-24 px-6 pt-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <MetaCard
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                label="Project ID"
                value={selectedProject?.project_code || selectedProject?.id}
                accent="indigo"
              />
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
            <AnalyticsCharts data={timelineData} />
          </section>

          <section ref={analyticsRef} className="scroll-mt-24 px-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Flow Analytics</h2>
            </div>

            <WorkflowTimeline data={timelineData} />

            <div className="mt-6">
              <StageProcessList data={timelineData} />
            </div>
          </section>

          <section className="px-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Linked Inventory</h2>
              <span className="ml-1 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                {timelineData.inventoryItems.length} item{timelineData.inventoryItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {timelineData.inventoryItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center bg-gray-50 dark:bg-gray-900/50">
                <Package size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No inventory linked to this project yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Inventory is created automatically when invoices are registered to this project.</p>
              </div>
            ) : (
              <div className="aiq-card overflow-hidden">
                {/* Summary bar */}
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 flex flex-wrap gap-6 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Package size={12} className="text-primary-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{timelineData.inventoryItems.length}</span> line items
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Hash size={12} className="text-primary-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {[...new Set(timelineData.inventoryItems.map(i => i.invoice_number).filter(Boolean))].length}
                    </span> invoice{[...new Set(timelineData.inventoryItems.map(i => i.invoice_number).filter(Boolean))].length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 ml-auto">
                    <DollarSign size={12} className="text-primary-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {timelineData.inventoryItems.reduce((sum, i) => sum + (i.total_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span> total
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="table-head pl-5">Item Name</th>
                        <th className="table-head text-right">Qty</th>
                        <th className="table-head text-right">Unit Price</th>
                        <th className="table-head text-right">Total</th>
                        <th className="table-head">HSN Code</th>
                        <th className="table-head">Invoice</th>
                        <th className="table-head pr-5">Source File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineData.inventoryItems.map((item, idx) => (
                        <tr key={item.id} className={`table-row ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-900/20'}`}>
                          <td className="table-cell pl-5 font-semibold max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <Package size={13} className="text-primary-400 dark:text-primary-500 shrink-0" />
                              <span className="truncate" title={item.item_name}>{item.item_name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-right tabular-nums">{item.quantity ?? '—'}</td>
                          <td className="table-cell text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {item.unit_price != null ? item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="table-cell text-right tabular-nums font-semibold">
                            {item.total_amount != null ? item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="table-cell">
                            {item.hsn_code
                              ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.hsn_code}</span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="table-cell">
                            {item.invoice_number
                              ? <span className="font-mono text-xs text-primary-600 dark:text-primary-400">{item.invoice_number}</span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="table-cell pr-5 text-gray-500 dark:text-gray-400 max-w-[160px]">
                            <span className="truncate block text-xs" title={item.source_file_name}>{item.source_file_name || '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-800 text-violet-600 dark:text-violet-400',
  }
  const iconClass = accentMap[accent] || accentMap.blue

  return (
    <div className="aiq-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 break-words">{value || 'N/A'}</p>
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

function ProjectsOverview({ projects }) {
  const navigate = useNavigate();
  const liveProjects = projects.filter(p => {
    if (!p.start_date || !p.target_date) return false;
    const now = new Date();
    const start = new Date(p.start_date);
    const target = new Date(p.target_date);
    return now >= start && now <= target;
  });

  return (
    <div className="px-6 pt-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="aiq-card p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <FolderPlus size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Projects</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{projects.length}</p>
        </div>
        <div className="aiq-card p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Projects in progress</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{liveProjects.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Live Projects</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="aiq-input pl-9 pr-4 py-2 min-w-[250px]"
            />
          </div>
          <button className="aiq-btn-ghost flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] px-4">
            <Filter size={16} /> Filters
          </button>
          <button className="aiq-btn-ghost flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] w-[42px] p-0">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="aiq-card overflow-hidden relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold tracking-wider uppercase">
            <tr>
              <th className="py-4 px-6">Project Name</th>
              <th className="py-4 px-6">Project ID</th>
              <th className="py-4 px-6">Start Date</th>
              <th className="py-4 px-6">Target Date</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200">
            {liveProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-700 dark:text-gray-300 font-semibold">
                  No live projects found.
                </td>
              </tr>
            ) : (
              liveProjects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="py-4 px-6 font-semibold" title={p.name}>{p.name}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.project_code || p.id}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.start_date || '—'}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.target_date || '—'}</td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black tracking-wider rounded-md border border-emerald-200 dark:border-emerald-800">IN PROGRESS</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => navigate("/app-management/create-pws", { state: { selectedProjectId: p.id, viewMode: "manage" } })} className="text-primary-600 hover:text-primary-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1 justify-end w-full">
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}