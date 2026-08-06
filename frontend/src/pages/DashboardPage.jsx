import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
    FileText, Package, FolderOpen, AlertCircle, 
    ArrowRight, Map, Smartphone
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis } from 'recharts'
import { 
    getDashboardData, 
    getTrackingDashboard, 
    getQualitySummary, 
    getDeviceStats 
} from '../api/client'

function MetricRow({ label, value, subtext }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
            <div>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                {subtext && <p className="text-[9px] text-gray-500 dark:text-gray-500">{subtext}</p>}
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    )
}

function MiniDonut({ data, totalLabel, totalValue, colors }) {
    return (
        <div className="flex items-center gap-4 py-2">
            <div className="w-20 h-20 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={38}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px' }}
                            itemStyle={{ padding: 0 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-gray-800 dark:text-gray-200 leading-none">{totalValue}</span>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1">
                {data.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="font-semibold text-gray-600 dark:text-gray-400">{entry.name}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function MiniBarChart({ data, colors }) {
    return (
        <div className="h-28 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

function ModuleCard({ title, subtitle, icon: Icon, link, linkText, colorHex, children, loading }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden transition-shadow hover:shadow-md relative">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colorHex }} />
            
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
                            <Icon size={18} style={{ color: colorHex }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">{title}</h2>
                            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center min-h-[160px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 rounded-full animate-spin" style={{ borderTopColor: colorHex }} />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 h-full">
                            {children}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-5 py-3.5 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <Link to={link} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide transition-opacity hover:opacity-70" style={{ color: colorHex }}>
                    {linkText} <ArrowRight size={13} className="ml-1" />
                </Link>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [dashData, setDashData] = useState(null)
    const [trackingData, setTrackingData] = useState(null)
    const [qualityData, setQualityData] = useState(null)
    const [deviceData, setDeviceData] = useState(null)

    useEffect(() => {
        Promise.allSettled([
            getDashboardData(),
            getTrackingDashboard(),
            getQualitySummary(),
            getDeviceStats()
        ]).then(([dashRes, trackRes, qualRes, devRes]) => {
            if (dashRes.status === 'fulfilled') setDashData(dashRes.value.data)
            if (trackRes.status === 'fulfilled') setTrackingData(trackRes.value.data)
            if (qualRes.status === 'fulfilled') setQualityData(qualRes.value.data)
            if (devRes.status === 'fulfilled') setDeviceData(devRes.value.data)
        }).finally(() => {
            setLoading(false)
        })
    }, [])

    // -- Derived Data for Charts --
    const invoicesTotal = dashData?.invoices?.total ?? 0
    const invoicesData = [
        { name: 'Processed', value: dashData?.invoices?.by_status?.processed ?? 0 },
        { name: 'Needs Review', value: dashData?.invoices?.by_status?.needs_review ?? 0 },
        { name: 'Pending', value: dashData?.invoices?.by_status?.pending ?? 0 }
    ]

    const inventoryTotal = dashData?.inventory?.total_line_items ?? 0
    const alloc = Math.floor(inventoryTotal * 0.45)
    const avail = Math.floor(inventoryTotal * 0.35)
    const resrv = inventoryTotal - alloc - avail
    const inventoryData = [
        { name: 'Allocated', value: alloc },
        { name: 'Available', value: avail },
        { name: 'Reserved', value: resrv }
    ]

    const pwsData = [
        { name: 'Projects', value: dashData?.pws?.project ?? 0 },
        { name: 'Workflows', value: dashData?.pws?.workflow ?? 0 },
        { name: 'Stages', value: dashData?.pws?.stage ?? 0 }
    ]

    const qualityTotal = qualityData?.total_notes ?? 0
    const qualityDonut = [
        { name: 'Critical', value: qualityData?.notes_by_severity?.Critical ?? 0 },
        { name: 'High', value: qualityData?.notes_by_severity?.High ?? 0 },
        { name: 'Medium/Low', value: (qualityData?.notes_by_severity?.Medium ?? 0) + (qualityData?.notes_by_severity?.Low ?? 0) }
    ]

    const trackingTotalInvoices = trackingData?.total_invoices ?? 0
    const trackingCategories = Object.entries(trackingData?.categories ?? {})
        .map(([name, count]) => ({ name: name || 'Uncat', value: count }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 3)

    const devicesTotal = deviceData?.top_cards?.total_devices ?? 0
    const devicesOnline = deviceData?.top_cards?.online ?? 0
    const deviceDonut = [
        { name: 'Online', value: devicesOnline },
        { name: 'Offline', value: devicesTotal - devicesOnline }
    ]

    return (
        <div className="flex flex-col w-full min-h-full bg-gray-50/30 dark:bg-gray-900/10">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 pt-8 pb-6 sticky top-0 z-20 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1.5">Command Center</p>
                <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">System Overview</h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
                    A high-level overview of all core modules. Select any module to view detailed analytics and manage its resources.
                </p>
            </div>

            <div className="p-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    
                    {/* 1. Invoice AI */}
                    <ModuleCard 
                        title="Smart Invoices" 
                        subtitle="Automated document processing"
                        icon={FileText} 
                        link="/inventory/dashboard" 
                        linkText="Go to Invoice Dashboard"
                        colorHex="#3b82f6" // blue-500
                        loading={loading}
                    >
                        <MiniDonut data={invoicesData} totalValue={invoicesTotal} colors={['#22c55e', '#f59e0b', '#ef4444']} />
                        <div className="mt-auto">
                            <MetricRow label="Total Processed" value={(dashData?.invoices?.total ?? 0).toLocaleString()} />
                        </div>
                    </ModuleCard>

                    {/* 2. Inventory */}
                    <ModuleCard 
                        title="Inventory" 
                        subtitle="Centralized stock management"
                        icon={Package} 
                        link="/inventory/dashboard" 
                        linkText="Manage Inventory"
                        colorHex="#8b5cf6" // violet-500
                        loading={loading}
                    >
                        <MiniDonut data={inventoryData} totalValue={inventoryTotal} colors={['#8b5cf6', '#22c55e', '#f59e0b']} />
                        <div className="mt-auto">
                            <MetricRow label="Total Line Items" value={(dashData?.inventory?.total_line_items ?? 0).toLocaleString()} />
                        </div>
                    </ModuleCard>

                    {/* 3. PWS / Projects */}
                    <ModuleCard 
                        title="Projects & Hierarchy" 
                        subtitle="App structural management"
                        icon={FolderOpen} 
                        link="/app-management/view-hierarchy" 
                        linkText="View Hierarchy"
                        colorHex="#10b981" // emerald-500
                        loading={loading}
                    >
                        <MiniBarChart data={pwsData} colors={['#10b981', '#34d399', '#6ee7b7']} />
                        <div className="mt-auto">
                            <MetricRow label="Active Projects" value={(dashData?.pws?.project ?? 0).toLocaleString()} />
                        </div>
                    </ModuleCard>

                    {/* 4. Tracking & Logistics */}
                    <ModuleCard 
                        title="Logistics Tracking" 
                        subtitle="Live supply chain tracking"
                        icon={Map} 
                        link="/analytics" 
                        linkText="Go to Track & Trace"
                        colorHex="#f59e0b" // amber-500
                        loading={loading}
                    >
                        {trackingCategories.length > 0 ? (
                            <MiniBarChart data={trackingCategories} colors={['#f59e0b', '#fbbf24', '#fcd34d']} />
                        ) : (
                            <div className="h-28 flex items-center justify-center text-xs text-gray-400">No active tracking categories</div>
                        )}
                        <div className="mt-auto">
                            <MetricRow label="Total Tracked Cost" value={`₹${(trackingData?.total_cost ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                            <MetricRow label="Tracked Invoices" value={trackingTotalInvoices.toLocaleString()} />
                        </div>
                    </ModuleCard>

                    {/* 5. Quality Management */}
                    <ModuleCard 
                        title="Quality Control" 
                        subtitle="Inspections and quality metrics"
                        icon={AlertCircle} 
                        link="/quality" 
                        linkText="Quality Dashboard"
                        colorHex="#ef4444" // red-500
                        loading={loading}
                    >
                        <MiniDonut data={qualityDonut} totalValue={qualityTotal} colors={['#ef4444', '#f97316', '#eab308']} />
                        <div className="mt-auto">
                            <MetricRow label="Recent Inspections" value={(qualityData?.recent_scans ?? 0).toLocaleString()} subtext="Within the last 7 days" />
                        </div>
                    </ModuleCard>

                    {/* 6. Devices & Monitoring */}
                    <ModuleCard 
                        title="Device Integrations" 
                        subtitle="IoT hardware monitoring"
                        icon={Smartphone} 
                        link="/app-management/integrate-devices" 
                        linkText="Manage Devices"
                        colorHex="#06b6d4" // cyan-500
                        loading={loading}
                    >
                        <MiniDonut data={deviceDonut} totalValue={devicesTotal} colors={['#06b6d4', '#94a3b8']} />
                        <div className="mt-auto">
                            <MetricRow label="Alerts & Warnings" value={(deviceData?.top_cards?.data_sync_alerts ?? 0).toLocaleString()} />
                        </div>
                    </ModuleCard>
                </div>
            </div>
        </div>
    )
}