import React, { useState, useEffect, useCallback } from 'react';
import { FolderPlus, GitCommit, GitBranch, XCircle, CheckCircle, ChevronRight, Plus, Settings2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import QRCode from 'react-qr-code';
import { getPWSItems, createPWSItem, updatePWSItem, getPWSAssignments, createPWSAssignment, deletePWSAssignment } from '../api/client';
import NoteTarget from '../components/NoteTarget';

export default function CreatePWS() {
  const [activeModal, setActiveModal] = useState(null);
  const [name, setName] = useState('');
  const [createdItems, setCreatedItems] = useState([]);
  
  // Management State
  const [manageMode, setManageMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectWorkflows, setProjectWorkflows] = useState({}); // { projectId: [workflowId, ...] }
  const [workflowStates, setWorkflowStates] = useState({}); // { workflowId: [stateId, ...] }
  
  // Dropdown states for assignment
  const [workflowToAssign, setWorkflowToAssign] = useState('');
  const [stateToAssign, setStateToAssign] = useState({}); // { workflowId: stateIdToAssign }
  
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
      (assignments || []).forEach(assign => {
        const parent = items.find(i => i.id === assign.parent_id);
        const child = items.find(i => i.id === assign.child_id);
        if (parent && child) {
          if (parent.type === 'project' && child.type === 'workflow') {
            pwMap[parent.id] = [...(pwMap[parent.id] || []), child.id];
          } else if (parent.type === 'workflow' && child.type === 'state') {
            wsMap[parent.id] = [...(wsMap[parent.id] || []), child.id];
          }
        }
      });
      setProjectWorkflows(pwMap);
      setWorkflowStates(wsMap);
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
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem = {
      id: `pws_${Date.now()}`,
      type: activeModal,
      name: name.trim(),
    };

    try {
      const { data } = await createPWSItem(newItem);
      setCreatedItems((prev) => [data, ...prev]);
      handleCloseModal();
    } catch (err) {
      console.error('Failed to create item:', err);
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

  const assignState = async (workflowId) => {
    const sToAssign = stateToAssign[workflowId];
    if (!sToAssign) return;
    try {
      await createPWSAssignment({ parent_id: workflowId, child_id: sToAssign });
      setWorkflowStates(prev => ({
        ...prev,
        [workflowId]: [...(prev[workflowId] || []), sToAssign]
      }));
      setStateToAssign(prev => ({ ...prev, [workflowId]: '' }));
    } catch (err) {
      console.error('Failed to assign state:', err);
    }
  };

  const removeWorkflow = async (projectId, workflowId) => {
    try {
      await deletePWSAssignment(projectId, workflowId);
      setProjectWorkflows(prev => ({
        ...prev,
        [projectId]: prev[projectId].filter(id => id !== workflowId)
      }));
    } catch (err) {
      console.error('Failed to remove workflow:', err);
    }
  };

  const removeState = async (workflowId, stateId) => {
    try {
      await deletePWSAssignment(workflowId, stateId);
      setWorkflowStates(prev => ({
        ...prev,
        [workflowId]: prev[workflowId].filter(id => id !== stateId)
      }));
    } catch (err) {
      console.error('Failed to remove state:', err);
    }
  };

  const getIcon = (type, size = 24) => {
    switch(type) {
      case 'project': return <FolderPlus size={size} />;
      case 'state': return <GitCommit size={size} />;
      case 'workflow': return <GitBranch size={size} />;
      default: return null;
    }
  };

  const projects = createdItems.filter(i => i.type === 'project');
  const workflows = createdItems.filter(i => i.type === 'workflow');
  const states = createdItems.filter(i => i.type === 'state');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col -m-8 p-8 relative">
      <div className="max-w-6xl mx-auto w-full pb-20">
        
        {/* Header */}
        <div className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter  text-primary-600">
              {manageMode ? 'Manage Project' : 'Create P/W/S'}
            </h1>
            <div className="text-sm font-bold tracking-normal text-gray-500 dark:text-gray-400 mt-2 ">
              Project · Workflow · State Management
            </div>
          </div>
          
          <button 
            onClick={() => setManageMode(!manageMode)}
            className="flex items-center gap-2 border border-primary-600 text-primary-600 px-6 py-3 font-black  tracking-normal text-xs hover:bg-[#FCD535] hover:text-black transition-colors"
          >
            {manageMode ? (
              <>Back to Creation</>
            ) : (
              <><Settings2 size={16} /> Manage Project</>
            )}
          </button>
        </div>

        {!manageMode ? (
          <>
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <button onClick={() => handleOpenModal('project')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <FolderPlus size={32} />
                </div>
                <h2 className="text-xl font-black font-semibold tracking-normal">Create Project</h2>
              </button>

              <button onClick={() => handleOpenModal('state')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <GitCommit size={32} />
                </div>
                <h2 className="text-xl font-black font-semibold tracking-normal">Create State</h2>
              </button>

              <button onClick={() => handleOpenModal('workflow')} className="card-brutal-dark border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-primary-600 hover:bg-[#FCD535]/5 transition-all group">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                  <GitBranch size={32} />
                </div>
                <h2 className="text-xl font-black font-semibold tracking-normal">Create Workflow</h2>
              </button>
            </div>

            {/* Recent Creations */}
            {createdItems.length > 0 && (
              <div>
                <h3 className="text-sm font-black tracking-normal text-primary-600 mb-4 ">Recently Created</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Projects Column */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400  tracking-normal mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">Projects</h4>
                    {projects.length === 0 ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic">No projects created yet</div>
                    ) : (
                      projects.map((item, idx) => (
                        <NoteTarget
                          key={item.id} 
                          targetType="project"
                          targetId={item.id}
                          className={clsx("flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700", idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900')}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-primary-600">{getIcon(item.type, 20)}</div>
                            <div className="text-sm font-bold truncate max-w-[100px]">{item.name}</div>
                          </div>
                          <CheckCircle size={14} className="text-emerald-500" />
                        </NoteTarget>
                      ))
                    )}
                  </div>

                  {/* States Column */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400  tracking-normal mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">States</h4>
                    {states.length === 0 ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic">No states created yet</div>
                    ) : (
                      states.map((item, idx) => (
                        <NoteTarget 
                          key={item.id} 
                          targetType="state"
                          targetId={item.id}
                          className={clsx("flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700", idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900')}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-primary-600">{getIcon(item.type, 20)}</div>
                            <div className="text-sm font-bold truncate max-w-[100px]">{item.name}</div>
                          </div>
                          <CheckCircle size={14} className="text-emerald-500" />
                        </NoteTarget>
                      ))
                    )}
                  </div>

                  {/* Workflows Column */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400  tracking-normal mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">Workflows</h4>
                    {workflows.length === 0 ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic">No workflows created yet</div>
                    ) : (
                      workflows.map((item, idx) => (
                        <NoteTarget 
                          key={item.id} 
                          targetType="workflow"
                          targetId={item.id}
                          className={clsx("flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700", idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900')}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-primary-600">{getIcon(item.type, 20)}</div>
                            <div className="text-sm font-bold truncate max-w-[100px]">{item.name}</div>
                          </div>
                          <CheckCircle size={14} className="text-emerald-500" />
                        </NoteTarget>
                      ))
                    )}
                  </div>

                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-8">
            {/* Left: Project List */}
            <div className="w-1/3 flex flex-col gap-4">
              <h3 className="text-sm font-black tracking-normal text-gray-400 ">Select Project</h3>
              <div className="flex flex-col gap-2">
                {projects.length === 0 ? (
                  <div className="p-8 border border-gray-200 dark:border-gray-700 border-dashed text-center text-gray-600 dark:text-gray-400 text-sm font-bold">
                    No projects found.<br/>Go back and create one.
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
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-500 text-gray-300"
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

            {/* Right: Project Hierarchy */}
            <div className="w-2/3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 min-h-[500px]">
              {!selectedProjectId ? (
                <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold font-semibold tracking-normal">
                  Select a project to manage
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-black  tracking-tighter text-primary-600 flex items-center gap-3">
                        <FolderPlus size={28} />
                        {projects.find(p => p.id === selectedProjectId)?.name}
                      </h2>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {!projectIds[selectedProjectId] ? (
                        <button 
                          onClick={async () => {
                            const newId = Math.floor(10000 + Math.random() * 90000).toString();
                            try {
                              await updatePWSItem(selectedProjectId, { project_code: newId });
                              setProjectIds(prev => ({...prev, [selectedProjectId]: newId}));
                            } catch (err) {
                              console.error("Failed to save Project ID", err);
                            }
                          }}
                          className="px-4 py-2 border border-primary-600 text-primary-600 font-black text-xs hover:bg-[#FCD535] hover:border-[#FCD535] hover:text-black transition-colors"
                        >
                          Generate ID & QR
                        </button>
                      ) : (
                        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col items-end justify-center pr-4 border-r border-gray-200 dark:border-gray-700">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Project ID</span>
                            <span className="text-xl font-black text-primary-600 tracking-widest">{projectIds[selectedProjectId]}</span>
                          </div>
                          <div className="bg-white p-1">
                            <QRCode value={projectIds[selectedProjectId]} size={48} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4">
                    {/* Assign Workflow */}
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

                    {/* Assigned Workflows List */}
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
                                <button onClick={() => removeWorkflow(selectedProjectId, wId)} className="text-red-500 hover:text-red-400 p-2">
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              {/* States Assignment under Workflow */}
                              <div className="pl-6 border-l-2 border-gray-100 dark:border-gray-800">
                                <div className="flex items-end gap-3 mb-4">
                                  <div className="flex-1">
                                    <select 
                                      value={stateToAssign[wId] || ''}
                                      onChange={(e) => setStateToAssign({...stateToAssign, [wId]: e.target.value})}
                                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-300 px-3 py-1.5 outline-none focus:border-primary-600 font-sans text-xs appearance-none"
                                    >
                                      <option value="">-- Assign State --</option>
                                      {states
                                        .filter(s => !(workflowStates[wId] || []).includes(s.id))
                                        .map(s => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button 
                                    onClick={() => assignState(wId)}
                                    disabled={!stateToAssign[wId]}
                                    className="h-8 px-4 border border-gray-200 dark:border-gray-700 text-gray-400 font-bold  tracking-normal text-[10px] hover:text-primary-600 hover:border-primary-600 disabled:opacity-50 transition-colors"
                                  >
                                    Assign
                                  </button>
                                </div>

                                {/* Assigned States List */}
                                <div className="flex flex-col gap-2 mt-4">
                                  {(workflowStates[wId] || []).length === 0 ? (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 italic">No states assigned</div>
                                  ) : (
                                    (workflowStates[wId] || []).map(sId => {
                                      const st = states.find(s => s.id === sId);
                                      if (!st) return null;
                                      return (
                                        <NoteTarget as="div" targetType="state" targetId={sId} key={sId} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-2 pr-3">
                                          <div className="flex items-center gap-2 text-gray-300 text-sm font-bold">
                                            <div className="text-emerald-500"><GitCommit size={14}/></div>
                                            {st.name}
                                          </div>
                                          <button onClick={() => removeState(wId, sId)} className="text-gray-500 dark:text-gray-400 hover:text-red-500">
                                            <XCircle size={14} />
                                          </button>
                                        </NoteTarget>
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
        <div className="fixed inset-0 bg-white dark:bg-gray-800/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl relative">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors">
              <XCircle size={24} />
            </button>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-primary-600">{getIcon(activeModal, 32)}</div>
                <h2 className="text-2xl font-black  tracking-tighter">New {activeModal}</h2>
              </div>
              <form onSubmit={handleCreate}>
                <div className="mb-8">
                  <label className="block text-xs font-bold tracking-normal text-gray-400 mb-2 ">{activeModal} Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`ENTER ${activeModal.toUpperCase()} NAME...`}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 outline-none focus:border-primary-600 transition-colors font-sans text-sm"
                    required
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button type="button" onClick={handleCloseModal} className="px-6 py-2 border border-gray-200 dark:border-gray-700 text-gray-400 font-bold  tracking-normal text-xs hover:bg-[#222] hover:text-gray-900 dark:text-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!name.trim()} className="px-6 py-2 bg-[#FCD535] text-black font-black  tracking-normal text-xs hover:bg-white dark:bg-gray-800 disabled:opacity-50 transition-colors">
                    Create
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
