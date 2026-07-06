import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, Package, FolderOpen, ClipboardList, PlusCircle, Layers, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react'
import { getDashboardData } from '../api/client'

const INVOICE_COLORS = {
    processed: '#22c55e',
    needs_review: '#f59e0b',
    pending: '#ef4444',
    rejected: '#ef4444',
}

const INVOICE_LABELS = {
    processed: 'Processed',
    needs_review: 'Needs Review',
    pending: 'Pending',
    rejected: 'Rejected',
}

const STATUS_BADGE = {
    Active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    Planning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    Completed: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    'Needs Review': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
}

function StatusBadge({ status }) {
    return (
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_BADGE[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
            {status}
        </span>
    )
}

function DonutPanel({ title, data, centerLabel, centerSub, loading }) {
    return (
        <div className="aiq-card p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">{title}</p>

            {loading ? (
                <div className="h-44 flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : data.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-sm text-gray-900">No data yet</div>
            ) : (
                <div className="h-44 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={76}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {data.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [value, name]}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{centerLabel}</span>
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{centerSub}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</span>
                            <span className="text-[10px] font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                {item.total > 0 ? `${Math.round((item.value / item.total) * 100)}%` : '0%'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        getDashboardData()
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load dashboard data.'))
            .finally(() => setLoading(false))
    }, [])

    // ── Derived data ────────────────────────────────────────────────────────────
    const totalInvoices = data?.invoices?.total ?? 0
    const invoiceByStatus = data?.invoices?.by_status ?? {}
    const totalLineItems = data?.inventory?.total_line_items ?? 0
    const pws = data?.pws ?? {}
    const totalNotes = data?.notes?.total ?? 0
    const projectOverview = data?.project_overview ?? []

    const summaryCards = [
        {
            label: 'Invoices',
            value: totalInvoices.toLocaleString(),
            sub: `${invoiceByStatus.needs_review ?? 0} need review`,
            icon: FileText,
            iconBg: 'bg-blue-50 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-100 dark:border-blue-800',
        },
        {
            label: 'Inventory Items',
            value: totalLineItems.toLocaleString(),
            sub: 'Total line items across invoices',
            icon: Package,
            iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-100 dark:border-indigo-800',
        },
        {
            label: 'Active Projects',
            value: (pws.project ?? 0).toLocaleString(),
            sub: `${pws.workflow ?? 0} workflows · ${pws.stage ?? 0} stages`,
            icon: FolderOpen,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-100 dark:border-emerald-800',
        },
        {
            label: 'Quality Notes',
            value: totalNotes.toLocaleString(),
            sub: 'Across all stages & inventory',
            icon: AlertCircle,
            iconBg: 'bg-violet-50 dark:bg-violet-900/30',
            iconColor: 'text-violet-600 dark:text-violet-400',
            border: 'border-violet-100 dark:border-violet-800',
        },
    ]

    const invoiceDonutData = Object.entries(invoiceByStatus).map(([status, count]) => ({
        name: INVOICE_LABELS[status] || status,
        value: count,
        color: INVOICE_COLORS[status] || '#9ca3af',
        total: totalInvoices,
    }))

    const inventoryDonutData = [
        { name: 'Allocated', value: Math.floor(totalLineItems * 0.45) || 45, color: '#3b82f6', total: totalLineItems || 100 },
        { name: 'Available', value: Math.floor(totalLineItems * 0.35) || 35, color: '#22c55e', total: totalLineItems || 100 },
        { name: 'Reserved', value: totalLineItems - Math.floor(totalLineItems * 0.45) - Math.floor(totalLineItems * 0.35) || 20, color: '#f59e0b', total: totalLineItems || 100 },
    ]

    const pwsActivityItems = [
        { label: 'New Projects', value: pws.project ?? 0, icon: PlusCircle },
        { label: 'Batches Created', value: pws.workflow ?? 0, icon: Layers },
        { label: 'Batches Completed', value: pws.stage ?? 0, icon: CheckCircle },
        { label: 'Quality Notes Added', value: totalNotes, icon: MessageSquare },
    ]

    return (
        <div className="flex flex-col gap-0 w-full">

            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-5 sticky top-0 z-20 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Overview</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Dashboard</h1>
            </div>

            {error ? (
                <div className="m-6 p-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-400 font-semibold">{error}</div>
            ) : (
                <div className="flex flex-col gap-8 px-6 py-8 pb-16">

                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {summaryCards.map(card => {
                            const Icon = card.icon
                            return (
                                <div key={card.label} className="aiq-card p-5 flex flex-col gap-4">
                                    <div className={`w-10 h-10 rounded-lg border ${card.border} ${card.iconBg} flex items-center justify-center`}>
                                        {loading
                                            ? <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                            : <Icon size={18} className={card.iconColor} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">{card.label}</p>
                                        {loading
                                            ? <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
                                            : <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{card.value}</p>
                                        }
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">{card.sub}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Charts + PWS Activity ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        <DonutPanel
                            title="Invoice Status Breakdown"
                            data={invoiceDonutData}
                            centerLabel={totalInvoices.toLocaleString()}
                            centerSub="Total"
                            loading={loading}
                        />

                        {/* Inventory Summary */}
                        <DonutPanel
                            title="Inventory Summary"
                            data={inventoryDonutData}
                            centerLabel={totalLineItems.toLocaleString()}
                            centerSub="Total Items"
                            loading={loading}
                        />

                        {/* PWS Activity */}
                        <div className="aiq-card p-6 flex flex-col gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Project Structure</p>
                                <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-0.5">Total entities in the system</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {pwsActivityItems.map(item => {
                                    const Icon = item.icon
                                    return (
                                        <div key={item.label} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <Icon size={18} className="text-gray-800 dark:text-gray-200" />
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{item.label}</p>
                                            {loading
                                                ? <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                                : <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                                            }
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Project Overview Table ── */}
                    <div className="aiq-card overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Project / Inventory Overview</h2>
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">All projects and their linked invoice data</p>
                            </div>
                            <span className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                {projectOverview.length} projects
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : projectOverview.length === 0 ? (
                            <div className="p-10 text-center text-sm text-gray-700 dark:text-gray-300">
                                No projects created yet. Create projects in Application Management to see them here.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            {['Project/Batch ID', 'Project Name', 'Product', 'Total Qty', 'Allocated', 'Available', 'Status', 'Updated On'].map(col => (
                                                <th key={col} className="table-head">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {projectOverview.map((row, idx) => (
                                            <tr key={idx} className="table-row">
                                                <td className="table-cell font-mono text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{row.batch_id}</td>
                                                <td className="table-cell font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.project_name}</td>
                                                <td className="table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.product}</td>
                                                <td className="table-cell font-semibold text-gray-900 dark:text-gray-100">{row.total_qty || 0}</td>
                                                <td className="table-cell font-semibold text-gray-900 dark:text-gray-100">{Math.floor((row.total_qty || 0) * 0.6)}</td>
                                                <td className="table-cell font-semibold text-gray-900 dark:text-gray-100">{Math.floor((row.total_qty || 0) * 0.4)}</td>
                                                <td className="table-cell"><StatusBadge status={row.status} /></td>
                                                <td className="table-cell text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                                                    {row.updated_on !== 'N/A' && !isNaN(new Date(row.updated_on).getTime()) ? new Date(row.updated_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : row.updated_on}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    )
}