import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderPlus, GitCommit, GitBranch, XCircle, CheckCircle, ChevronRight, Plus, Settings2, Trash2, Pencil, CheckSquare, Square } from 'lucide-react';
import clsx from 'clsx';
import Barcode from 'react-barcode';
import { getPWSItems, createPWSItem, updatePWSItem, deletePWSItem, getPWSAssignments, createPWSAssignment, deletePWSAssignment } from '../api/client';
import NoteTarget from '../components/NoteTarget';

export default function CreatePWS() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState(location.state?.viewMode || 'tree');
  const [activeModal, setActiveModal] = useState(null);
  const [name, setName] = useState('');
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [batchId, setBatchId] = useState('');
  const [createdItems, setCreatedItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [modalError, setModalError] = useState('');

  // Management State
  const [selectedProjectId, setSelectedProjectId] = useState(location.state?.selectedProjectId || null);
  const [projectWorkflows, setProjectWorkflows] = useState({}); // { projectId: [workflowId, ...] }
  const [workflowStages, setWorkflowStages] = useState({}); // { workflowId: [stageId, ...] }
  const [stageProcesses, setStageProcesses] = useState({}); // { stageId: [processId, ...] }

  // Modal linking state — for auto-assigning on creation
  const [linkToProjectId, setLinkToProjectId] = useState('');
  const [linkToWorkflowId, setLinkToWorkflowId] = useState('');
  const [linkToStageId, setLinkToStageId] = useState('');

  // Image type checkboxes for workflow/stage/process
  const IMAGE_TYPES = ['Visual', 'NIR', 'Thermal', 'X-Ray', 'Spectral', 'Ultrasonic'];
  const [allowedImageTypes, setAllowedImageTypes] = useState([]);
  const toggleImageType = (type) => setAllowedImageTypes(prev =>
    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
  );

  // Dropdown states for assignment
  const [workflowToAssign, setWorkflowToAssign] = useState('');
  const [stageToAssign, setStageToAssign] = useState({}); // { workflowId: stageIdToAssign }
  const [processToAssign, setProcessToAssign] = useState({}); // { stageId: processIdToAssign }

  // Bulk selection / delete mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Project ID and QR state
  const [projectIds, setProjectIds] = useState({}); // { projectId: 5-digit-id }

  const fetchData = useCallback(async () => {
    try {
      const [{ data: items }, { data: assignments }] = await Promise.all([
        getPWSItems(),
        getPWSAssignments()
      ]);

      setCreatedItems(items || []);

      // Load existing project codes
      const existingCodes = {};
      (items || []).forEach(item => {
        if (item.type === 'project' && item.project_code) {
          existingCodes[item.id] = item.project_code;
        }
      });
      setProjectIds(existingCodes);

      // Rebuild assignment mappings
      const pwMap = {};
      const wsMap = {};
      const spMap = {};
      (assignments || []).forEach(assign => {
        const parent = items.find(i => i.id === assign.parent_id);
        const child = items.find(i => i.id === assign.child_id);
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
    } catch (err) {
      console.error('Failed to load PWS data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (type) => {
    setEditingItem(null);
    setActiveModal(type);
    setName('');
    setProduct('');
    setCategory('');
    setStartDate('');
    setTargetDate('');
    setBatchId('');
    setModalError('');
    setLinkToProjectId('');
    setLinkToWorkflowId('');
    setLinkToStageId('');
    setAllowedImageTypes([]);
  };

  const handleEditItem = (item, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingItem(item);
    setActiveModal(item.type);
    setName(item.name || '');
    setModalError('');
    if (item.type === 'project') {
      setProduct(item.product || '');
      setCategory(item.category || '');
      setStartDate(item.start_date || '');
      setTargetDate(item.target_date || '');
      setBatchId(item.batch_id || '');
      setAllowedImageTypes([]);
    } else {
      setAllowedImageTypes(Array.isArray(item.allowed_image_types) ? item.allowed_image_types : []);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingItem(null);
    setName('');
    setProduct('');
    setCategory('');
    setStartDate('');
    setTargetDate('');
    setBatchId('');
    setModalError('');
    setLinkToProjectId('');
    setLinkToWorkflowId('');
    setLinkToStageId('');
    setAllowedImageTypes([]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Duplicate name check — scoped per entity type
    const trimmedName = name.trim().toLowerCase();
    const isDuplicate = createdItems.some(item =>
      item.type === activeModal &&
      item.name?.trim().toLowerCase() === trimmedName &&
      (!editingItem || item.id !== editingItem.id)
    );
    if (isDuplicate) {
      setModalError(`A ${activeModal} named "${name.trim()}" already exists. Please use a unique name.`);
      return;
    }
    setModalError('');

    const itemData = {
      type: activeModal,
      name: name.trim(),
    };

    if (activeModal === 'project') {
      itemData.product = product;
      itemData.category = category;
      itemData.start_date = startDate;
      itemData.target_date = targetDate;
      itemData.batch_id = batchId;
    } else {
      // Store the checked image types (empty array = all allowed)
      itemData.allowed_image_types = allowedImageTypes;
    }

    try {
      if (editingItem) {
        const { data } = await updatePWSItem(editingItem.id, itemData);
        setCreatedItems((prev) => prev.map(item => item.id === editingItem.id ? data : item));
      } else {
        itemData.id = `pws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const { data } = await createPWSItem(itemData);
        setCreatedItems((prev) => [data, ...prev]);

        // Auto-assign based on link selections
        if (activeModal === 'workflow' && linkToProjectId) {
          await createPWSAssignment({ parent_id: linkToProjectId, child_id: data.id });
          setProjectWorkflows(prev => ({
            ...prev,
            [linkToProjectId]: [...(prev[linkToProjectId] || []), data.id]
          }));
        } else if (activeModal === 'stage' && linkToWorkflowId) {
          await createPWSAssignment({ parent_id: linkToWorkflowId, child_id: data.id });
          setWorkflowStages(prev => ({
            ...prev,
            [linkToWorkflowId]: [...(prev[linkToWorkflowId] || []), data.id]
          }));
        } else if (activeModal === 'process' && linkToStageId) {
          await createPWSAssignment({ parent_id: linkToStageId, child_id: data.id });
          setStageProcesses(prev => ({
            ...prev,
            [linkToStageId]: [...(prev[linkToStageId] || []), data.id]
          }));
        }
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? This will also remove any of its hierarchy assignments.")) return;
    try {
      await deletePWSItem(projectId);
      setCreatedItems(prev => prev.filter(item => item.id !== projectId));
      setSelectedProjectId(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please check the console.');
    }
  };

  const handleDeleteItem = async (itemId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
    try {
      await deletePWSItem(itemId);
      setCreatedItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item. Please check the console.');
    }
  };
  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items) => {
    const allIds = items.map(i => i.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach(id => next.delete(id));
      } else {
        allIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deletePWSItem(id)));
      setCreatedItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      alert('Some items could not be deleted. Please check the console.');
    } finally {
      setIsDeleting(false);
    }
  };

  const assignWorkflow = async (projectId) => {
    if (!workflowToAssign) return;
    try {
      await createPWSAssignment({ parent_id: projectId, child_id: workflowToAssign });
      setProjectWorkflows(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), workflowToAssign]
      }));
      setWorkflowToAssign('');
    } catch (err) {
      console.error('Failed to assign workflow:', err);
    }
  };

  // Picking an "existing" stage from the dropdown reuses that same stage
  // record under a new workflow — stages/processes are just labels, so the
  // same underlying item can be linked (via PWSAssignment) to multiple
  // parents without creating duplicate PWSItem rows.
  const assignStage = async (workflowId) => {
    const sToAssign = stageToAssign[workflowId];
    if (!sToAssign) return;
    try {
      await createPWSAssignment({ parent_id: workflowId, child_id: sToAssign });
      setWorkflowStages(prev => ({
        ...prev,
        [workflowId]: [...(prev[workflowId] || []), sToAssign]
      }));

      setStageToAssign(prev => ({ ...prev, [workflowId]: '' }));
    } catch (err) {
      console.error('Failed to assign stage:', err);
    }
  };

  // Same reasoning as assignStage: reusing an "existing" process under a
  // different stage just links the existing record, no cloning.
  const assignProcess = async (stageId) => {
    const pToAssign = processToAssign[stageId];
    if (!pToAssign) return;
    try {
      await createPWSAssignment({ parent_id: stageId, child_id: pToAssign });
      setStageProcesses(prev => ({
        ...prev,
        [stageId]: [...(prev[stageId] || []), pToAssign]
      }));
      setProcessToAssign(prev => ({ ...prev, [stageId]: '' }));
    } catch (err) {
      console.error('Failed to assign process:', err);
    }
  };

  const removeAssignment = async (parentId, childId, mapSetter) => {
    try {
      await deletePWSAssignment(parentId, childId);
      mapSetter(prev => ({
        ...prev,
        [parentId]: prev[parentId].filter(id => id !== childId)
      }));
    } catch (err) {
      console.error('Failed to remove assignment:', err);
    }
  };

  const getIcon = (type, size = 24) => {
    switch (type) {
      case 'project': return <FolderPlus size={size} />;
      case 'workflow': return <GitBranch size={size} />;
      case 'stage': return <GitCommit size={size} />;
      case 'process': return <Settings2 size={size} />;
      default: return null;
    }
  };

  const projects = createdItems.filter(i => i.type === 'project');
  const workflows = createdItems.filter(i => i.type === 'workflow');
  const stages = createdItems.filter(i => i.type === 'stage');
  const processes = createdItems.filter(i => i.type === 'process');

  const renderRecentlyCreated = (items, typeLabel) => {
    const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
    return (
      <div className="flex flex-col gap-2">
        <div className="group/col flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-normal capitalize flex items-center gap-2">
            {selectMode && items.length > 0 && (
              <button
                onClick={() => toggleSelectAll(items)}
                className="text-primary-500 hover:text-primary-700 dark:text-primary-400"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
            )}
            <span className="text-primary-600 dark:text-primary-400">{getIcon(typeLabel, 14)}</span>
            {typeLabel}s
          </h4>
          {!selectMode && (
            <button
              onClick={() => handleOpenModal(typeLabel)}
              title={`Create new ${typeLabel}`}
              className="opacity-0 group-hover/col:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div
            onClick={() => !selectMode && handleOpenModal(typeLabel)}
            className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary-400 hover:text-primary-500 transition-colors"
          >
            No {typeLabel}s yet — click + to create
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => selectMode && toggleSelectId(item.id)}
                className={clsx(
                  'flex items-center justify-between p-3 border rounded-lg group/item transition-colors',
                  selectMode && 'cursor-pointer',
                  isSelected
                    ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : idx % 2 === 0 ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                  selectMode && !isSelected && 'hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/30 dark:hover:bg-red-900/10'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectMode ? (
                    <div className={clsx('shrink-0 w-4 h-4 flex items-center justify-center rounded border transition-colors', isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 dark:border-gray-600')}>
                      {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                  ) : (
                    <div className="text-primary-600 dark:text-primary-400 shrink-0">{getIcon(item.type, 16)}</div>
                  )}
                  <div className="text-sm font-bold truncate" title={item.name}>{item.name}</div>
                </div>
                {!selectMode && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={(e) => handleEditItem(item, e)}
                      className="opacity-0 group-hover/item:opacity-100 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-opacity p-1 rounded"
                      title={`Edit ${typeLabel}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 rounded"
                      title={`Delete ${typeLabel}`}
                    >
                      <Trash2 size={13} />
                    </button>
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    )
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col -m-8 p-8 relative">
      <div className="max-w-7xl mx-auto w-full pb-20">

        {/* Header */}
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {viewMode === 'tree' ? 'Project Hierarchy' : viewMode === 'create' ? 'Create Items' : 'Manage Project'}
            </h1>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
              Project · Workflow · Stage · Process
            </div>
          </div>

          <div className="flex gap-4">
            {viewMode !== 'tree' && (
              <button
                onClick={() => setViewMode('tree')}
                className="aiq-btn-ghost flex items-center gap-2"
              >
                Back to Tree
              </button>
            )}
            {viewMode !== 'create' && (
              <button
                onClick={() => setViewMode('create')}
                className="aiq-btn-ghost text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
              >
                <Plus size={16} /> Create
              </button>
            )}
            {viewMode !== 'manage' && (
              <button
                onClick={() => setViewMode('manage')}
                className="aiq-btn-primary flex items-center gap-2"
              >
                <Settings2 size={16} /> Update
              </button>
            )}
          </div>
        </div>

        {viewMode === 'tree' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-bold border-2 border-dashed border-gray-200 dark:border-gray-700">
                No projects found. Click "Create" to get started.
              </div>
            ) : (
              projects.map(p => {
                let isLive = false;
                if (p.start_date && p.target_date) {
                  const now = new Date();
                  const start = new Date(p.start_date);
                  const target = new Date(p.target_date);
                  if (now >= start && now <= target) {
                    isLive = true;
                  }
                }
                return (
                  <details key={p.id} className="group aiq-card overflow-hidden mb-4" open>
                    <summary className="p-4 font-bold text-lg text-gray-900 dark:text-gray-100 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden border-b border-transparent group-open:border-gray-100 dark:group-open:border-gray-800">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={20} className="group-open:rotate-90 transition-transform text-gray-400" />
                        <FolderPlus size={20} className="text-primary-600 dark:text-primary-400" /> {p.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs tracking-wider">
                        <span className={clsx("px-3 py-1 rounded-full font-bold", isLive ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700")}>
                          {isLive ? "LIVE" : "FINISHED"}
                        </span>
                        {p.project_code && (
                          <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 border border-primary-200 dark:border-primary-800">
                            ID: {p.project_code}
                          </span>
                        )}

                      </div>
                    </summary>

                    <div className="p-6 bg-gray-50/50 dark:bg-gray-900/20">
                      {/* Meta info row */}
                      {(p.product || projectWorkflows[p.id]?.length > 0 || p.category || p.start_date || p.target_date) && (
                        <div className="mb-5 bg-white dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-x-10 gap-y-3 text-sm">
                          {p.product && <div><span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Product</span><span className="font-semibold text-gray-900 dark:text-gray-100">{p.product}</span></div>}
                          {projectWorkflows[p.id]?.length > 0 && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Work Order / Workflow</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {projectWorkflows[p.id].map(wId => workflows.find(w => w.id === wId)?.name).filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          {p.category && <div><span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Category</span><span className="font-semibold text-gray-900 dark:text-gray-100">{p.category}</span></div>}
                          {p.start_date && <div><span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Start Date</span><span className="font-semibold text-gray-900 dark:text-gray-100">{p.start_date}</span></div>}
                          {p.target_date && <div><span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Target Date</span><span className="font-semibold text-gray-900 dark:text-gray-100">{p.target_date}</span></div>}
                        </div>
                      )}

                      {/* Two-column: tree left, QR panel right */}
                      <div className="flex gap-5 items-start">

                        {/* Left: workflow tree */}
                        <div className="flex-1 min-w-0 pl-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
                          {(projectWorkflows[p.id] || []).map(wId => {
                            const wf = workflows.find(w => w.id === wId);
                            if (!wf) return null;
                            return (
                              <details key={wId} className="group/wf" open>
                                <summary className="py-2 font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-3 cursor-pointer outline-none select-none hover:text-primary-600 transition-colors list-none [&::-webkit-details-marker]:hidden relative">
                                  <div className="absolute -left-[18px] top-1/2 w-4 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                  <ChevronRight size={18} className="group-open/wf:rotate-90 transition-transform text-gray-400" />
                                  <GitBranch size={18} className="text-primary-500 dark:text-primary-400" /> {wf.name} {wf.batch_id && <span className="ml-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 font-mono">BATCH: {wf.batch_id}</span>}
                                </summary>

                                <div className="pl-8">
                                  <div className="pl-4 space-y-3 border-l-2 border-gray-100 dark:border-gray-800">
                                    {(workflowStages[wId] || []).map(sId => {
                                      const st = stages.find(s => s.id === sId);
                                      if (!st) return null;
                                      return (
                                        <details key={sId} className="group/st" open>
                                          <summary className="py-1.5 font-semibold text-md text-gray-700 dark:text-gray-300 flex items-center gap-3 cursor-pointer outline-none select-none hover:text-primary-600 transition-colors list-none [&::-webkit-details-marker]:hidden relative">
                                            <div className="absolute -left-[18px] top-1/2 w-4 h-0.5 bg-gray-100 dark:bg-gray-800"></div>
                                            <ChevronRight size={16} className="group-open/st:rotate-90 transition-transform text-gray-400" />
                                            <GitCommit size={16} className="text-primary-500 dark:text-primary-400" /> {st.name}
                                          </summary>

                                          <div className="pl-8 py-2">
                                            <div className="pl-4 space-y-2 border-l border-dashed border-gray-200 dark:border-gray-700">
                                              {(stageProcesses[sId] || []).length === 0 ? (
                                                <div className="text-xs text-gray-400 italic relative flex items-center">
                                                  <div className="absolute -left-[17px] top-1/2 w-4 h-px bg-gray-200 dark:bg-gray-700"></div>
                                                  No processes
                                                </div>
                                              ) : (
                                                (stageProcesses[sId] || []).map(procId => {
                                                  const proc = processes.find(pr => pr.id === procId);
                                                  if (!proc) return null;
                                                  return (
                                                    <div key={procId} className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2 relative">
                                                      <div className="absolute -left-[17px] top-1/2 w-4 h-px bg-gray-200 dark:bg-gray-700"></div>
                                                      <Settings2 size={14} className="text-primary-400 dark:text-primary-500" /> {proc.name}
                                                    </div>
                                                  )
                                                })
                                              )}
                                            </div>
                                          </div>
                                        </details>
                                      )
                                    })}
                                  </div>
                                </div>
                              </details>
                            )
                          })}
                        </div>

                        {/* Right: Barcode / ID panel */}
                        {p.project_code && (
                          <div className="shrink-0 w-[220px] flex flex-col gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Identifiers</p>

                            {/* Project ID card */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                              <div className="w-full flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project ID</span>
                                <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400"></span>
                              </div>
                              <div className="bg-white rounded p-1 w-full flex justify-center">
                                <Barcode value={p.project_code} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} />
                              </div>
                            </div>

                            {/* Batch ID cards */}
                            {(projectWorkflows[p.id] || []).map(wId => {
                              const wf = workflows.find(w => w.id === wId);
                              if (!wf || !wf.batch_id) return null;
                              return (
                                <div key={wf.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                                  <div className="w-full flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Batch ID</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{wf.name}</p>
                                  <div className="bg-white rounded p-1 w-full flex justify-center">
                                    <Barcode value={wf.batch_id} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    </div>
                  </details>
                )
              })
            )}
          </div>
        )}

        {viewMode === 'create' && (
          <div>
            {/* Bulk action toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                {selectMode
                  ? selectedIds.size > 0
                    ? `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected`
                    : 'Click items to select them'
                  : `${createdItems.length} total items`}
              </p>
              <div className="flex items-center gap-3">
                {selectMode && selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Deleting...' : `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}`}
                  </button>
                )}
                <button
                  onClick={toggleSelectMode}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-colors',
                    selectMode
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                  )}
                >
                  {selectMode ? <><XCircle size={14} /> Cancel</> : <><CheckSquare size={14} /> Select to Delete</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderRecentlyCreated(projects, 'project')}
              {renderRecentlyCreated(workflows, 'workflow')}
              {renderRecentlyCreated(stages, 'stage')}
              {renderRecentlyCreated(processes, 'process')}
            </div>
          </div>
        )}

        {viewMode === 'manage' && (
          <div className="flex gap-8">
            <div className="w-1/3 flex flex-col gap-4">
              <h3 className="text-sm font-black tracking-normal text-gray-400 ">Select Project</h3>
              <div className="flex flex-col gap-2">
                {projects.length === 0 ? (
                  <div className="p-8 border border-gray-200 dark:border-gray-700 border-dashed text-center text-gray-800 dark:text-gray-200 text-sm font-bold">
                    No projects found.<br />Go to Create view first.
                  </div>
                ) : (
                  projects.map(p => (
                    <NoteTarget
                      key={p.id}
                      as="button"
                      targetType="project"
                      targetId={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={clsx(
                        "p-4 border text-left flex items-center justify-between transition-colors",
                        selectedProjectId === p.id
                          ? "border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FolderPlus size={18} />
                        <span className="font-bold">{p.name}</span>
                      </div>
                      <ChevronRight size={18} />
                    </NoteTarget>
                  ))
                )}
              </div>
            </div>

            <div className="w-2/3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 min-h-[500px]">
              {!selectedProjectId ? (
                <div className="h-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold tracking-normal">
                  Select a project to manage
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex flex-col gap-6">
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-center gap-3">
                        <FolderPlus size={28} className="shrink-0" />
                        <span>{projects.find(p => p.id === selectedProjectId)?.name}</span>
                      </h2>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto pb-4">
                      {(() => {
                        const p = projects.find(proj => proj.id === selectedProjectId);
                        if (!p || !p.project_code) return null;
                        return (
                          <div className="flex flex-col xl:flex-row gap-6 w-full">
                            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-[300px]">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Project Details</h4>
                              <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
                                <div className="text-gray-700 dark:text-gray-300">Project Name</div><div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                                <div className="text-gray-700 dark:text-gray-300">Project ID</div><div className="font-bold text-primary-600 dark:text-primary-400">{p.project_code}</div>

                                <div className="text-gray-700 dark:text-gray-300">Product</div><div className="font-semibold text-gray-900 dark:text-gray-100">{p.product}</div>
                                <div className="text-gray-700 dark:text-gray-300">Work Order / Workflow</div><div className="font-semibold text-gray-900 dark:text-gray-100">{projectWorkflows[p.id]?.length > 0 ? projectWorkflows[p.id].map(wId => workflows.find(w => w.id === wId)?.name).filter(Boolean).join(', ') : 'Not Assigned'}</div>
                                {projectWorkflows[p.id]?.some(wId => workflows.find(w => w.id === wId)?.batch_id) && (
                                  <>
                                    <div className="text-gray-700 dark:text-gray-300 self-start pt-0.5">Batch ID</div>
                                    <div className="flex flex-col gap-1">
                                      {projectWorkflows[p.id].map(wId => {
                                        const wf = workflows.find(w => w.id === wId);
                                        if (!wf?.batch_id) return null;
                                        return (
                                          <div key={wId} className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{wf.batch_id}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">({wf.name})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                                <div className="text-gray-700 dark:text-gray-300">Category</div><div className="font-semibold text-gray-900 dark:text-gray-100">{p.category}</div>
                                <div className="text-gray-700 dark:text-gray-300">Start Date</div><div className="font-semibold text-gray-900 dark:text-gray-100">{p.start_date}</div>
                                <div className="text-gray-700 dark:text-gray-300">Target Date</div><div className="font-semibold text-gray-900 dark:text-gray-100">{p.target_date}</div>
                              </div>
                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                className="mt-6 w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 font-bold text-sm transition-colors flex items-center justify-center gap-2 rounded-lg"
                              >
                                <Trash2 size={16} /> Delete Project
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shrink-0">
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Project ID</div>
                                  <Barcode value={p.project_code} format="CODE128" height={52} width={1.3} fontSize={10} margin={2} />
                                </div>
                              </div>

                              <div className="flex gap-4 overflow-x-auto pb-2">
                                {(projectWorkflows[p.id] || []).map(wId => {
                                  const wf = workflows.find(w => w.id === wId);
                                  if (!wf || !wf.batch_id) return null;
                                  return (
                                    <div key={wf.id} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shrink-0">
                                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-1 truncate" title={`Batch ID (${wf.name})`}>Batch ID ({wf.name})</div>
                                      <Barcode value={wf.batch_id} format="CODE128" height={52} width={1.3} fontSize={10} margin={2} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4">
                    <div className="flex items-end gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 ">
                          Assign Workflow
                        </label>
                        <select
                          value={workflowToAssign}
                          onChange={(e) => setWorkflowToAssign(e.target.value)}
                          className="aiq-input"
                        >
                          <option value="">-- Select Workflow --</option>
                          {workflows
                            .filter(w => !(projectWorkflows[selectedProjectId] || []).includes(w.id))
                            .map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                      </div>
                      <button
                        onClick={() => assignWorkflow(selectedProjectId)}
                        disabled={!workflowToAssign}
                        className="aiq-btn-primary h-[42px] px-6 text-sm flex items-center gap-2"
                      >
                        <Plus size={16} /> Assign
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      {(projectWorkflows[selectedProjectId] || []).length === 0 ? (
                        <div className="text-center py-8 text-gray-800 dark:text-gray-200 text-sm font-bold  tracking-normal border border-dashed border-gray-200 dark:border-gray-700">
                          No workflows assigned
                        </div>
                      ) : (
                        (projectWorkflows[selectedProjectId] || []).map(wId => {
                          const wf = workflows.find(w => w.id === wId);
                          if (!wf) return null;
                          return (
                            <NoteTarget as="div" targetType="workflow" targetId={wId} key={wId} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 relative">
                              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md"><GitBranch size={16} /></div>
                                  <span className="font-bold text-lg">{wf.name}</span> {wf.batch_id && <span className="ml-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-600 font-mono tracking-wider">BATCH: {wf.batch_id}</span>}
                                </div>
                                <button onClick={() => removeAssignment(selectedProjectId, wId, setProjectWorkflows)} className="text-red-500 hover:text-red-400 p-2">
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="pl-6 border-l-2 border-gray-100 dark:border-gray-800">
                                <div className="flex items-end gap-3 mb-4">
                                  <div className="flex-1">
                                    <select
                                      value={stageToAssign[wId] || ''}
                                      onChange={(e) => setStageToAssign({ ...stageToAssign, [wId]: e.target.value })}
                                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 px-3 py-1.5 outline-none focus:border-primary-600 font-sans text-xs appearance-none"
                                    >
                                      <option value="">-- Assign Stage --</option>
                                      {stages
                                        .filter(s => !(workflowStages[wId] || []).includes(s.id))
                                        .map(s => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => assignStage(wId)}
                                    disabled={!stageToAssign[wId]}
                                    className="h-8 px-4 border border-gray-200 dark:border-gray-700 text-gray-500 font-bold tracking-normal text-[10px] hover:text-primary-600 hover:border-primary-600 disabled:opacity-50 transition-colors"
                                  >
                                    Assign
                                  </button>
                                </div>

                                <div className="flex flex-col gap-4 mt-4">
                                  {(workflowStages[wId] || []).length === 0 ? (
                                    <div className="text-xs text-gray-500 italic">No stages assigned</div>
                                  ) : (
                                    (workflowStages[wId] || []).map(sId => {
                                      const st = stages.find(s => s.id === sId);
                                      if (!st) return null;
                                      return (
                                        <div key={sId} className="border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
                                          <NoteTarget as="div" targetType="stage" targetId={sId} className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-md font-bold">
                                              <div className="text-primary-500 dark:text-primary-400"><GitCommit size={14} /></div>
                                              {st.name}
                                            </div>
                                            <button onClick={() => removeAssignment(wId, sId, setWorkflowStages)} className="text-gray-400 hover:text-red-500">
                                              <XCircle size={14} />
                                            </button>
                                          </NoteTarget>

                                          <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                                            <div className="flex items-end gap-3 mb-4">
                                              <div className="flex-1">
                                                <select
                                                  value={processToAssign[sId] || ''}
                                                  onChange={(e) => setProcessToAssign({ ...processToAssign, [sId]: e.target.value })}
                                                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 px-3 py-1 outline-none focus:border-primary-600 font-sans text-xs appearance-none"
                                                >
                                                  <option value="">-- Assign Process --</option>
                                                  {processes
                                                    .filter(p => !(stageProcesses[sId] || []).includes(p.id))
                                                    .map(p => (
                                                      <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                              </div>
                                              <button
                                                onClick={() => assignProcess(sId)}
                                                disabled={!processToAssign[sId]}
                                                className="h-6 px-3 border border-gray-200 dark:border-gray-700 text-gray-500 font-bold tracking-normal text-[10px] hover:text-primary-600 hover:border-primary-600 disabled:opacity-50 transition-colors"
                                              >
                                                Assign
                                              </button>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                              {(stageProcesses[sId] || []).length === 0 ? (
                                                <div className="text-xs text-gray-500 italic">No processes assigned</div>
                                              ) : (
                                                (stageProcesses[sId] || []).map(pId => {
                                                  const proc = processes.find(p => p.id === pId);
                                                  if (!proc) return null;
                                                  return (
                                                    <NoteTarget as="div" targetType="process" targetId={pId} key={pId} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-2 pr-3">
                                                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm font-bold">
                                                        <Settings2 size={12} />
                                                        {proc.name}
                                                      </div>
                                                      <button onClick={() => removeAssignment(sId, pId, setStageProcesses)} className="text-gray-400 hover:text-red-500">
                                                        <XCircle size={12} />
                                                      </button>
                                                    </NoteTarget>
                                                  )
                                                })
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            </NoteTarget>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 transition-colors">
              <XCircle size={24} />
            </button>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6 text-primary-600 dark:text-primary-400">
                {getIcon(activeModal, 32)}
                <h2 className="text-2xl font-black tracking-tighter uppercase">{editingItem ? 'Edit' : 'New'} {activeModal}</h2>
              </div>
              <form onSubmit={handleCreate}>
                {/* Linking dropdowns — only shown on create (not edit) */}
                {!editingItem && activeModal === 'workflow' && (
                  <div className="mb-6">
                    <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Project</label>
                    <select
                      value={linkToProjectId}
                      onChange={(e) => setLinkToProjectId(e.target.value)}
                      className="aiq-input"
                    >
                      <option value="">— Select Project (optional) —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingItem && activeModal === 'stage' && (
                  <div className="mb-6 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Project</label>
                      <select
                        value={linkToProjectId}
                        onChange={(e) => { setLinkToProjectId(e.target.value); setLinkToWorkflowId(''); }}
                        className="aiq-input"
                      >
                        <option value="">— Select Project (optional) —</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    {linkToProjectId && (
                      <div>
                        <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Workflow</label>
                        <select
                          value={linkToWorkflowId}
                          onChange={(e) => setLinkToWorkflowId(e.target.value)}
                          className="aiq-input"
                        >
                          <option value="">— Select Workflow —</option>
                          {(projectWorkflows[linkToProjectId] || []).map(wId => {
                            const wf = workflows.find(w => w.id === wId);
                            return wf ? <option key={wId} value={wId}>{wf.name}</option> : null;
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {!editingItem && activeModal === 'process' && (
                  <div className="mb-6 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Project</label>
                      <select
                        value={linkToProjectId}
                        onChange={(e) => { setLinkToProjectId(e.target.value); setLinkToWorkflowId(''); setLinkToStageId(''); }}
                        className="aiq-input"
                      >
                        <option value="">— Select Project (optional) —</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    {linkToProjectId && (
                      <div>
                        <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Workflow</label>
                        <select
                          value={linkToWorkflowId}
                          onChange={(e) => { setLinkToWorkflowId(e.target.value); setLinkToStageId(''); }}
                          className="aiq-input"
                        >
                          <option value="">— Select Workflow —</option>
                          {(projectWorkflows[linkToProjectId] || []).map(wId => {
                            const wf = workflows.find(w => w.id === wId);
                            return wf ? <option key={wId} value={wId}>{wf.name}</option> : null;
                          })}
                        </select>
                      </div>
                    )}
                    {linkToWorkflowId && (
                      <div>
                        <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Link to Stage</label>
                        <select
                          value={linkToStageId}
                          onChange={(e) => setLinkToStageId(e.target.value)}
                          className="aiq-input"
                        >
                          <option value="">— Select Stage —</option>
                          {(workflowStages[linkToWorkflowId] || []).map(sId => {
                            const st = stages.find(s => s.id === sId);
                            return st ? <option key={sId} value={sId}>{st.name}</option> : null;
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-8">
                  <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">{activeModal} Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => { setName(e.target.value); setModalError(''); }}
                    placeholder={`ENTER ${activeModal.toUpperCase()} NAME...`}
                    className={`aiq-input ${modalError ? 'border-red-400 focus:border-red-500 dark:border-red-500' : ''}`}
                    required
                  />
                  {modalError && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">{modalError}</p>
                    </div>
                  )}
                </div>

                {/* Image type checkboxes — process only */}
                {activeModal === 'process' && (
                  <div className="mb-8">
                    <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-3 uppercase">
                      Image Upload Types
                      <span className="ml-2 text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500">
                        (leave unchecked to allow all)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {IMAGE_TYPES.map(type => (
                        <label
                          key={type}
                          className={clsx(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none text-xs font-semibold',
                            allowedImageTypes.includes(type)
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-primary-600 w-3.5 h-3.5 shrink-0"
                            checked={allowedImageTypes.includes(type)}
                            onChange={() => toggleImageType(type)}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {activeModal === 'project' && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Product</label>
                      <input type="text" value={product} onChange={e => setProduct(e.target.value)} className="aiq-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Category</label>
                      <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="aiq-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="aiq-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Target Date</label>
                      <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="aiq-input" />
                    </div>

                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <button type="button" onClick={handleCloseModal} className="aiq-btn-ghost">
                    CANCEL
                  </button>
                  <button type="submit" disabled={!name.trim()} className="aiq-btn-primary">
                    {editingItem ? 'SAVE CHANGES' : 'CREATE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}