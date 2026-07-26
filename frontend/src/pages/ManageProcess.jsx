import React, { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, GitCommit, Layers, FolderOpen, Settings2,
    AlertCircle, Loader2, ChevronRight, Save, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import { getPWSItems, getPWSAssignments, updatePWSItem } from '../api/client';

function SectionTitle({ children }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{children}</p>;
}

export default function ManageProcess() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [items, setItems] = useState([]);
    const [projectWorkflows, setProjectWorkflows] = useState({});
    const [workflowStages, setWorkflowStages] = useState({});
    const [stageProcesses, setStageProcesses] = useState({});

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
    const [selectedStageId, setSelectedStageId] = useState(null);
    const [selectedProcessId, setSelectedProcessId] = useState(null);

    // Form state
    const [processName, setProcessName] = useState('');
    const [allowedImageTypes, setAllowedImageTypes] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [itemsRes, assignRes] = await Promise.all([
                getPWSItems(),
                getPWSAssignments()
            ]);
            const allItems = itemsRes.data || [];
            setItems(allItems);

            const pwMap = {};
            const wsMap = {};
            const spMap = {};
            (assignRes.data || []).forEach(assign => {
                const parent = allItems.find(i => i.id === assign.parent_id);
                const child = allItems.find(i => i.id === assign.child_id);
                if (parent && child) {
                    if (parent.type === 'project' && child.type === 'workflow') {
                        pwMap[parent.id] = [...(pwMap[parent.id] || []), child.id];
                    } else if (parent.type === 'workflow' && child.type === 'stage') {
                        wsMap[parent.id] = [...(wsMap[parent.id] || []), child.id];
                    } else if (parent.type === 'stage' && child.type === 'process') {
                        spMap[parent.id] = [...(spMap[parent.id] || []), child.id];
                    }
                }
            });
            setProjectWorkflows(pwMap);
            setWorkflowStages(wsMap);
            setStageProcesses(spMap);
        } catch (e) {
            setError('Failed to load data. Please refresh.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Handle cascading resets
    useEffect(() => {
        setSelectedWorkflowId(null);
        setSelectedStageId(null);
        setSelectedProcessId(null);
    }, [selectedProjectId]);

    useEffect(() => {
        setSelectedStageId(null);
        setSelectedProcessId(null);
    }, [selectedWorkflowId]);

    useEffect(() => {
        setSelectedProcessId(null);
    }, [selectedStageId]);

    // Populate form when process is selected
    useEffect(() => {
        if (selectedProcessId) {
            const proc = items.find(i => i.id === selectedProcessId);
            if (proc) {
                setProcessName(proc.name || '');
                setAllowedImageTypes(proc.allowed_image_types || []);
            }
        }
    }, [selectedProcessId, items]);

    const projects = items.filter(i => i.type === 'project');
    const projectWfs = (projectWorkflows[selectedProjectId] || [])
        .map(id => items.find(w => w.id === id))
        .filter(Boolean);
    const wfStages = (workflowStages[selectedWorkflowId] || [])
        .map(id => items.find(s => s.id === id))
        .filter(Boolean);
    const stProcesses = (stageProcesses[selectedStageId] || [])
        .map(id => items.find(p => p.id === id))
        .filter(Boolean);
        
    const selectedProcess = items.find(p => p.id === selectedProcessId);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedProcess || !processName.trim()) return;

        setSaving(true);
        try {
            const { data } = await updatePWSItem(selectedProcess.id, {
                type: 'process',
                name: processName.trim(),
                allowed_image_types: allowedImageTypes
            });
            setItems(prev => prev.map(item => item.id === selectedProcess.id ? data : item));
            setProcessName(data.name);
            setAllowedImageTypes(data.allowed_image_types || []);
            alert("Process updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update process");
        } finally {
            setSaving(false);
        }
    };

    const toggleImageType = (typeId) => {
        setAllowedImageTypes(prev =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-semibold">Loading data…</span>
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
                        Manage Process
                    </h1>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Select a project, workflow, and stage to edit specific process details.
                    </p>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-4">
                    {/* ── Column 1: Projects ── */}
                    <div className="w-48 shrink-0 flex flex-col gap-3">
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
                                        'w-full text-left px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-colors',
                                        selectedProjectId === p.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <FolderOpen size={13} className="shrink-0" />
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    <ChevronRight size={12} className="shrink-0 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Column 2: Workflows ── */}
                    <div className="w-48 shrink-0 flex flex-col gap-3">
                        <SectionTitle>
                            Workflows {selectedProjectId ? `(${projectWfs.length})` : ''}
                        </SectionTitle>
                        {!selectedProjectId ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                Select a project
                            </div>
                        ) : projectWfs.length === 0 ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                No workflows
                            </div>
                        ) : (
                            projectWfs.map(wf => (
                                <button
                                    key={wf.id}
                                    onClick={() => setSelectedWorkflowId(wf.id)}
                                    className={clsx(
                                        'w-full text-left px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-colors',
                                        selectedWorkflowId === wf.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <GitBranch size={13} className="shrink-0" />
                                        <span className="truncate">{wf.name}</span>
                                    </div>
                                    <ChevronRight size={12} className="shrink-0 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Column 3: Stages ── */}
                    <div className="w-48 shrink-0 flex flex-col gap-3">
                        <SectionTitle>
                            Stages {selectedWorkflowId ? `(${wfStages.length})` : ''}
                        </SectionTitle>
                        {!selectedWorkflowId ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                Select a workflow
                            </div>
                        ) : wfStages.length === 0 ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                No stages
                            </div>
                        ) : (
                            wfStages.map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setSelectedStageId(st.id)}
                                    className={clsx(
                                        'w-full text-left px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-colors',
                                        selectedStageId === st.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <GitCommit size={13} className="shrink-0" />
                                        <span className="truncate">{st.name}</span>
                                    </div>
                                    <ChevronRight size={12} className="shrink-0 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Column 4: Processes ── */}
                    <div className="w-48 shrink-0 flex flex-col gap-3">
                        <SectionTitle>
                            Processes {selectedStageId ? `(${stProcesses.length})` : ''}
                        </SectionTitle>
                        {!selectedStageId ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                Select a stage
                            </div>
                        ) : stProcesses.length === 0 ? (
                            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                                No processes
                            </div>
                        ) : (
                            stProcesses.map(proc => (
                                <button
                                    key={proc.id}
                                    onClick={() => setSelectedProcessId(proc.id)}
                                    className={clsx(
                                        'w-full text-left px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-colors',
                                        selectedProcessId === proc.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Settings2 size={13} className="shrink-0" />
                                        <span className="truncate">{proc.name}</span>
                                    </div>
                                    <ChevronRight size={12} className="shrink-0 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* ── Column 5: Process Detail Form ── */}
                    <div className="flex-1 min-w-[300px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 min-h-[500px]">
                        {!selectedProcessId ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                <Settings2 size={32} />
                                <p className="text-sm font-semibold">Select a process to manage its details</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="flex flex-col h-full">
                                <div className="mb-6">
                                    <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Settings2 size={18} className="text-primary-500" /> Process Details
                                    </h3>
                                </div>
                                
                                <div className="space-y-6 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                                            Process Name
                                        </label>
                                        <input
                                            type="text"
                                            value={processName}
                                            onChange={e => setProcessName(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow text-sm font-semibold text-gray-900 dark:text-gray-100"
                                            placeholder="Enter process name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                                            Allowed Image Types
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'item', label: 'Item Image' },
                                                { id: 'machine', label: 'Machine View' },
                                                { id: 'defect', label: 'Defect Zoom' },
                                                { id: 'wide', label: 'Wide Angle' },
                                                { id: 'receipt', label: 'Receipt/Doc' }
                                            ].map(type => (
                                                <label
                                                    key={type.id}
                                                    className={clsx(
                                                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                                                        allowedImageTypes.includes(type.id)
                                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={allowedImageTypes.includes(type.id)}
                                                        onChange={() => toggleImageType(type.id)}
                                                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                    />
                                                    <ImageIcon size={14} className={allowedImageTypes.includes(type.id) ? "text-primary-500" : "text-gray-400"} />
                                                    <span className="text-xs font-bold">{type.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
