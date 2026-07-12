import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ScrollText, AlertTriangle, Bell, Search, RefreshCw, Loader2,
    ChevronLeft, ChevronRight, Plus, Trash2, Mail, X, Check,
    MonitorSmartphone, Wifi, WifiOff, HeartPulse, Thermometer, Droplet,
    BatteryMedium, Gauge, ExternalLink, Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import {
    getLogs, getLogCategories, getAlerts,
    getNotificationEventTypes, getNotificationRecipients,
    createNotificationRecipient, updateNotificationRecipient, deleteNotificationRecipient,
    getNotificationHistory,
    getDevices, getDeviceStats,
} from '../api/client';

const PAGE_SIZE = 25;

// ─── shared bits ──────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    const cls = {
        info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        error: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    }[severity] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    return <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide border uppercase', cls)}>{severity}</span>;
}

function CategoryChip({ category }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full border bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800 capitalize">
            {category}
        </span>
    );
}

function fmtTimestamp(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function Pagination({ page, setPage, total, pageSize = PAGE_SIZE }) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">PAGE {page + 1} OF {totalPages}</span>
            <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

function PageHeader({ icon: Icon, title, count, right }) {
    return (
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Icon size={28} className="text-primary-600 dark:text-primary-400" /> {title}
                </h1>
                <div className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-2 flex items-center gap-4">
                    <span>&gt; MONITORING · RECORDS [{count ?? 0}]</span>
                    <div className="w-32 h-[1px] bg-primary-500"></div>
                </div>
            </div>
            {right}
        </div>
    );
}

// ─── Logs page ────────────────────────────────────────────────────────────────
export function MonitoringLogs() {
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getLogs({
                skip: page * PAGE_SIZE,
                limit: PAGE_SIZE,
                search: search || undefined,
                category: category || undefined,
            });
            setItems(data.items || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, search, category]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { setPage(0); }, [search, category]);
    useEffect(() => {
        getLogCategories().then(({ data }) => setCategories(data || [])).catch(() => { });
    }, []);

    return (
        <div className="max-w-7xl mx-auto w-full pb-20">
            <PageHeader
                icon={ScrollText}
                title="Logs"
                count={total}
                right={
                    <button onClick={fetchLogs} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                }
            />

            <div className="flex flex-wrap gap-4 mb-8">
                <div className="relative flex-1 min-w-48">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 dark:text-primary-400" />
                    <input
                        className="aiq-input w-full pl-10"
                        placeholder="Search action, entity, description, user..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="aiq-input w-48 appearance-none cursor-pointer font-bold capitalize"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    <option value="">ALL CATEGORIES</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="aiq-card relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['TIMESTAMP', 'ACTION', 'CATEGORY', 'ENTITY', 'DESCRIPTION', 'USER', 'SEVERITY'].map(h => (
                                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold">
                                        <ScrollText size={48} className="mx-auto mb-4 opacity-20" />
                                        NO ACTIVITY LOGGED YET.
                                    </td>
                                </tr>
                            ) : (
                                items.map((log, idx) => (
                                    <tr
                                        key={log.id}
                                        className={clsx(
                                            'border-b border-gray-100 dark:border-gray-800 transition-colors',
                                            idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                                        )}
                                    >
                                        <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono">{fmtTimestamp(log.timestamp)}</td>
                                        <td className="py-3.5 px-4 text-xs font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{log.action}</td>
                                        <td className="py-3.5 px-4"><CategoryChip category={log.category} /></td>
                                        <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 max-w-[180px]">
                                            <span className="truncate block">{log.entity_name || '—'}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 max-w-sm">
                                            <span className="truncate block">{log.description || '—'}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300">{log.username || 'system'}</td>
                                        <td className="py-3.5 px-4"><SeverityBadge severity={log.severity} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination page={page} setPage={setPage} total={total} />
            </div>
        </div>
    );
}

// ─── Alerts page ────────────────────────────────────────────────────────────────
export function MonitoringAlerts() {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getAlerts({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
            setItems(data.items || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    return (
        <div className="max-w-7xl mx-auto w-full pb-20">
            <PageHeader
                icon={AlertTriangle}
                title="Alerts"
                count={total}
                right={
                    <button onClick={fetchAlerts} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                }
            />

            <div className="aiq-card relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
                    </div>
                )}
                {items.length === 0 ? (
                    <div className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold">
                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-20" />
                        NO ALERTS — EVERYTHING LOOKS NORMAL.
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map(alert => (
                            <div key={alert.id} className="flex items-start gap-4 px-6 py-4">
                                <div className={clsx(
                                    'mt-0.5 p-2 rounded-lg shrink-0',
                                    alert.severity === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                )}>
                                    <AlertTriangle size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{alert.action}</span>
                                        <CategoryChip category={alert.category} />
                                        <SeverityBadge severity={alert.severity} />
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300">{alert.description || alert.entity_name || '—'}</p>
                                </div>
                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap mt-1">{fmtTimestamp(alert.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                )}
                <Pagination page={page} setPage={setPage} total={total} />
            </div>
        </div>
    );
}

// ─── Devices page ─────────────────────────────────────────────────────────────
// Fleet-level health view of every device registered in Project > Integrate
// Devices. Read-only monitoring surface — use "Manage Devices" to add/edit/
// remove devices, this just watches them.

const REFRESH_INTERVAL_MS = 30000;

function deviceSeverity(d) {
    if (d.status === 'Offline') return 'error';
    if (d.calibration_due_days != null && d.calibration_due_days <= 7) return 'error';
    if (d.power_battery != null && d.power_battery < 20) return 'error';
    if (d.signal_quality != null && d.signal_quality < 60) return 'warning';
    if (d.device_health != null && d.device_health < 60) return 'warning';
    if (d.calibration_due_days != null && d.calibration_due_days <= 30) return 'warning';
    return 'success';
}

function MetricTile({ icon: Icon, title, value, label, labelColor }) {
    return (
        <div className="aiq-card flex flex-col items-center justify-center text-center gap-1 py-4 px-2">
            <Icon size={18} className="text-primary-500 dark:text-primary-400 mb-1" />
            <span className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-none">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</span>
            {label && <span className={clsx('text-[10px] font-bold', labelColor)}>{label}</span>}
        </div>
    );
}

function DeviceStatusBadge({ status }) {
    const online = status === 'Online';
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide',
            online
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
        )}>
            {online ? <Wifi size={10} /> : <WifiOff size={10} />} {status}
        </span>
    );
}

export function MonitoringDevices() {
    const [devices, setDevices] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [devicesRes, statsRes] = await Promise.all([getDevices(), getDeviceStats()]);
            setDevices(devicesRes.data || []);
            setStats(statsRes.data || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    const categories = [...new Set(devices.map(d => d.category).filter(Boolean))];

    const filtered = devices.filter(d => {
        if (category && d.category !== category) return false;
        if (status && d.status !== status) return false;
        if (search) {
            const haystack = `${d.name} ${d.linked_process || ''} ${d.subtype || ''}`.toLowerCase();
            if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto w-full pb-20">
            <PageHeader
                icon={MonitorSmartphone}
                title="Devices"
                count={devices.length}
                right={
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Link to="/app-management/integrate-devices" className="aiq-btn px-4 py-2.5 flex items-center gap-2 text-xs">
                            <Wrench size={14} /> MANAGE DEVICES
                        </Link>
                    </div>
                }
            />

            {stats && stats.top_cards.total_devices > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <MetricTile icon={Gauge} title="Signal" value={`${stats.monitoring.signal_quality.value}%`} label={stats.monitoring.signal_quality.label} labelColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricTile icon={HeartPulse} title="Health" value={`${stats.monitoring.device_health.value}%`} label={stats.monitoring.device_health.label} labelColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricTile icon={Thermometer} title="Temp" value={`${stats.monitoring.temperature.value}°C`} label={stats.monitoring.temperature.label} labelColor="text-blue-600 dark:text-blue-400" />
                    <MetricTile icon={Droplet} title="Humidity" value={`${stats.monitoring.humidity.value}%`} label={stats.monitoring.humidity.label} labelColor="text-blue-600 dark:text-blue-400" />
                    <MetricTile icon={BatteryMedium} title="Battery" value={`${stats.monitoring.power_battery.value}%`} label={stats.monitoring.power_battery.label} labelColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricTile icon={Wifi} title="Uptime" value={`${stats.monitoring.uptime.value}%`} label={stats.monitoring.uptime.label} labelColor="text-gray-500 dark:text-gray-400" />
                </div>
            )}

            {stats && stats.alerts.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-8">
                    {stats.alerts.map((a, i) => (
                        <span key={i} className={clsx(
                            'inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border',
                            a.severity === 'High'
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        )}>
                            <AlertTriangle size={13} /> {a.count} · {a.type}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-4 mb-8">
                <div className="relative flex-1 min-w-48">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 dark:text-primary-400" />
                    <input
                        className="aiq-input w-full pl-10"
                        placeholder="Search device, linked process, subtype..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="aiq-input w-48 appearance-none cursor-pointer font-bold" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">ALL CATEGORIES</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="aiq-input w-40 appearance-none cursor-pointer font-bold" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">ALL STATUSES</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                </select>
            </div>

            <div className="aiq-card relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['DEVICE', 'CATEGORY', 'STATUS', 'SIGNAL', 'HEALTH', 'BATTERY', 'CALIBRATION', 'LAST SYNC', ''].map(h => (
                                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-20 text-gray-800 dark:text-gray-200 font-bold">
                                        <MonitorSmartphone size={48} className="mx-auto mb-4 opacity-20" />
                                        {devices.length === 0 ? 'NO DEVICES REGISTERED YET.' : 'NO DEVICES MATCH YOUR FILTERS.'}
                                        {devices.length === 0 && (
                                            <div className="mt-4">
                                                <Link to="/app-management/integrate-devices" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1">
                                                    Add a device in Integrate Devices <ExternalLink size={12} />
                                                </Link>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((d, idx) => {
                                    const sev = deviceSeverity(d);
                                    return (
                                        <tr
                                            key={d.id}
                                            className={clsx(
                                                'border-b border-gray-100 dark:border-gray-800 transition-colors',
                                                idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                                            )}
                                        >
                                            <td className="py-3.5 px-4 text-xs font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx(
                                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                                        sev === 'error' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                                    )} />
                                                    {d.name}
                                                </div>
                                                {d.linked_process && <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 pl-3.5">{d.linked_process}</div>}
                                            </td>
                                            <td className="py-3.5 px-4"><CategoryChip category={d.category} /></td>
                                            <td className="py-3.5 px-4"><DeviceStatusBadge status={d.status} /></td>
                                            <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">{d.signal_quality != null ? `${d.signal_quality}%` : '—'}</td>
                                            <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">{d.device_health != null ? `${d.device_health}%` : '—'}</td>
                                            <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">{d.power_battery != null ? `${d.power_battery}%` : '—'}</td>
                                            <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {d.calibration_due_days != null ? `Due in ${d.calibration_due_days}d` : '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.last_sync_mins_ago != null ? `${d.last_sync_mins_ago} min ago` : '—'}</td>
                                            <td className="py-3.5 px-4"><SeverityBadge severity={sev} /></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Notifications page ──────────────────────────────────────────────────────
function AddRecipientModal({ eventTypes, onClose, onCreated }) {
    const [email, setEmail] = useState('');
    const [label, setLabel] = useState('');
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggleEvent = (key) => {
        setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const handleSave = async () => {
        if (!email.trim()) { setError('Email is required'); return; }
        setSaving(true);
        setError('');
        try {
            const { data } = await createNotificationRecipient({
                email: email.trim(),
                label: label.trim() || null,
                active: true,
                subscribed_events: selected,
            });
            onCreated(data);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.detail || 'Failed to add recipient');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Add Notification Recipient</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Email address</label>
                        <input className="aiq-input w-full" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Label (optional)</label>
                        <input className="aiq-input w-full" placeholder="e.g. Plant Manager" value={label} onChange={e => setLabel(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">Notify on</label>
                        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                            {eventTypes.map(evt => (
                                <label key={evt.key} className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(evt.key)}
                                        onChange={() => toggleEvent(evt.key)}
                                        className="w-4 h-4 rounded accent-primary-600"
                                    />
                                    {evt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                    <div className="flex gap-3 mt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 aiq-btn py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RecipientRow({ recipient, eventTypes, onToggleActive, onDelete }) {
    const eventLabels = (recipient.subscribed_events || [])
        .map(key => eventTypes.find(e => e.key === key)?.label || key);

    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg shrink-0">
                    <Mail size={16} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {recipient.email} {recipient.label && <span className="text-gray-400 dark:text-gray-500 font-semibold">· {recipient.label}</span>}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {eventLabels.length === 0 ? (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">No events selected</span>
                        ) : eventLabels.map(l => (
                            <span key={l} className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">{l}</span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={() => onToggleActive(recipient)}
                    className={clsx(
                        'text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors',
                        recipient.active
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    )}
                >
                    {recipient.active ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => onDelete(recipient.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

export function MonitoringNotifications() {
    const [recipients, setRecipients] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [recipRes, eventRes, histRes] = await Promise.all([
                getNotificationRecipients(),
                getNotificationEventTypes(),
                getNotificationHistory({ limit: 20 }),
            ]);
            setRecipients(recipRes.data || []);
            setEventTypes(eventRes.data || []);
            setHistory(histRes.data.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleToggleActive = async (recipient) => {
        try {
            const { data } = await updateNotificationRecipient(recipient.id, { active: !recipient.active });
            setRecipients(prev => prev.map(r => r.id === data.id ? data : r));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNotificationRecipient(id);
            setRecipients(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full pb-20">
            <PageHeader
                icon={Bell}
                title="Notifications"
                count={recipients.length}
                right={
                    <button onClick={() => setShowAddModal(true)} className="aiq-btn px-4 py-2.5 flex items-center gap-2 text-xs">
                        <Plus size={14} /> ADD RECIPIENT
                    </button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 aiq-card relative overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Email Recipients</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose which events send an email to whom.</p>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={28} />
                        </div>
                    ) : recipients.length === 0 ? (
                        <div className="text-center py-16 text-gray-800 dark:text-gray-200 font-bold">
                            <Bell size={40} className="mx-auto mb-3 opacity-20" />
                            NO RECIPIENTS CONFIGURED YET.
                        </div>
                    ) : (
                        <div>
                            {recipients.map(r => (
                                <RecipientRow
                                    key={r.id}
                                    recipient={r}
                                    eventTypes={eventTypes}
                                    onToggleActive={handleToggleActive}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="aiq-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Recent Sends</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 20 notification attempts.</p>
                    </div>
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-xs text-gray-400 dark:text-gray-500 font-semibold">Nothing sent yet.</div>
                    ) : (
                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] overflow-y-auto">
                            {history.map(h => (
                                <div key={h.id} className="px-5 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{h.recipient_email}</span>
                                        <span className={clsx(
                                            'text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0',
                                            h.status === 'sent' && 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                                            h.status === 'failed' && 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
                                            h.status === 'skipped' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                                        )}>{h.status}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">{h.subject}</p>
                                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1">{fmtTimestamp(h.sent_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <AddRecipientModal
                    eventTypes={eventTypes}
                    onClose={() => setShowAddModal(false)}
                    onCreated={(r) => setRecipients(prev => [r, ...prev])}
                />
            )}
        </div>
    );
}