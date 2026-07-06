import React, { useState, useEffect, useRef } from 'react'
import { getPWSItems, getProjectAnalytics } from '../../api/client'
import FarmFlowSummary from './FarmFlowSummary'
import FarmMetricCards from './FarmMetricCards'

const NAV_TABS = [
    { id: 'flow', label: 'Flow Summary' },
    { id: 'metrics', label: 'Yield & Efficiency' },
]

export default function FarmToForkPage() {
    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [projectAnalytics, setProjectAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchingDetails, setFetchingDetails] = useState(false)
    const [activeTab, setActiveTab] = useState('flow')

    const flowRef = useRef(null)
    const metricsRef = useRef(null)

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
        const target = tabId === 'flow' ? flowRef : metricsRef
        target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleProjectChange = (e) => {
        const project = projects.find(item => item.id === e.target.value) || null
        setSelectedProject(project)
    }

    const flowData = buildFlowData(projectAnalytics, selectedProject)

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-0 w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-0 sticky top-0 z-20 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">Analytics Dashboard</p>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Farm to Fork</h1>
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
                                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {projects.length === 0 ? (
                <EmptyState message="Create projects in the project management flow to view Farm to Fork analytics." />
            ) : fetchingDetails || !flowData ? (
                <div className="flex justify-center items-center h-40">
                    <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="flex flex-col gap-10 pb-16">

                    <section ref={flowRef} className="scroll-mt-24 px-6 pt-8">
                        <SectionHeader color="bg-emerald-600" label="Farm to Form Flow Summary" />
                        <FarmFlowSummary stages={flowData.stages} />
                    </section>

                    <section ref={metricsRef} className="scroll-mt-24 px-6">
                        <SectionHeader color="bg-teal-600" label="Yield & Efficiency" />
                        <FarmMetricCards metrics={flowData.metrics} />

                        <div className="mt-6">
                            <StageBreakdownTable stages={flowData.stages} />
                        </div>
                    </section>

                </div>
            )}
        </div>
    )
}

function buildFlowData(projectAnalytics, selectedProject) {
    if (!projectAnalytics) return null

    const workflows = projectAnalytics.workflows || []
    const invoices = projectAnalytics.invoices || []

    const stages = workflows.map((workflow, idx) => {
        const relatedInvoice = invoices[idx] || invoices[0] || null
        const quantity = relatedInvoice?.total_quantity || relatedInvoice?.quantity || null
        const unit = relatedInvoice?.unit || 'units'
        const material = relatedInvoice?.description || relatedInvoice?.item_name || workflow.name

        return {
            id: workflow.id,
            index: idx,
            stageName: workflow.name,
            material: material,
            quantity: quantity,
            unit: unit,
            stateCount: workflow.states?.length || 0,
            completed: workflow.states?.every(s => s.completed) || false,
        }
    })

    const quantities = stages.map(s => s.quantity).filter(q => q != null && q > 0)
    const firstQty = quantities[0] || 1
    const lastQty = quantities[quantities.length - 1] || firstQty

    const overallYield = firstQty > 0 ? ((lastQty / firstQty) * 100).toFixed(1) : null

    let totalLoss = 0
    let lossCount = 0
    for (let i = 1; i < quantities.length; i++) {
        if (quantities[i - 1] > 0) {
            totalLoss += ((quantities[i - 1] - quantities[i]) / quantities[i - 1]) * 100
            lossCount++
        }
    }
    const processingLoss = lossCount > 0 ? (totalLoss / lossCount).toFixed(1) : null

    const midIdx = Math.floor(quantities.length / 2)
    const midQty = quantities[midIdx] || firstQty
    const conversionEfficiency = firstQty > 0 ? ((midQty / firstQty) * 100).toFixed(1) : null

    const qualityRetention = firstQty > 0 ? ((lastQty / firstQty) * 100).toFixed(1) : null

    return {
        stages,
        metrics: {
            overallYield,
            processingLoss,
            conversionEfficiency,
            qualityRetention,
            firstQty,
            lastQty,
            stageCount: stages.length,
        },
    }
}

function SectionHeader({ color, label }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-1 h-6 ${color} rounded-full`}></div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">{label}</h2>
        </div>
    )
}

function StageBreakdownTable({ stages }) {
    return (
        <div className="aiq-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Stage Breakdown</h2>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">Quantity and material at each transformation stage</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">#</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Stage</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Material</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Quantity</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Processes</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {stages.map((stage, idx) => (
                            <tr key={stage.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-100">
                                <td className="px-6 py-4">
                                    <span className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{stage.stageName}</td>
                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{stage.material || 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                                    {stage.quantity != null ? `${Number(stage.quantity).toLocaleString()} ${stage.unit}` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{stage.stateCount}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${stage.completed
                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent'
                                        }`}>
                                        {stage.completed ? 'Complete' : 'In Progress'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function EmptyState({ message }) {
    return (
        <div className="aiq-card p-16 text-center mt-6 mx-6 border-dashed border-2">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Projects Found</h3>
            <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">{message}</p>
        </div>
    )
}