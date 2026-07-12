import { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, GitCommit, Settings2, Package, ChevronRight, ChevronDown,
    Plus, Trash2, XCircle, Link2, Unlink, AlertCircle, Loader2,
    FolderOpen, Layers, BarChart2, Hash, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import {
    getPWSItems, getPWSAssignments,
    getProjectInventory, getStageItemLinks,
    createStageItemLink, deleteStageItemLink,
    completeStage, reopenStage,
} from '../api/client';

// ─── small helpers ────────────────────────────────────────────────────────────
const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function Badge({ children, color = 'gray' }) {
    const cls = {
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
        blue: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
        green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    }[color] || cls.gray;
    return <span className={clsx('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-transparent', cls)}>{children}</span>;
}

function SectionTitle({ children }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{children}</p>;
}

function EmptyState({ icon: Icon, message }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400 dark:text-gray-600">
            <Icon size={20} />
            <p className="text-xs font-semibold text-center">{message}</p>
        </div>
    );
}

// ─── linked item row ──────────────────────────────────────────────────────────
function LinkedItemRow({ link, onUnlink }) {
    return (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 group">
            <div className="flex items-center gap-2 min-w-0">
                <Package size={12} className="text-primary-500 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{link.item_name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Qty: {link.quantity ?? '—'} · {fmt(link.unit_price)}/unit · {link.invoice_number || 'No invoice'}
                    </p>
                </div>
            </div>
            <button
                onClick={() => onUnlink(link.id)}
                title="Remove link"
                className="ml-3 shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Unlink size={13} />
            </button>
        </div>
    );
}

