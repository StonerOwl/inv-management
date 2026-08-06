import React, { useState, useEffect, useCallback } from 'react';
import { Package, FolderPlus, GitCommit, GitBranch, ChevronRight, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import ClickableBarcode from '../components/ClickableBarcode';
import { getPWSItems, getPWSAssignments, listManagedProducts } from '../api/client';

export default function ViewHierarchy() {
  const [createdItems, setCreatedItems] = useState([]);
  const [managedProducts, setManagedProducts] = useState([]);
  const [projectWorkflows, setProjectWorkflows] = useState({});
  const [workflowStages, setWorkflowStages] = useState({});
  const [stageProcesses, setStageProcesses] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [{ data: items }, { data: assignments }, { data: products }] = await Promise.all([
        getPWSItems(),
        getPWSAssignments(),
        listManagedProducts()
      ]);

      setCreatedItems(items || []);
      setManagedProducts(products?.items || []);

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
      console.error('Failed to load hierarchy data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const projects = createdItems.filter(i => i.type === 'project');
  const workflows = createdItems.filter(i => i.type === 'workflow');
  const stages = createdItems.filter(i => i.type === 'stage');
  const processes = createdItems.filter(i => i.type === 'process');

  const managedProductNames = new Set(managedProducts.map(p => p.name));
  const unassignedProjects = projects.filter(p => !p.product || !managedProductNames.has(p.product));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col -m-8 p-8 relative">
      <div className="max-w-7xl mx-auto w-full pb-20">
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              Full Hierarchy
            </h1>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
              View products and their related projects, workflows, stages, and processes.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {managedProducts.length === 0 && unassignedProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-bold border-2 border-dashed border-gray-200 dark:border-gray-700">
              No products or projects found.
            </div>
          ) : (
            <>
            {managedProducts.map(product => {
              const productProjects = projects.filter(p => p.product === product.name);
              
              return (
                <details key={product.id} className="group/prod aiq-card overflow-hidden mb-6" open>
                  <summary className="p-5 font-black text-xl text-gray-900 dark:text-gray-100 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <ChevronRight size={24} className="group-open/prod:rotate-90 transition-transform text-gray-400" />
                      <Package size={24} className="text-primary-600 dark:text-primary-400" /> {product.name}
                    </div>
                  </summary>

                  <div className="p-6 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800">
                    {productProjects.length === 0 ? (
                       <div className="text-sm text-gray-400 italic">No projects assigned to this product.</div>
                    ) : (
                      <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                        {productProjects.map(p => {
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
                            <details key={p.id} className="group aiq-card overflow-hidden" open>
                              <summary className="p-4 font-bold text-lg text-gray-900 dark:text-gray-100 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-white dark:hover:bg-gray-800 transition-colors list-none [&::-webkit-details-marker]:hidden border-b border-transparent group-open:border-gray-100 dark:group-open:border-gray-800">
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

                              <div className="p-6 bg-white dark:bg-gray-900/50">
                                {(projectWorkflows[p.id]?.length > 0 || p.category || p.start_date || p.target_date) && (
                                  <div className="mb-5 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-x-10 gap-y-3 text-sm">
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

                                <div className="flex gap-5 items-start">
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

                                  {p.project_code && (
                                    <div className="shrink-0 w-[220px] flex flex-col gap-3">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Identifiers</p>
                                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                                        <div className="w-full flex items-center justify-between mb-1">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project ID</span>
                                          <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400"></span>
                                        </div>
                                        <div className="bg-white rounded p-1 w-full flex justify-center">
                                          <ClickableBarcode value={p.project_code} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} label="Project ID" />
                                        </div>
                                      </div>
                                      {(projectWorkflows[p.id] || []).map(wId => {
                                        const wf = workflows.find(w => w.id === wId);
                                        if (!wf || !wf.batch_id) return null;
                                        return (
                                          <div key={wf.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                                            <div className="w-full flex items-center justify-between mb-1">
                                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Batch ID</span>
                                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{wf.name}</p>
                                            <div className="bg-white rounded p-1 w-full flex justify-center">
                                              <ClickableBarcode value={wf.batch_id} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} label="Batch ID" />
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
                        })}
                      </div>
                    )}
                  </div>
                </details>
              )
            })}
            </>
          )}

          {/* Unassigned Projects — projects without a product */}
          {unassignedProjects.length > 0 && (
            <details className="group/unassigned aiq-card overflow-hidden mb-6" open>
              <summary className="p-5 font-black text-xl text-gray-900 dark:text-gray-100 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <ChevronRight size={24} className="group-open/unassigned:rotate-90 transition-transform text-gray-400" />
                  <FolderPlus size={24} className="text-amber-500 dark:text-amber-400" />
                  <span>Unassigned Projects</span>
                  <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">{unassignedProjects.length}</span>
                </div>
              </summary>

              <div className="p-6 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {unassignedProjects.map(p => {
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
                      <details key={p.id} className="group aiq-card overflow-hidden" open>
                        <summary className="p-4 font-bold text-lg text-gray-900 dark:text-gray-100 flex justify-between items-center cursor-pointer outline-none select-none hover:bg-white dark:hover:bg-gray-800 transition-colors list-none [&::-webkit-details-marker]:hidden border-b border-transparent group-open:border-gray-100 dark:group-open:border-gray-800">
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

                        <div className="p-6 bg-white dark:bg-gray-900/50">
                          {(projectWorkflows[p.id]?.length > 0 || p.category || p.start_date || p.target_date) && (
                            <div className="mb-5 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-x-10 gap-y-3 text-sm">
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

                          <div className="flex gap-5 items-start">
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

                            {p.project_code && (
                              <div className="shrink-0 w-[220px] flex flex-col gap-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Identifiers</p>
                                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                                  <div className="w-full flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project ID</span>
                                    <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400"></span>
                                  </div>
                                  <div className="bg-white rounded p-1 w-full flex justify-center">
                                    <ClickableBarcode value={p.project_code} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} label="Project ID" />
                                  </div>
                                </div>
                                {(projectWorkflows[p.id] || []).map(wId => {
                                  const wf = workflows.find(w => w.id === wId);
                                  if (!wf || !wf.batch_id) return null;
                                  return (
                                    <div key={wf.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                                      <div className="w-full flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Batch ID</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      </div>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{wf.name}</p>
                                      <div className="bg-white rounded p-1 w-full flex justify-center">
                                        <ClickableBarcode value={wf.batch_id} format="CODE128" height={48} width={1.2} fontSize={9} margin={2} label="Batch ID" />
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
                  })}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
