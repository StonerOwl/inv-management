import React, { useState, useEffect, useCallback } from 'react';
import {
    Package, DollarSign, Layers, Search, RefreshCw,
    Loader2, ArrowUpRight, AlertCircle, CheckCircle,
    FileText, Hash, TrendingUp, BarChart3, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    listInventoryItems, listInvoices, getInvoiceAssignments, getPWSItems, getPOStats
} from '../api/client';

// ── Stat card (same pattern as DashboardPage) ──────────────────────────────

function StatCard({ icon: Icon, label, value, sub, loading }) {
    return (
        <div className="aiq-card p-5 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800">
                {loading
                    ? <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    : <Icon size={18} className="text-primary-600 dark:text-primary-400" />
                }
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
                {loading
                    ? <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
                    : <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{value}</p>
                }
                {sub && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ── Tiny status pill ───────────────────────────────────────────────────────

function StatusPill({ label, value, icon: Icon, loading }) {
    return (
        <div className="aiq-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-50 dark:bg-primary-900/20">
                <Icon size={16} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-black text-gray-900 dark:text-gray-100">
                    {loading ? <span className="inline-block h-6 w-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /> : value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">{label}</p>
            </div>
        </div>
    );
}

const PIE_FALLBACK = ['#64748b', '#94a3b8', '#cbd5e1'];

// ── Main ──────────────────────────────────────────────────────────────────

export default function DashboardInventory() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [invoices, setInvoices] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [poStats, setPoStats] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, invRes, assignRes, pwsRes, poRes] = await Promise.all([
                listInventoryItems({ limit: 500 }),
                listInvoices({ limit: 500 }),
                getInvoiceAssignments(),
                getPWSItems(),
                getPOStats().catch(() => ({ data: null })),
            ]);
            setItems(itemsRes.data.items || []);
            setTotal(itemsRes.data.total || 0);
            setInvoices(invRes.data.items || []);
            setAssignments(assignRes.data || []);
            setProjects((pwsRes.data || []).filter(i => i.type === 'project'));
            setPoStats(poRes.data);
        } catch (err) {
            console.error('DashboardInventory fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Derived numbers ──────────────────────────────────────────────────────

    const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
    const totalValue = items.reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0);
    const assignedCount = items.filter(i => i.project_assignments?.length > 0).length;

    const parsedCount = invoices.filter(i => i.status === 'processed' || i.status === 'needs_review').length;
    const registeredIds = new Set(assignments.map(a => a.invoice_id));
    const registeredCount = invoices.filter(i => registeredIds.has(i.id)).length;
    const unregisteredCount = invoices.length - registeredCount;

    // Bar chart — qty by project
    const projectQtyMap = {};
    items.forEach(item => {
        (item.project_assignments || []).forEach(a => {
            const proj = projects.find(p => p.id === a.project_id);
            const name = proj?.name || 'Unknown';
            projectQtyMap[name] = (projectQtyMap[name] || 0) + (parseFloat(item.quantity) || 0);
        });
    });


    const barData = Object.entries(projectQtyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, qty]) => ({
            name: name.length > 13 ? name.slice(0, 12) + '\u2026' : name,
            qty,
        }));

    // Pie chart — value by invoice source
    const sourceValueMap = {};
    items.forEach(item => {
        const src = item.source_file_name || 'Other';
        const short = src.length > 20 ? src.slice(0, 19) + '\u2026' : src;
        sourceValueMap[short] = (sourceValueMap[short] || 0) + (parseFloat(item.total_amount) || 0);
    });
    const pieData = Object.entries(sourceValueMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, value]) => ({ name, value: Math.round(value) }));
    const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

    // Recent items (last 8 by created_at)
    const recentItems = [...items]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-0 w-full">

            {/* Sticky header — matches DashboardPage pattern */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-5 sticky top-0 z-20 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Dashboard</p>
                <div className="flex items-end justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Inventory Summary</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchAll}
                            className="aiq-btn-ghost flex items-center gap-2 text-sm h-9 px-3"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button
                            onClick={() => navigate('/inventory/dashboard')}
                            className="aiq-btn-primary flex items-center gap-2 text-sm h-9 px-4"
                        >
                            <Package size={14} /> Manage Inventory
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8 px-6 py-8 pb-16">

                {/* ── Top stat cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={Hash}
                        label="Total Stock"
                        value={loading ? '\u2014' : Math.round(totalQty).toLocaleString()}
                        sub="All units combined"
                        loading={loading}
                    />
                    <StatCard
                        icon={Package}
                        label="Total Items"
                        value={loading ? '\u2014' : total.toLocaleString()}
                        sub="Active items"
                        loading={loading}
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Stock Value (Est.)"
                        value={loading ? '\u2014' : '\u20B9' + Math.round(totalValue).toLocaleString()}
                        sub="Estimated value"
                        loading={loading}
                    />
                    <StatCard
                        icon={Layers}
                        label="Invoice Sources"
                        value={loading ? '\u2014' : invoices.length.toLocaleString()}
                        sub={parsedCount + ' parsed successfully'}
                        loading={loading}
                    />
                </div>

                {/* ── Charts row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Bar — qty by project */}
                    <div className="aiq-card p-6 lg:col-span-2">
                        <div className="mb-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                Stock Distribution by Project
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                Unit quantity assigned to each project
                            </p>
                        </div>
                        {loading ? (
                            <div className="h-44 flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-primary-500" />
                            </div>
                        ) : barData.length === 0 ? (
                            <div className="h-44 flex flex-col items-center justify-center gap-3 text-center">
                                <BarChart3 size={28} className="text-gray-300 dark:text-gray-600" />
                                <p className="text-sm text-gray-400 italic">No project assignments yet</p>
                                <button
                                    onClick={() => navigate('/inventory/dashboard')}
                                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                >
                                    Register invoices to projects <ArrowUpRight size={11} />
                                </button>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={176}>
                                <BarChart data={barData} barSize={26}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={36}
                                    />
                                    <Tooltip
                                        formatter={(v) => [v.toLocaleString(), 'Qty']}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                        }}
                                    />
                                    <Bar dataKey="qty" radius={[4, 4, 0, 0]} className="fill-primary-500" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Pie — value by source */}
                    <div className="aiq-card p-6 flex flex-col">
                        <div className="mb-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                Value by Invoice Source
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                Estimated value split by file
                            </p>
                        </div>
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-primary-500" />
                            </div>
                        ) : pieData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                                No data yet
                            </div>
                        ) : (
                            <>
                                <div className="relative h-36 mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={62}
                                                paddingAngle={3}
                                                dataKey="value"
                                                strokeWidth={0}
                                            >
                                                {pieData.map((_, i) => (
                                                    <Cell
                                                        key={i}
                                                        className={i === 0 ? 'fill-primary-500' : undefined}
                                                        fill={i === 0 ? undefined : PIE_FALLBACK[i - 1] || '#e2e8f0'}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v) => ['\u20B9' + v.toLocaleString(), 'Value']}
                                                contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-base font-black text-gray-900 dark:text-gray-100">
                                            {'\u20B9'}{Math.round(pieTotal / 1000)}K
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400">Total</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 mt-auto">
                                    {pieData.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={i === 0 ? 'w-2 h-2 rounded-full shrink-0 bg-primary-500' : 'w-2 h-2 rounded-full shrink-0'}
                                                    style={i > 0 ? { backgroundColor: PIE_FALLBACK[i - 1] || '#e2e8f0' } : undefined}
                                                />
                                                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate">
                                                    {d.name}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100 shrink-0">
                                                {'\u20B9'}{d.value.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Status strip ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatusPill label="Assigned to Project" value={assignedCount} icon={CheckCircle} loading={loading} />
                    <StatusPill label="Total Purchase Orders" value={poStats?.total ?? '\u2014'} icon={ShoppingCart} loading={loading} />
                    <StatusPill label="Registered Invoices" value={registeredCount} icon={FileText} loading={loading} />
                    <StatusPill label="Pending Registration" value={unregisteredCount} icon={TrendingUp} loading={loading} />
                </div>

                {/* ── Recent items ── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recently Added Items</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Last {recentItems.length} items extracted from invoices
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/inventory/dashboard')}
                            className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                        >
                            View all {total} items <ArrowUpRight size={12} />
                        </button>
                    </div>

                    <div className="aiq-card overflow-hidden relative min-h-[120px]">
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={26} />
                            </div>
                        )}

                        {recentItems.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Package size={22} className="text-gray-400" />
                                </div>
                                <p className="font-semibold text-gray-500 dark:text-gray-400">No inventory items yet</p>
                                <p className="text-xs text-gray-400">Upload and register invoices to populate your inventory</p>
                                <button
                                    onClick={() => navigate('/inventory/dashboard')}
                                    className="aiq-btn-primary text-sm mt-1 flex items-center gap-2"
                                >
                                    <FileText size={14} /> Go to Inventory
                                </button>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                                    <tr>
                                        <th className="py-3 px-5">Item Name</th>
                                        <th className="py-3 px-5">Invoice Source</th>
                                        <th className="py-3 px-5">Added</th>
                                        <th className="py-3 px-5">Qty</th>
                                        <th className="py-3 px-5">Value</th>
                                        <th className="py-3 px-5">Project</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm text-gray-800 dark:text-gray-200">
                                    {recentItems.map(item => {
                                        const assignedProjects = (item.project_assignments || []).map(a => {
                                            const p = projects.find(proj => proj.id === a.project_id);
                                            return p?.name || a.project_id;
                                        });

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-md bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                                                            <Package size={13} className="text-primary-600 dark:text-primary-400" />
                                                        </div>
                                                        <span className="font-semibold truncate max-w-[160px]" title={item.item_name}>
                                                            {item.item_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[160px]" title={item.source_file_name}>
                                                        {item.source_file_name || '\u2014'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {item.created_at
                                                        ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                                                        : '\u2014'}
                                                </td>
                                                <td className="py-3.5 px-5 font-bold">{item.quantity || 0}</td>
                                                <td className="py-3.5 px-5 font-semibold">
                                                    {item.total_amount
                                                        ? '\u20B9' + Number(item.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
                                                        : '\u2014'}
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    {assignedProjects.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {assignedProjects.map((name, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800 truncate max-w-[110px]"
                                                                    title={name}
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {recentItems.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    Showing {recentItems.length} most recent of {total} total items
                                </span>
                                <button
                                    onClick={() => navigate('/inventory/dashboard')}
                                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                                >
                                    Manage all inventory <ArrowUpRight size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}