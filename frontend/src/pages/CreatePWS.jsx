import React, { useState, useEffect, useCallback } from 'react';
import { FolderPlus, GitCommit, GitBranch, XCircle, CheckCircle, ChevronRight, Plus, Settings2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import QRCode from 'react-qr-code';
import { getPWSItems, createPWSItem, updatePWSItem, deletePWSItem, getPWSAssignments, createPWSAssignment, deletePWSAssignment } from '../api/client';
import NoteTarget from '../components/NoteTarget';

export default function CreatePWS() {
  const [viewMode, setViewMode] = useState('tree'); // 'tree', 'create', 'manage'
  const [activeModal, setActiveModal] = useState(null);
  const [name, setName] = useState('');
  const [product, setProduct] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [createdItems, setCreatedItems] = useState([]);
  
  // Management State
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectWorkflows, setProjectWorkflows] = useState({}); // { projectId: [workflowId, ...] }
  const [workflowStages, setWorkflowStages] = useState({}); // { workflowId: [stageId, ...] }
  const [stageProcesses, setStageProcesses] = useState({}); // { stageId: [processId, ...] }
  
  // Dropdown states for assignment
  const [workflowToAssign, setWorkflowToAssign] = useState('');
  const [stageToAssign, setStageToAssign] = useState({}); // { workflowId: stageIdToAssign }
  const [processToAssign, setProcessToAssign] = useState({}); // { stageId: processIdToAssign }
  
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
    setActiveModal(type);
    setName('');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setName('');
    setProduct('');
    setWorkOrder('');
    setCategory('');
    setStartDate('');
    setTargetDate('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem = {
      id: `pws_${Date.now()}`,
      type: activeModal,
      name: name.trim(),
    };

    if (activeModal === 'project') {
      newItem.product = product;
      newItem.work_order = workOrder;
      newItem.category = category;
      newItem.start_date = startDate;
      newItem.target_date = targetDate;
    }

    try {
      const { data } = await createPWSItem(newItem);
      setCreatedItems((prev) => [data, ...prev]);
      handleCloseModal();
    } catch (err) {
      console.error('Failed to create item:', err);
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
    switch(type) {
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

  const renderRecentlyCreated = (items, typeLabel) => (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-normal mb-2 border-b border-gray-200 dark:border-gray-700 pb-2 capitalize">{typeLabel}s</h4>
      {items.length === 0 ? (
        <div className="text-xs text-gray-600 dark:text-gray-400 italic">No {typeLabel}s created yet</div>
      ) : (
        items.map((item, idx) => (
          <NoteTarget 
            key={item.id} 
            targetType={item.type}
            targetId={item.id}
            className={clsx("flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700", idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900')}
          >
            <div className="flex items-center gap-4">
              <div className="text-primary-600">{getIcon(item.type, 20)}</div>
              <div className="text-sm font-bold truncate max-w-[100px]" title={item.name}>{item.name}</div>
            </div>
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
          </NoteTarget>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col -m-8 p-8 relative">
      <div className="max-w-7xl mx-auto w-full pb-20">
        
        {/* Header */}
        <div className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-primary-600">
              {viewMode === 'tree' ? 'Project Hierarchy' : viewMode === 'create' ? 'Create Items' : 'Manage Project'}
            </h1>
            <div className="text-sm font-bold tracking-normal text-gray-500 dark:text-gray-400 mt-2 ">
              Project · Workflow · Stage · Process
            </div>
          </div>
          
          <div className="flex gap-4">
            {viewMode !== 'tree' && (
              <button 
                onClick={() => setViewMode('tree')}
                className="flex items-center gap-2 border border-gray-300 text-gray-600 px-6 py-3 font-black tracking-normal text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Tree
              </button>
            )}
            {viewMode !== 'create' && (
              <button 
                onClick={() => setViewMode('create')}
                className="flex items-center gap-2 border border-primary-600 text-primary-600 px-6 py-3 font-black tracking-normal text-xs hover:bg-[#FCD535] hover:border-[#FCD535] hover:text-black transition-colors"
              >
                <Plus size={16} /> Create
              </button>
            )}
            {viewMode !== 'manage' && (
              <button 
                onClick={() => setViewMode('manage')}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 font-black tracking-normal text-xs hover:bg-primary-700 transition-colors"
              >
                <Settings2 size={16} /> Manage Project
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
              projects.map(p => (
                <details key={p.id} className="group border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" open>
                  <summary className="p-4 font-black text-xl text-primary-600 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-3">
                      <ChevronRight size={24} className="group-open:rotate-90 transition-transform text-gray-400"/>
                      <FolderPlus size={24}/> {p.name}
                    </div>
                    {p.project_code && (
                      <div className="flex items-center gap-3 text-xs tracking-wider">
                        <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 border border-primary-200 dark:border-primary-800">
                          ID: {p.project_code}
                        </span>
                        {p.batch_id && (
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 border border-gray-200 dark:border-gray-700">
                            BATCH: {p.batch_id}
                          </span>
                        )}
                      </div>
                    )}
                  </summary>
                  
                  <div className="pl-6 pb-6 pr-6">
                    {(p.product || p.work_order || p.category || p.start_date || p.target_date) && (
                      <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-8 gap-y-4 text-sm">
                        {p.product && <div><span className="text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Product</span><span className="font-bold text-gray-800 dark:text-gray-200">{p.product}</span></div>}
                        {p.work_order && <div><span className="text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Work Order</span><span className="font-bold text-gray-800 dark:text-gray-200">{p.work_order}</span></div>}
                        {p.category && <div><span className="text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Category</span><span className="font-bold text-gray-800 dark:text-gray-200">{p.category}</span></div>}
                        {p.start_date && <div><span className="text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Start Date</span><span className="font-bold text-gray-800 dark:text-gray-200">{p.start_date}</span></div>}
                        {p.target_date && <div><span className="text-gray-400 text-[10px] block mb-0.5 uppercase font-bold tracking-wider">Target Date</span><span className="font-bold text-gray-800 dark:text-gray-200">{p.target_date}</span></div>}
                      </div>
                    )}
                    <div className="pl-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {(projectWorkflows[p.id] || []).map(wId => {
                        const wf = workflows.find(w => w.id === wId);
                        if (!wf) return null;
                        return (
                          <details key={wId} className="group/wf" open>
                            <summary className="py-2 font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-3 cursor-pointer outline-none select-none hover:text-primary-600 transition-colors list-none [&::-webkit-details-marker]:hidden relative">
                              <div className="absolute -left-[18px] top-1/2 w-4 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                              <ChevronRight size={18} className="group-open/wf:rotate-90 transition-transform text-gray-400"/>
                              <GitBranch size={18} className="text-gray-500"/> {wf.name}
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
                                        <ChevronRight size={16} className="group-open/st:rotate-90 transition-transform text-gray-400"/>
                                        <GitCommit size={16} className="text-emerald-500"/> {st.name}
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
                                                <div key={procId} className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2 relative">
                                                  <div className="absolute -left-[17px] top-1/2 w-4 h-px bg-gray-200 dark:bg-gray-700"></div>
                                                  <Settings2 size={14} className="text-gray-400"/> {proc.name}
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
                  </div>
                </details>
              ))
            )}
          </div>
        )}

        {viewMode === 'create' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <button onClick={() => handleOpenModal('project')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <FolderPlus size={32} />
                </div>
                <h2 className="text-lg font-black tracking-normal">Create Project</h2>
              </button>

              <button onClick={() => handleOpenModal('workflow')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <GitBranch size={32} />
                </div>
                <h2 className="text-lg font-black tracking-normal">Create Workflow</h2>
              </button>
              
              <button onClick={() => handleOpenModal('stage')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <GitCommit size={32} />
                </div>
                <h2 className="text-lg font-black tracking-normal">Create Stage</h2>
              </button>

              <button onClick={() => handleOpenModal('process')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <Settings2 size={32} />
                </div>
                <h2 className="text-lg font-black tracking-normal">Create Process</h2>
              </button>
            </div>

            {createdItems.length > 0 && (
              <div>
                <h3 className="text-sm font-black tracking-normal text-primary-600 mb-4 ">Recently Created</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {renderRecentlyCreated(projects, 'project')}
                  {renderRecentlyCreated(workflows, 'workflow')}
                  {renderRecentlyCreated(stages, 'stage')}
                  {renderRecentlyCreated(processes, 'process')}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'manage' && (
          <div className="flex gap-8">
            <div className="w-1/3 flex flex-col gap-4">
              <h3 className="text-sm font-black tracking-normal text-gray-400 ">Select Project</h3>
              <div className="flex flex-col gap-2">
                {projects.length === 0 ? (
                  <div className="p-8 border border-gray-200 dark:border-gray-700 border-dashed text-center text-gray-600 dark:text-gray-400 text-sm font-bold">
                    No projects found.<br/>Go to Create view first.
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
                          ? "border-primary-600 bg-[#FCD535]/10 text-primary-600" 
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-500 text-gray-500"
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

            <div className="w-2/3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 min-h-[500px]">
              {!selectedProjectId ? (
                <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold tracking-normal">
                  Select a project to manage
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-center gap-3">
                        <FolderPlus size={28} />
                        {projects.find(p => p.id === selectedProjectId)?.name}
                      </h2>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {(() => {
                        const p = projects.find(proj => proj.id === selectedProjectId);
                        if (!p || !p.project_code) return null;
                        return (
                          <div className="flex gap-6">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 min-w-[300px]">
                              <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4">Project Batch Details</h4>
                              <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
                                <div className="text-gray-500">Project Name</div><div className="font-bold">{p.name}</div>
                                <div className="text-gray-500">Project ID</div><div className="font-bold text-primary-600">{p.project_code}</div>
                                <div className="text-gray-500">Batch ID</div><div className="font-bold text-primary-600">{p.batch_id}</div>
                                <div className="text-gray-500">Product</div><div className="font-bold">{p.product}</div>
                                <div className="text-gray-500">Work Order</div><div className="font-bold">{p.work_order}</div>
                                <div className="text-gray-500">Category</div><div className="font-bold">{p.category}</div>
                                <div className="text-gray-500">Start Date</div><div className="font-bold">{p.start_date}</div>
                                <div className="text-gray-500">Target Date</div><div className="font-bold">{p.target_date}</div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-4">
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                                <div className="text-xs text-gray-500 mb-1">Project ID</div>
                                <div className="text-xl font-black text-primary-600 mb-2">{p.project_code}</div>
                                <QRCode value={p.project_code} size={64} />
                              </div>
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                                <div className="text-xs text-gray-500 mb-1">Batch ID</div>
                                <div className="text-xl font-black text-primary-600 mb-2">{p.batch_id}</div>
                                <QRCode value={p.batch_id} size={64} />
                              </div>
                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                className="mt-auto px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                              >
                                <Trash2 size={16} /> Delete Project
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4">
                    <div className="flex items-end gap-4 mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                      <div className="flex-1">
                        <label className="block text-xs font-bold tracking-normal text-gray-400 mb-2 ">
                          Assign Workflow
                        </label>
                        <select 
                          value={workflowToAssign}
                          onChange={(e) => setWorkflowToAssign(e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 font-sans text-sm appearance-none"
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
                        className="h-10 px-6 bg-[#FCD535] text-black font-black  tracking-normal text-xs hover:bg-white dark:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} /> Assign
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      {(projectWorkflows[selectedProjectId] || []).length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400 text-sm font-bold  tracking-normal border border-dashed border-gray-200 dark:border-gray-700">
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
                                  <div className="p-2 bg-[#222] text-primary-600"><GitBranch size={16}/></div>
                                  <span className="font-bold text-lg">{wf.name}</span>
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
                                      onChange={(e) => setStageToAssign({...stageToAssign, [wId]: e.target.value})}
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
                                              <div className="text-emerald-500"><GitCommit size={14}/></div>
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
                                                  onChange={(e) => setProcessToAssign({...processToAssign, [sId]: e.target.value})}
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
                                                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-bold">
                                                        <Settings2 size={12}/>
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
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] relative">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors">
              <XCircle size={24} />
            </button>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6 text-primary-600">
                {getIcon(activeModal, 32)}
                <h2 className="text-2xl font-black tracking-tighter uppercase">New {activeModal}</h2>
              </div>
              <form onSubmit={handleCreate}>
                <div className="mb-8">
                  <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">{activeModal} Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`ENTER ${activeModal.toUpperCase()} NAME...`}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold"
                    required
                  />
                </div>
                {activeModal === 'project' && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">Product</label>
                      <input type="text" value={product} onChange={e => setProduct(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">Work Order</label>
                      <input type="text" value={workOrder} onChange={e => setWorkOrder(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">Category</label>
                      <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 mb-2 uppercase">Target Date</label>
                      <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none focus:border-primary-600 transition-colors font-sans text-sm font-bold" />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={handleCloseModal} className="px-6 py-2 text-gray-500 font-bold tracking-normal text-xs hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    CANCEL
                  </button>
                  <button type="submit" disabled={!name.trim()} className="btn-brutal-dark px-6 py-2 text-black font-black tracking-normal text-xs transition-colors">
                    CREATE
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