// ─── inventory item picker row ────────────────────────────────────────────────
function InventoryPickerRow({ item, linked, onLink }) {
    return (
        <div className={clsx(
            'flex items-center justify-between px-3 py-2 rounded-lg border transition-colors',
            linked
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
        )}>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{item.item_name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Qty: {item.quantity ?? '—'} · {fmt(item.unit_price)}/unit · {item.invoice_number || 'No invoice'}
                    {item.hsn_code ? ` · HSN ${item.hsn_code}` : ''}
                </p>
            </div>
            {linked ? (
                <Badge color="green">Linked</Badge>
            ) : (
                <button
                    onClick={() => onLink(item.id)}
                    className="ml-3 shrink-0 flex items-center gap-1 text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 px-2 py-1 border border-primary-200 dark:border-primary-800 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                    <Link2 size={10} /> Link
                </button>
            )}
        </div>
    );
}

// ─── stage panel ─────────────────────────────────────────────────────────────
function StagePanel({ stage, projectInventory, onLinkChange, onStageUpdated }) {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState('');
    const [linking, setLinking] = useState(false);
    const [completing, setCompleting] = useState(false);
    const { user } = useAuth();

    const linkedIds = new Set(links.map(l => l.inventory_item_id));

    const loadLinks = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getStageItemLinks(stage.id);
            setLinks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [stage.id]);

    useEffect(() => { loadLinks(); }, [loadLinks]);

    const handleLink = async (itemId) => {
        setLinking(true);
        try {
            const { data } = await createStageItemLink({ stage_id: stage.id, inventory_item_id: itemId });
            setLinks(prev => [...prev, data]);
            onLinkChange?.();
        } catch (e) {
            console.error(e);
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async (linkId) => {
        try {
            await deleteStageItemLink(linkId);
            setLinks(prev => prev.filter(l => l.id !== linkId));
            onLinkChange?.();
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleComplete = async () => {
        setCompleting(true);
        try {
            const { data } = stage.completed
                ? await reopenStage(stage.id)
                : await completeStage(stage.id, user?.username);
            onStageUpdated?.(data);
        } catch (e) {
            console.error(e);
        } finally {
            setCompleting(false);
        }
    };

    const filtered = projectInventory.filter(item =>
        !search || item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        item.hsn_code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={clsx(
            'border rounded-xl overflow-hidden',
            stage.completed ? 'border-emerald-300 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700'
        )}>
            {/* Stage header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <GitCommit size={14} className="text-primary-500 shrink-0" />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{stage.name}</span>
                    {links.length > 0 && (
                        <Badge color="blue">{links.length} item{links.length !== 1 ? 's' : ''} linked</Badge>
                    )}
                    {stage.completed && <Badge color="green">Completed</Badge>}
                </div>
                <div className="flex items-center gap-3">
                    <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(); }}
                        className={clsx(
                            'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border transition-colors',
                            completing && 'opacity-50 pointer-events-none',
                            stage.completed
                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                        )}
                    >
                        {completing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                        {stage.completed ? 'Reopen' : 'Mark Complete'}
                    </span>
                    {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="p-4 bg-white dark:bg-gray-800">
                    <div className="flex gap-5">

                        {/* Left: currently linked items */}
                        <div className="flex-1 min-w-0">
                            <SectionTitle>Linked Inventory Items</SectionTitle>
                            {loading ? (
                                <div className="flex items-center gap-2 text-gray-400 text-xs py-4">
                                    <Loader2 size={13} className="animate-spin" /> Loading…
                                </div>
                            ) : links.length === 0 ? (
                                <EmptyState icon={Package} message="No inventory items linked to this stage yet" />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {links.map(link => (
                                        <LinkedItemRow key={link.id} link={link} onUnlink={handleUnlink} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="w-px bg-gray-100 dark:bg-gray-700 self-stretch" />

                        {/* Right: inventory picker */}
                        <div className="w-72 shrink-0">
                            <SectionTitle>Project Inventory</SectionTitle>
                            {projectInventory.length === 0 ? (
                                <EmptyState icon={AlertCircle} message="No inventory items found for this project. Link an invoice first in Manage Project." />
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Search items…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="aiq-input mb-3 text-xs"
                                    />
                                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                                        {filtered.length === 0 ? (
                                            <p className="text-xs text-gray-400 text-center py-4">No items match your search</p>
                                        ) : (
                                            filtered.map(item => (
                                                <InventoryPickerRow
                                                    key={item.id}
                                                    item={item}
                                                    linked={linkedIds.has(item.id)}
                                                    onLink={handleLink}
                                                />
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── workflow detail panel ────────────────────────────────────────────────────
function WorkflowDetail({ workflow, stages, stageProcesses, processes, projectInventory, onStageUpdated }) {
    const [openProcesses, setOpenProcesses] = useState({});
    const wfStages = (stageProcesses._wfStages?.[workflow.id] || [])
        .map(sId => stages.find(s => s.id === sId))
        .filter(Boolean);

    return (
        <div className="flex flex-col gap-3">
            {/* Workflow meta */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                    <GitBranch size={16} />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100">{workflow.name}</h2>
                    {workflow.batch_id && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <Hash size={10} className="text-gray-400" />
                            <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400">{workflow.batch_id}</span>
                        </div>
                    )}
                </div>
            </div>

            {wfStages.length === 0 ? (
                <EmptyState icon={GitCommit} message="No stages assigned to this workflow yet. Go to Manage Project to assign stages." />
            ) : (
                <div className="flex flex-col gap-3">
                    {wfStages.map(stage => (
                        <div key={stage.id}>
                            <StagePanel
                                stage={stage}
                                projectInventory={projectInventory}
                                onLinkChange={() => { }}
                                onStageUpdated={onStageUpdated}
                            />

                            {/* Processes under stage (read-only display) */}
                            {(stageProcesses[stage.id] || []).length > 0 && (
                                <div className="ml-6 mt-2 flex flex-col gap-1 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
                                    <button
                                        onClick={() => setOpenProcesses(p => ({ ...p, [stage.id]: !p[stage.id] }))}
                                        className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {openProcesses[stage.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                        {(stageProcesses[stage.id] || []).length} Process{(stageProcesses[stage.id] || []).length !== 1 ? 'es' : ''}
                                    </button>
                                    {openProcesses[stage.id] && (
                                        <div className="flex flex-col gap-1 mt-1">
                                            {(stageProcesses[stage.id] || []).map(pId => {
                                                const proc = processes.find(p => p.id === pId);
                                                if (!proc) return null;
                                                return (
                                                    <div key={pId} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                                                        <Settings2 size={11} className="text-gray-400 shrink-0" />
                                                        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{proc.name}</span>
                                                        {proc.allowed_image_types?.length > 0 && (
                                                            <div className="flex gap-1 ml-auto">
                                                                {proc.allowed_image_types.map(t => <Badge key={t} color="amber">{t}</Badge>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ManageWorkflow() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [projects, setProjects] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [stages, setStages] = useState([]);
    const [processes, setProcesses] = useState([]);

    // assignment maps
    const [projectWorkflows, setProjectWorkflows] = useState({}); // projectId → [workflowId]
    const [workflowStages, setWorkflowStages] = useState({});      // workflowId → [stageId]
    const [stageProcesses, setStageProcesses] = useState({});      // stageId → [processId]

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

    const [projectInventory, setProjectInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);

    // ── load PWS data ──
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [itemsRes, assignRes] = await Promise.all([getPWSItems(), getPWSAssignments()]);
                const items = itemsRes.data || [];
                const assigns = assignRes.data || [];

                setProjects(items.filter(i => i.type === 'project'));
                setWorkflows(items.filter(i => i.type === 'workflow'));
                setStages(items.filter(i => i.type === 'stage'));
                setProcesses(items.filter(i => i.type === 'process'));

                const pw = {}, ws = {}, sp = {};
                for (const a of assigns) {
                    const parent = items.find(i => i.id === a.parent_id);
                    const child = items.find(i => i.id === a.child_id);
                    if (!parent || !child) continue;
                    if (parent.type === 'project' && child.type === 'workflow') {
                        if (!pw[parent.id]) pw[parent.id] = [];
                        if (!pw[parent.id].includes(child.id)) pw[parent.id].push(child.id);
                    } else if (parent.type === 'workflow' && child.type === 'stage') {
                        if (!ws[parent.id]) ws[parent.id] = [];
                        if (!ws[parent.id].includes(child.id)) ws[parent.id].push(child.id);
                    } else if (parent.type === 'stage' && child.type === 'process') {
                        if (!sp[parent.id]) sp[parent.id] = [];
                        if (!sp[parent.id].includes(child.id)) sp[parent.id].push(child.id);
                    }
                }
                // attach wfStages lookup for WorkflowDetail
                sp._wfStages = ws;
                setProjectWorkflows(pw);
                setWorkflowStages(ws);
                setStageProcesses(sp);
            } catch (e) {
                setError('Failed to load project data. Please refresh.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ── load inventory when project changes ──
    useEffect(() => {
        if (!selectedProjectId) { setProjectInventory([]); return; }
        setInventoryLoading(true);
        setSelectedWorkflowId(null);
        getProjectInventory(selectedProjectId)
            .then(({ data }) => setProjectInventory(data || []))
            .catch(() => setProjectInventory([]))
            .finally(() => setInventoryLoading(false));
    }, [selectedProjectId]);

    const projectWfs = (projectWorkflows[selectedProjectId] || [])
        .map(id => workflows.find(w => w.id === id))
        .filter(Boolean);

    const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId) || null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-semibold">Loading workflows…</span>
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 -m-8 p-8">
            <div className="max-w-7xl mx-auto w-full pb-20">

                {/* Header */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        Manage Workflow
                    </h1>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Select a project and workflow to manage stages, processes, and link inventory items
                    </p>
                </div>

                <div className="flex gap-6">

                    {/* ── Column 1: Projects ── */}
                    <div className="w-56 shrink-0 flex flex-col gap-3">
                        <SectionTitle>Projects</SectionTitle>
                        {projects.length === 0 ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                No projects yet
                            </div>
                        ) : (
                            projects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedProjectId(p.id)}
                                    className={clsx(
                                        'w-full text-left px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-between transition-colors',
                                        selectedProjectId === p.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FolderOpen size={14} className="shrink-0" />
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    <ChevronRight size={13} className="shrink-0 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Column 2: Workflows ── */}
                    <div className="w-56 shrink-0 flex flex-col gap-3">
                        <SectionTitle>
                            Workflows {selectedProjectId ? `(${projectWfs.length})` : ''}
                        </SectionTitle>
                        {!selectedProjectId ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                Select a project
                            </div>
                        ) : projectWfs.length === 0 ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                No workflows assigned to this project
                            </div>
                        ) : (
                            projectWfs.map(wf => {
                                const stageCount = (workflowStages[wf.id] || []).length;
                                return (
                                    <button
                                        key={wf.id}
                                        onClick={() => setSelectedWorkflowId(wf.id)}
                                        className={clsx(
                                            'w-full text-left px-4 py-3 rounded-xl border font-bold text-sm transition-colors',
                                            selectedWorkflowId === wf.id
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <GitBranch size={13} className="shrink-0" />
                                            <span className="truncate">{wf.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-5">
                                            {wf.batch_id && (
                                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">{wf.batch_id}</span>
                                            )}
                                            {stageCount > 0 && <Badge color="gray">{stageCount} stage{stageCount !== 1 ? 's' : ''}</Badge>}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* ── Column 3: Workflow detail + stage linking ── */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 min-h-[500px]">
                        {!selectedProjectId ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                <FolderOpen size={32} />
                                <p className="text-sm font-semibold">Select a project to get started</p>
                            </div>
                        ) : !selectedWorkflowId ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                <GitBranch size={32} />
                                <p className="text-sm font-semibold">Select a workflow to manage</p>
                            </div>
                        ) : (
                            <div>
                                {/* Inventory status bar */}
                                <div className="mb-6 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                                    <BarChart2 size={14} className="text-primary-500 shrink-0" />
                                    {inventoryLoading ? (
                                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                            <Loader2 size={11} className="animate-spin" /> Loading project inventory…
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                            {projectInventory.length > 0
                                                ? <>{projectInventory.length} inventory item{projectInventory.length !== 1 ? 's' : ''} available from linked invoices — expand a stage to assign them</>
                                                : <>No inventory items found for this project. Link an invoice in <strong>Manage Project</strong> first.</>
                                            }
                                        </span>
                                    )}
                                </div>

                                <WorkflowDetail
                                    workflow={selectedWorkflow}
                                    stages={stages}
                                    stageProcesses={stageProcesses}
                                    processes={processes}
                                    projectInventory={projectInventory}
                                    onStageUpdated={(updatedStage) => {
                                        setStages(prev => prev.map(s => s.id === updatedStage.id ? updatedStage : s));
                                    }}
                                />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}