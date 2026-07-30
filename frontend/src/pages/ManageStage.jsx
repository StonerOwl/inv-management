import React, { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, GitCommit, FolderOpen,
    AlertCircle, Loader2, ChevronDown, Save, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import { getPWSItems, getPWSAssignments, updatePWSItem } from '../api/client';

export default function ManageStage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [items, setItems] = useState([]);
    const [projectWorkflows, setProjectWorkflows] = useState({});
    const [workflowStages, setWorkflowStages] = useState({});

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
    const [selectedStageId, setSelectedStageId] = useState(null);

    // Form state
    const [stageName, setStageName] = useState('');
    const [stageDescription, setStageDescription] = useState('');
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
            (assignRes.data || []).forEach(assign => {
                const parent = allItems.find(i => i.id === assign.parent_id);
                const child = allItems.find(i => i.id === assign.child_id);
                if (parent && child) {
                    if (parent.type === 'project' && child.type === 'workflow') {
                        pwMap[parent.id] = [...(pwMap[parent.id] || []), child.id];
                    } else if (parent.type === 'workflow' && child.type === 'stage') {
                        wsMap[parent.id] = [...(wsMap[parent.id] || []), child.id];
                    }
                }
            });
            setProjectWorkflows(pwMap);
            setWorkflowStages(wsMap);
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
    }, [selectedProjectId]);

    useEffect(() => {
        setSelectedStageId(null);
    }, [selectedWorkflowId]);

    // Populate form when stage is selected
    useEffect(() => {
        if (selectedStageId) {
            const stage = items.find(i => i.id === selectedStageId);
            if (stage) {
                setStageName(stage.name || '');
                setStageDescription(stage.description || '');
                setAllowedImageTypes(stage.allowed_image_types || []);
            }
        }
    }, [selectedStageId, items]);

    const projects = items.filter(i => i.type === 'project');
    const projectWfs = (projectWorkflows[selectedProjectId] || [])
        .map(id => items.find(w => w.id === id))
        .filter(Boolean);
    const wfStages = (workflowStages[selectedWorkflowId] || [])
        .map(id => items.find(s => s.id === id))
        .filter(Boolean);
        
    const selectedStage = items.find(s => s.id === selectedStageId);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedStage || !stageName.trim()) return;

        setSaving(true);
        try {
            const { data } = await updatePWSItem(selectedStage.id, {
                type: 'stage',
                name: stageName.trim(),
                description: stageDescription.trim() || null,
                allowed_image_types: allowedImageTypes
            });
            setItems(prev => prev.map(item => item.id === selectedStage.id ? data : item));
            // update form state just in case
            setStageName(data.name);
            setStageDescription(data.description || '');
            setAllowedImageTypes(data.allowed_image_types || []);
            alert("Stage updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update stage");
        } finally {
            setSaving(false);
        }
    };

    const toggleImageType = (typeId) => {
        setAllowedImageTypes(prev =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    /* ── Shared dropdown style ── */
    const selectClasses = clsx(
        'w-full appearance-none pl-9 pr-9 py-2.5 rounded-xl border font-semibold text-sm transition-all cursor-pointer',
        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        'text-gray-900 dark:text-gray-100',
        'hover:border-primary-400 dark:hover:border-primary-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500'
    );

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
            <div className="max-w-4xl mx-auto w-full pb-20">
                {/* Header */}
                <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        Manage Stage
                    </h1>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Select a project, workflow, and stage to edit its details.
                    </p>
                </div>

                {/* ── Compact Dropdown Selectors ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {/* Project Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                            Project
                        </label>
                        <div className="relative">
                            <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedProjectId || ''}
                                onChange={e => setSelectedProjectId(e.target.value || null)}
                                className={selectClasses}
                            >
                                <option value="">— Select project —</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Workflow Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                            Workflow
                        </label>
                        <div className="relative">
                            <GitBranch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedWorkflowId || ''}
                                onChange={e => setSelectedWorkflowId(e.target.value || null)}
                                disabled={!selectedProjectId}
                                className={clsx(selectClasses, !selectedProjectId && 'opacity-50 cursor-not-allowed')}
                            >
                                <option value="">
                                    {!selectedProjectId ? '— Select a project first —' : '— Select workflow —'}
                                </option>
                                {projectWfs.map(wf => (
                                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Stage Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                            Stage
                        </label>
                        <div className="relative">
                            <GitCommit size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedStageId || ''}
                                onChange={e => setSelectedStageId(e.target.value || null)}
                                disabled={!selectedWorkflowId}
                                className={clsx(selectClasses, !selectedWorkflowId && 'opacity-50 cursor-not-allowed')}
                            >
                                <option value="">
                                    {!selectedWorkflowId ? '— Select a workflow first —' : '— Select stage —'}
                                </option>
                                {wfStages.map(st => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* ── Stage Detail Form (full width) ── */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 min-h-[400px]">
                    {!selectedStageId ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 py-20">
                            <GitCommit size={32} />
                            <p className="text-sm font-semibold">Select a stage to manage its details</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="flex flex-col h-full">
                            <div className="mb-6">
                                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <GitCommit size={18} className="text-primary-500" /> Stage Details
                                </h3>
                            </div>
                            
                            <div className="space-y-6 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                                        Stage Name
                                    </label>
                                    <input
                                        type="text"
                                        value={stageName}
                                        onChange={e => setStageName(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow text-sm font-semibold text-gray-900 dark:text-gray-100"
                                        placeholder="Enter stage name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                                        Stage Description
                                    </label>
                                    <textarea
                                        value={stageDescription}
                                        onChange={e => setStageDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow text-sm font-semibold text-gray-900 dark:text-gray-100 resize-none"
                                        placeholder="Enter stage description or guidelines..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                                        Allowed Image Types
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    );
}
