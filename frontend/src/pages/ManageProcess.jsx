import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Settings2, Activity, Cpu, FileText, AlertTriangle,
    AlertCircle, Loader2, Search, ChevronDown, RefreshCw,
    CheckCircle, XCircle, Clock, Wifi, WifiOff,
    FolderOpen, GitBranch, GitCommit, Tag, CircleDot,
    BarChart3, Shield, Bell,
    ShieldCheck, Plus, Trash2, Save,
    Edit2, X, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import {
    getPWSItems, getPWSAssignments,
    getDevices, listQualityNotes, getAlerts, getLogs,
    updatePWSItem
} from '../api/client';

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */

function formatRelativeTime(ts) {
    if (!ts) return '—';
    const diffMs = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function isToday(ts) {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

function SeverityBadge({ severity }) {
    const map = {
        High: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        Medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        Low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    return (
        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider', map[severity] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>
            {severity}
        </span>
    );
}

function StatusBadge({ active }) {
    return active ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CircleDot size={8} /> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            <CheckCircle size={8} /> Completed
        </span>
    );
}

/* ── Stat Card ────────────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, subtitle, colorClass }) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 min-w-0">
            <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mt-1 truncate">{label}</p>
                {subtitle && <p className="text-[10px] text-slate-600 dark:text-slate-200 truncate">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ── Compact dropdown ─────────────────────────────────────────────────────── */

const inputCls = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-600 transition-colors rounded-lg'

function Field({ label, children }) {
  return (
    <label className="block w-full">
      <div className="flex items-center justify-between mb-1.5 w-full">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 w-full">
          {label}
        </div>
      </div>
      {children}
    </label>
  )
}

function FilterSelect({ value, onChange, options, placeholder, disabled, icon: Icon }) {
    return (
        <div className="relative">
            {Icon && <Icon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />}
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className={clsx(
                    'w-full appearance-none pr-7 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
                    'hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
                    Icon ? 'pl-7' : 'pl-2.5',
                    disabled && 'opacity-40 cursor-not-allowed'
                )}
            >
                <option value="">{placeholder}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-600" />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */

export default function ManageProcess() {
    /* ── Loading / error state ──────────────────────────────────────────── */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ── Raw data ───────────────────────────────────────────────────────── */
    const [items, setItems] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [devices, setDevices] = useState([]);
    const [qualityNotes, setQualityNotes] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [logs, setLogs] = useState([]);

    /* ── UI state ───────────────────────────────────────────────────────── */
    const [selectedProcessId, setSelectedProcessId] = useState(null);
    const [filterWorkflow, setFilterWorkflow] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    /* ── Edit Process State ───────────────────────────────────────── */
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editAllowedImageTypes, setEditAllowedImageTypes] = useState([]);
    const [savingDetails, setSavingDetails] = useState(false);

    useEffect(() => {
        const selectedProcess = items.find(i => i.id === selectedProcessId);
        if (selectedProcess) {
            setIsEditingDetails(false);
            setEditName(selectedProcess.name || '');
            setEditDescription(selectedProcess.description || '');
            setEditAllowedImageTypes(selectedProcess.allowed_image_types || []);
        }
    }, [selectedProcessId, items]);

    const handleSaveDetails = async () => {
        const selectedProcess = items.find(i => i.id === selectedProcessId);
        if (!selectedProcess) return;
        setSavingDetails(true);
        try {
            const { data } = await updatePWSItem(selectedProcess.id, {
                type: 'process',
                name: editName.trim(),
                description: editDescription.trim() || null,
                allowed_image_types: editAllowedImageTypes
            });
            setItems(prev => prev.map(item => item.id === selectedProcess.id ? data : item));
            setIsEditingDetails(false);
        } catch (e) {
            console.error(e);
            alert("Failed to save details");
        } finally {
            setSavingDetails(false);
        }
    };

    const toggleImageTypeProcess = (typeId) => {
        setEditAllowedImageTypes(prev =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    /* ── Data fetching ─────────────────────────────────────────────────── */
    const fetchData = useCallback(async () => {
        try {
            const [itemsRes, assignRes, devRes, qnRes, alertRes, logRes] = await Promise.all([
                getPWSItems(),
                getPWSAssignments(),
                getDevices(),
                listQualityNotes(),
                getAlerts({ limit: 200 }),
                getLogs({ limit: 200 }),
            ]);
            setItems(itemsRes.data || []);
            setAssignments(assignRes.data || []);
            setDevices(devRes.data || []);
            setQualityNotes(qnRes.data || []);
            setAlerts((alertRes.data?.items) || alertRes.data || []);
            setLogs((logRes.data?.items) || logRes.data || []);
        } catch (e) {
            setError('Failed to load data. Please refresh.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    /* ── Build hierarchy maps ──────────────────────────────────────────── */
    const {
        processes, projects, workflows, stages,
        processToStage, stageToWorkflow, workflowToProject,
        processParents, // { processId: { project, workflow, stage } }
        allWorkflowOptions, allStageOptions,
    } = useMemo(() => {
        const byType = (t) => items.filter(i => i.type === t);
        const _projects = byType('project');
        const _workflows = byType('workflow');
        const _stages = byType('stage');
        const _processes = byType('process');

        // parent→child maps
        const _processToStage = {};
        const _stageToWorkflow = {};
        const _workflowToProject = {};

        assignments.forEach(a => {
            const parent = items.find(i => i.id === a.parent_id);
            const child = items.find(i => i.id === a.child_id);
            if (!parent || !child) return;
            if (parent.type === 'project' && child.type === 'workflow') _workflowToProject[child.id] = parent;
            if (parent.type === 'workflow' && child.type === 'stage') _stageToWorkflow[child.id] = parent;
            if (parent.type === 'stage' && child.type === 'process') _processToStage[child.id] = parent;
        });

        const _processParents = {};
        _processes.forEach(proc => {
            const stage = _processToStage[proc.id];
            const workflow = stage ? _stageToWorkflow[stage.id] : null;
            const project = workflow ? _workflowToProject[workflow.id] : null;
            _processParents[proc.id] = { project, workflow, stage };
        });

        const _allWorkflowOptions = _workflows.map(w => ({ value: w.id, label: w.name }));
        const _allStageOptions = _stages.map(s => ({ value: s.id, label: s.name }));

        return {
            processes: _processes,
            projects: _projects,
            workflows: _workflows,
            stages: _stages,
            processToStage: _processToStage,
            stageToWorkflow: _stageToWorkflow,
            workflowToProject: _workflowToProject,
            processParents: _processParents,
            allWorkflowOptions: _allWorkflowOptions,
            allStageOptions: _allStageOptions,
        };
    }, [items, assignments]);

    /* ── Device / QN / Alert matching helpers ─────────────────────────── */
    const devicesForProcess = useCallback((proc) => {
        if (!proc) return [];
        return devices.filter(d => {
            if (!d.linked_process) return false;
            const lp = d.linked_process.toLowerCase();
            return lp.includes(proc.name.toLowerCase()) || lp.includes(proc.id.toLowerCase());
        });
    }, [devices]);

    const qualityNotesForProcess = useCallback((proc) => {
        if (!proc) return [];
        return qualityNotes.filter(qn => {
            if (!qn.process) return false;
            return qn.process.toLowerCase() === proc.name.toLowerCase();
        });
    }, [qualityNotes]);

    const alertsForProcess = useCallback((proc) => {
        if (!proc) return [];
        return alerts.filter(a => {
            const nameMatch = a.entity_name && a.entity_name.toLowerCase().includes(proc.name.toLowerCase());
            const descMatch = a.description && a.description.toLowerCase().includes(proc.name.toLowerCase());
            return nameMatch || descMatch;
        });
    }, [alerts]);

    /* ── Filtered process list ────────────────────────────────────────── */
    const filteredProcesses = useMemo(() => {
        return processes.filter(proc => {
            const parents = processParents[proc.id] || {};

            // Workflow filter
            if (filterWorkflow && (!parents.workflow || parents.workflow.id !== filterWorkflow)) return false;
            // Stage filter
            if (filterStage && (!parents.stage || parents.stage.id !== filterStage)) return false;
            // Status filter
            if (filterStatus === 'active' && proc.completed) return false;
            if (filterStatus === 'completed' && !proc.completed) return false;
            // Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const projectName = parents.project?.name?.toLowerCase() || '';
                return proc.name.toLowerCase().includes(q) || projectName.includes(q);
            }
            return true;
        });
    }, [processes, processParents, filterWorkflow, filterStage, filterStatus, searchQuery]);

    /* ── Selected process data ────────────────────────────────────────── */
    const selectedProcess = items.find(i => i.id === selectedProcessId);
    const selectedParents = selectedProcessId ? (processParents[selectedProcessId] || {}) : {};
    const selectedDevices = selectedProcess ? devicesForProcess(selectedProcess) : [];
    const selectedQNotes = selectedProcess ? qualityNotesForProcess(selectedProcess) : [];
    const selectedAlerts = selectedProcess ? alertsForProcess(selectedProcess) : [];
    const selectedLogs = useMemo(() => {
        if (!selectedProcess) return [];
        return logs.filter(l => {
            const nameMatch = l.entity_name && l.entity_name.toLowerCase().includes(selectedProcess.name.toLowerCase());
            const descMatch = l.description && l.description.toLowerCase().includes(selectedProcess.name.toLowerCase());
            return nameMatch || descMatch;
        }).slice(0, 20);
    }, [selectedProcess, logs]);

    /* ── Summary counts ───────────────────────────────────────────────── */
    const totalProcesses = processes.length;
    const activeProcesses = processes.filter(p => !p.completed).length;
    const totalDevices = devices.length;
    const totalQualityNotes = qualityNotes.length;
    const openAlerts = alerts.length;

    /* ── Monitoring stats for selected process ────────────────────────── */
    const monitoringStats = useMemo(() => {
        if (!selectedProcess) return null;
        const procAlerts = selectedAlerts;
        const hasErrors = procAlerts.some(a => a.severity === 'error');
        const hasWarnings = procAlerts.some(a => a.severity === 'warning');
        const overallStatus = hasErrors ? 'Error' : hasWarnings ? 'Warning' : 'Healthy';

        const samplesToday = selectedQNotes.filter(qn => isToday(qn.created_at)).length;
        const resolved = selectedQNotes.filter(qn => qn.status === 'Resolved').length;
        const passRate = selectedQNotes.length > 0 ? Math.round((resolved / selectedQNotes.length) * 100) : 100;
        const devicesOnline = selectedDevices.filter(d => d.status === 'Online').length;

        return { overallStatus, samplesToday, passRate, devicesOnline };
    }, [selectedProcess, selectedAlerts, selectedQNotes, selectedDevices]);

    /* ── Render: Loading ──────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-slate-600">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-semibold">Loading process data…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle size={18} />
                <span className="text-sm font-bold">{error}</span>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /*  RENDER                                                          */
    /* ══════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 -m-8 p-8">
            <div className="max-w-[1600px] mx-auto w-full pb-20">
                {/* ── Header ── */}
                <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Manage Process
                    </h1>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        Overview of all configured processes, devices, quality notes, and alerts.
                    </p>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard icon={Settings2} label="Total Processes" value={totalProcesses} subtitle="All configured processes" colorClass="bg-indigo-500" />
                    <StatCard icon={CheckCircle} label="Active Processes" value={activeProcesses} subtitle={`${totalProcesses > 0 ? Math.round((activeProcesses / totalProcesses) * 100) : 0}% of total`} colorClass="bg-emerald-500" />
                    <StatCard icon={Cpu} label="Devices Integrated" value={totalDevices} subtitle="Across all processes" colorClass="bg-sky-500" />
                    <StatCard icon={FileText} label="Quality Notes" value={totalQualityNotes} subtitle="Notes logged" colorClass="bg-amber-500" />
                    <StatCard icon={AlertTriangle} label="Open Alerts" value={openAlerts} subtitle="Across processes" colorClass="bg-red-500" />
                </div>

                {/* ── Three-Panel Row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* ═══ Panel A: Process List ═══ */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col max-h-[700px]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3">Process List</h2>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <FilterSelect value={filterWorkflow} onChange={setFilterWorkflow} options={allWorkflowOptions} placeholder="All Workflows" icon={GitBranch} />
                                <FilterSelect value={filterStage} onChange={setFilterStage} options={allStageOptions} placeholder="All Stages" icon={GitCommit} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <FilterSelect
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                    options={[{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]}
                                    placeholder="All Status"
                                    icon={Tag}
                                />
                                <div className="relative">
                                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search…"
                                        className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700">
                            <span className="col-span-4">Process</span>
                            <span className="col-span-3">Project</span>
                            <span className="col-span-1 text-center">Dev</span>
                            <span className="col-span-2 text-center">Status</span>
                            <span className="col-span-2 text-center">Alerts</span>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredProcesses.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-600">
                                    <Settings2 size={24} className="mx-auto mb-2 opacity-40" />
                                    No processes found
                                </div>
                            ) : (
                                filteredProcesses.map(proc => {
                                    const parents = processParents[proc.id] || {};
                                    const devCount = devicesForProcess(proc).length;
                                    const alertCount = alertsForProcess(proc).length;
                                    const isSelected = selectedProcessId === proc.id;

                                    return (
                                        <button
                                            key={proc.id}
                                            onClick={() => setSelectedProcessId(proc.id)}
                                            className={clsx(
                                                'w-full grid grid-cols-12 gap-1 px-4 py-2.5 text-left transition-colors border-b border-slate-50 dark:border-slate-700/50',
                                                isSelected
                                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-500'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border-l-2 border-l-transparent'
                                            )}
                                        >
                                            <span className={clsx('col-span-4 text-xs font-bold truncate', isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200')}>
                                                {proc.name}
                                            </span>
                                            <span className="col-span-3 text-[11px] text-slate-700 dark:text-slate-300 truncate">
                                                {parents.project?.name || '—'}
                                            </span>
                                            <span className="col-span-1 text-[11px] text-slate-600 dark:text-slate-300 text-center font-semibold">
                                                {devCount}
                                            </span>
                                            <span className="col-span-2 flex justify-center">
                                                <StatusBadge active={!proc.completed} />
                                            </span>
                                            <span className="col-span-2 text-center">
                                                {alertCount > 0 ? (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                        <AlertTriangle size={9} /> {alertCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">0</span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-600 font-semibold">
                            Showing {filteredProcesses.length} of {processes.length} processes
                        </div>
                    </div>

                    {/* ═══ Panel B: Process Details ═══ */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col max-h-[700px]">
                        {!selectedProcess ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-8">
                                <Settings2 size={32} className="opacity-40" />
                                <p className="text-sm font-semibold">Select a process to view details</p>
                            </div>
                        ) : isEditingDetails ? (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <Edit2 size={16} className="text-primary-500" /> Edit Process Details
                                    </h2>
                                    <button onClick={() => setIsEditingDetails(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <Field label="Process Name">
                                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Description">
                                        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className={clsx(inputCls, "resize-none")} placeholder="Process details or instructions..."/>
                                    </Field>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                            Allowed Image Types
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'item', label: 'Item Image' },
                                                { id: 'machine', label: 'Machine View' },
                                                { id: 'defect', label: 'Defect Zoom' },
                                                { id: 'wide', label: 'Wide Angle' },
                                                { id: 'receipt', label: 'Receipt/Doc' }
                                            ].map(type => (
                                                <label key={type.id} className={clsx('flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors', editAllowedImageTypes.includes(type.id) ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300')}>
                                                    <input type="checkbox" checked={editAllowedImageTypes.includes(type.id)} onChange={() => toggleImageTypeProcess(type.id)} className="w-3.5 h-3.5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"/>
                                                    <ImageIcon size={12} className={editAllowedImageTypes.includes(type.id) ? "text-primary-500" : "text-slate-400"} />
                                                    <span className="text-[10px] font-bold">{type.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end gap-2">
                                    <button onClick={() => setIsEditingDetails(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                                    <button onClick={handleSaveDetails} disabled={savingDetails} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                        {savingDetails ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Details header */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Process Details</h2>
                                        <p className="text-[10px] text-slate-600 mt-0.5">Selected: {selectedProcess.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsEditingDetails(true)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors" title="Edit Process">
                                            <Edit2 size={14} />
                                        </button>
                                        <StatusBadge active={!selectedProcess.completed} />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                                    {/* Info grid */}
                                    <div className="space-y-2">
                                        {[
                                            { icon: FolderOpen, label: 'Project', value: selectedParents.project?.name },
                                            { icon: GitBranch, label: 'Workflow', value: selectedParents.workflow?.name },
                                            { icon: GitCommit, label: 'Stage', value: selectedParents.stage?.name },
                                            { icon: Tag, label: 'Industry / Category', value: selectedParents.project?.category },
                                            { icon: Clock, label: 'Created', value: selectedProcess.created_at ? new Date(selectedProcess.created_at).toLocaleDateString() : '—' },
                                        ].map(({ icon: I, label, value }) => (
                                            <div key={label} className="flex items-center gap-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                                                <I size={13} className="text-slate-600 shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 w-24 shrink-0">{label}</span>
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{value || '—'}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Devices Integrated */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Cpu size={13} className="text-sky-500" /> Devices Integrated
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-[10px] font-black">
                                                {selectedDevices.length}
                                            </span>
                                        </div>
                                        {selectedDevices.length === 0 ? (
                                            <p className="text-[11px] text-slate-600 italic">No devices linked to this process</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                                                {selectedDevices.map(dev => (
                                                    <div key={dev.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                        <div className={clsx('w-2 h-2 rounded-full shrink-0', dev.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400')} />
                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate flex-1">{dev.name}</span>
                                                        <span className="text-[9px] font-semibold text-slate-600 uppercase">{dev.category?.split(' ')[0]}</span>
                                                        <span className="text-[9px] text-slate-600">{dev.interface}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quality Notes */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <FileText size={13} className="text-amber-500" /> Quality Notes
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                                                {selectedQNotes.length}
                                            </span>
                                        </div>
                                        {selectedQNotes.length === 0 ? (
                                            <p className="text-[11px] text-slate-600 italic">No quality notes for this process</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                                                {selectedQNotes.slice(0, 10).map(qn => (
                                                    <div key={qn.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{qn.note_type}</span>
                                                            <SeverityBadge severity={qn.severity} />
                                                            <span className={clsx(
                                                                'px-1.5 py-0.5 rounded text-[9px] font-bold',
                                                                qn.status === 'Resolved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                                                                    qn.status === 'Open' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                                        'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                                                            )}>
                                                                {qn.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-700 dark:text-slate-300 line-clamp-2">{qn.observation}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ═══ Panel C: Process Monitoring ═══ */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col max-h-[700px]">
                        {!selectedProcess ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-8">
                                <BarChart3 size={32} className="opacity-40" />
                                <p className="text-sm font-semibold">Select a process to monitor</p>
                            </div>
                        ) : (
                            <>
                                {/* Monitoring header */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Process Monitoring</h2>
                                    <button
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        className={clsx(
                                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border',
                                            autoRefresh
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                                        )}
                                    >
                                        <RefreshCw size={10} className={autoRefresh ? 'animate-spin' : ''} />
                                        Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                                    {/* Monitoring stat cards */}
                                    {monitoringStats && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Overall Status */}
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Overall Status</p>
                                                <div className="flex items-center gap-2">
                                                    {monitoringStats.overallStatus === 'Healthy' && <CheckCircle size={18} className="text-emerald-500" />}
                                                    {monitoringStats.overallStatus === 'Warning' && <AlertTriangle size={18} className="text-amber-500" />}
                                                    {monitoringStats.overallStatus === 'Error' && <XCircle size={18} className="text-red-500" />}
                                                    <span className={clsx('text-sm font-black', {
                                                        'text-emerald-600 dark:text-emerald-400': monitoringStats.overallStatus === 'Healthy',
                                                        'text-amber-600 dark:text-amber-400': monitoringStats.overallStatus === 'Warning',
                                                        'text-red-600 dark:text-red-400': monitoringStats.overallStatus === 'Error',
                                                    })}>
                                                        {monitoringStats.overallStatus}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Samples Today */}
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Samples Today</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{monitoringStats.samplesToday}</p>
                                            </div>

                                            {/* Pass Rate */}
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Pass Rate</p>
                                                <p className={clsx('text-xl font-black', monitoringStats.passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                                                    {monitoringStats.passRate}%
                                                </p>
                                            </div>

                                            {/* Devices Online */}
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Devices Online</p>
                                                <div className="flex items-center gap-2">
                                                    {monitoringStats.devicesOnline > 0 ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-slate-600" />}
                                                    <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                                                        {monitoringStats.devicesOnline}
                                                        <span className="text-xs font-semibold text-slate-600 ml-1">/ {selectedDevices.length}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Governance & Compliance */}
                                    <div>
                                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                                            <Shield size={13} className="text-indigo-500" /> Governance & Compliance
                                        </h3>
                                        <div className="space-y-1.5">
                                            {[
                                                { label: 'Quality notes required', value: selectedQNotes.length > 0 ? 'Yes' : 'None logged' },
                                                { label: 'Pending approvals', value: String(selectedQNotes.filter(q => q.requires_approval && !q.approved).length) },
                                                { label: 'High severity notes', value: String(selectedQNotes.filter(q => q.severity === 'High').length) },
                                                { label: 'Audit trail enabled', value: 'Yes' },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                                                    <span className="text-[11px] text-slate-700 dark:text-slate-300">{label}</span>
                                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent Alerts */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Bell size={13} className="text-red-500" /> Recent Alerts
                                            </h3>
                                            {selectedAlerts.length > 0 && (
                                                <span className="text-[10px] text-slate-600 font-semibold">View all →</span>
                                            )}
                                        </div>
                                        {selectedAlerts.length === 0 ? (
                                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-center">
                                                <CheckCircle size={16} className="mx-auto mb-1 text-emerald-500" />
                                                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">No alerts — all clear</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                                                {selectedAlerts.slice(0, 5).map(alert => (
                                                    <div key={alert.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <SeverityBadge severity={alert.severity} />
                                                            <span className="text-[9px] text-slate-600 ml-auto">{formatRelativeTime(alert.timestamp)}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2">{alert.description || alert.entity_name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent Activity Log */}
                                    <div>
                                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                                            <Activity size={13} className="text-violet-500" /> Activity Feed
                                        </h3>
                                        {selectedLogs.length === 0 ? (
                                            <p className="text-[11px] text-slate-600 italic">No activity logged for this process</p>
                                        ) : (
                                            <div className="space-y-1 max-h-[140px] overflow-y-auto">
                                                {selectedLogs.slice(0, 8).map(log => (
                                                    <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                                                        <div className={clsx('w-1.5 h-1.5 rounded-full mt-1 shrink-0', {
                                                            'bg-emerald-500': log.severity === 'success',
                                                            'bg-blue-500': log.severity === 'info',
                                                            'bg-amber-500': log.severity === 'warning',
                                                            'bg-red-500': log.severity === 'error',
                                                        })} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] text-slate-700 dark:text-slate-300 truncate">{log.description || log.action}</p>
                                                            <p className="text-[9px] text-slate-600">{formatRelativeTime(log.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
