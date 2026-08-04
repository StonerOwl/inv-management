import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Layers, GitMerge, ListChecks, GitCommit, Search, Activity, Box, Download } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { getPWSItems, getPWSAssignments } from '../../api/client'

export default function QualityParametersPage() {
  const [loading, setLoading] = useState(true)
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [itemsRes, assignsRes] = await Promise.all([
          getPWSItems().catch(() => ({ data: [] })),
          getPWSAssignments().catch(() => ({ data: [] }))
        ])
        if (cancelled) return
        setPwsItems(itemsRes.data || [])
        setPwsAssignments(assignsRes.data || [])
      } catch (err) {
        console.warn('Failed to fetch PWS data', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const projects = pwsItems.filter(p => p.type === 'project')
  const workflows = pwsItems.filter(p => p.type === 'workflow')
  const stages = pwsItems.filter(p => p.type === 'stage')
  const processes = pwsItems.filter(p => p.type === 'process')

  const getChildren = (parentId, type) => {
    const childIds = pwsAssignments.filter(a => a.parent_id === parentId).map(a => a.child_id)
    return pwsItems.filter(p => p.type === type && childIds.includes(p.id))
  }

  const filteredProjects = projects.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.project_code && p.project_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.product && p.product.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Quality Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of quality parameters, processes, and hierarchies across all projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search projects or products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-64 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={projects.length} icon={Layers} color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
        <StatCard title="Total Workflows" value={workflows.length} icon={GitMerge} color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" />
        <StatCard title="Production Stages" value={stages.length} icon={ListChecks} color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
        <StatCard title="Managed Processes" value={processes.length} icon={GitCommit} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity size={18} className="text-primary-600" /> 
          Process Hierarchy Map
        </h2>
        
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <Box className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No projects found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredProjects.map(project => (
              <ProjectHierarchyCard key={project.id} project={project} getChildren={getChildren} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

function ProjectHierarchyCard({ project, getChildren }) {
  const projectWorkflows = getChildren(project.id, 'workflow')
  const cardRef = useRef(null)

  const handleDownloadPDF = () => {
    if (!cardRef.current) return
    const opt = {
      margin:       0.5,
      filename:     `Quality_Parameters_${project.project_code || project.name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(cardRef.current).save()
  }
  
  return (
    <div ref={cardRef} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-1 tracking-wider uppercase">Project</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {project.name}
            {project.project_code && (
              <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                {project.project_code}
              </span>
            )}
            {project.product && (
              <span className="text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {project.product}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full shadow-sm">
            {projectWorkflows.length} Workflows
          </div>
          <button 
            onClick={handleDownloadPDF}
            className="p-1.5 text-gray-500 hover:text-primary-600 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-gray-200 dark:border-gray-700 rounded-md transition-colors shadow-sm"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {projectWorkflows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">No workflows assigned to this project.</p>
        ) : (
          <div className="space-y-6">
            {projectWorkflows.map(workflow => (
              <WorkflowSection key={workflow.id} workflow={workflow} getChildren={getChildren} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkflowSection({ workflow, getChildren }) {
  const stages = getChildren(workflow.id, 'stage')
  
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2 mb-4">
        <GitMerge size={16} className="text-purple-500" />
        <h4 className="font-bold text-gray-800 dark:text-gray-200">{workflow.name}</h4>
      </div>
      
      <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-4">
        {stages.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No stages defined.</p>
        ) : (
          stages.map(stage => (
            <StageSection key={stage.id} stage={stage} getChildren={getChildren} />
          ))
        )}
      </div>
    </div>
  )
}

function StageSection({ stage, getChildren }) {
  const processes = getChildren(stage.id, 'process')
  
  return (
    <div className="relative">
      <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
      <div className="flex items-center gap-2 mb-2">
        <ListChecks size={14} className="text-amber-500" />
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stage.name}</h5>
      </div>
      
      {processes.length > 0 && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {processes.map(process => (
            <div key={process.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2.5 flex items-start gap-2 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
              <GitCommit size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{process.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">ID: {process.id.substring(0, 8)}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                  <Activity size={10} /> Active
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
