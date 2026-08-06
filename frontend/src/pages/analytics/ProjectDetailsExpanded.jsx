import React, { useState, useEffect, useRef } from 'react';
import { getProjectAnalytics } from '../../api/client';
import html2pdf from 'html2pdf.js';
import { 
  Download, Loader2, Package, GitBranch, GitCommit, Settings2, 
  Hash, Calendar, Tag, FileText, CheckCircle 
} from 'lucide-react';
import ClickableBarcode from '../../components/ClickableBarcode';

export default function ProjectDetailsExpanded({ projectId, project }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getProjectAnalytics(projectId)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const generatePDF = () => {
    if (!containerRef.current || !data) return;
    setGenerating(true);
    
    const element = containerRef.current;
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `Project_${project.name || projectId}_Details.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setGenerating(false);
    });
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center text-gray-500">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div className="py-8 text-center text-gray-500">
        Failed to load project details.
      </div>
    );
  }

  const { project: p, workflows = [], invoices = [], inventory_items = [] } = data;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl m-4 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FileText size={18} className="text-primary-600" />
          Project Details Report
        </h3>
        <button 
          onClick={generatePDF}
          disabled={generating}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {generating ? 'Generating PDF...' : 'Save as PDF'}
        </button>
      </div>

      <div ref={containerRef} className="p-8 bg-white dark:bg-gray-900 print-container text-gray-800 dark:text-gray-200 text-sm">
        {/* PDF Header Section */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{p.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Project ID: {p.project_code || p.id}</p>
        </div>

        {/* Project Meta and Barcodes */}
        <div className="flex flex-col xl:flex-row gap-6 w-full mb-10">
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 min-w-[300px]">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-6">Project Details</h4>
            <div className="grid grid-cols-[140px_1fr] gap-y-3 text-xs">
              <div className="text-gray-500 dark:text-gray-400">Project Name</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
              
              <div className="text-gray-500 dark:text-gray-400">Project ID</div>
              <div className="font-bold text-primary-600 dark:text-primary-400">{p.project_code || p.id}</div>
              
              <div className="text-gray-500 dark:text-gray-400">Product</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{p.product || 'N/A'}</div>
              
              <div className="text-gray-500 dark:text-gray-400">Work Order / Workflow</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
                {workflows.length > 0 ? workflows.map(w => w.name).join(', ') : 'Not Assigned'}
              </div>
              
              {workflows.some(w => w.batch_id) && (
                <>
                  <div className="text-gray-500 dark:text-gray-400 self-start pt-0.5">Batch ID</div>
                  <div className="flex flex-col gap-1">
                    {workflows.map(wf => wf.batch_id && (
                      <div key={wf.id} className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{wf.batch_id}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">({wf.name})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="text-gray-500 dark:text-gray-400 mt-2">Category</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-2">{p.category || 'N/A'}</div>
              
              <div className="text-gray-500 dark:text-gray-400">Start Date</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{p.start_date || 'N/A'}</div>
              
              <div className="text-gray-500 dark:text-gray-400">Target Date</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{p.target_date || 'N/A'}</div>
            </div>
          </div>

          <div className="flex flex-col gap-6 flex-1">
            <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shrink-0 w-max max-w-full overflow-hidden">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Project ID</div>
              <ClickableBarcode value={p.project_code || p.id} format="CODE128" height={52} width={1.3} fontSize={10} margin={2} background="transparent" label="Project ID" />
            </div>

            {workflows.some(w => w.batch_id) && (
              <div className="flex gap-4 overflow-x-auto pb-2 flex-wrap">
                {workflows.map(wf => wf.batch_id && (
                  <div key={wf.id} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shrink-0 max-w-full overflow-hidden">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate" title={`Batch ID (${wf.name})`}>Batch ID ({wf.name})</div>
                    <ClickableBarcode value={wf.batch_id} format="CODE128" height={52} width={1.3} fontSize={10} margin={2} background="transparent" label="Batch ID" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workflows Hierarchy */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
            <GitBranch size={20} className="text-blue-500" /> Workflows
          </h2>
          {workflows.length === 0 ? (
            <p className="text-gray-500 italic">No workflows defined.</p>
          ) : (
            <div className="space-y-6">
              {workflows.map((wf, wIndex) => (
                <div key={wf.id} className="bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                  <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4">{wIndex + 1}. {wf.name}</h3>
                  
                  {(!wf.stages || wf.stages.length === 0) ? (
                    <p className="text-gray-500 text-sm italic ml-4">No stages.</p>
                  ) : (
                    <div className="space-y-4 ml-2">
                      {wf.stages.map((st, sIndex) => (
                        <div key={st.id} className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-4 py-1">
                          <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                            <GitCommit size={14} /> Stage {sIndex + 1}: {st.name}
                          </h4>
                          
                          {(!st.processes || st.processes.length === 0) ? (
                            <p className="text-gray-500 text-xs italic ml-6">No processes.</p>
                          ) : (
                            <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {st.processes.map(proc => (
                                <div key={proc.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded p-3 flex items-start gap-2 shadow-sm">
                                  <Settings2 size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                  <div>
                                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{proc.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold">
                                      Allowed Images: {(proc.allowed_image_types || []).join(', ') || 'All'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory / Invoices Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
              <Package size={18} className="text-emerald-500" /> Linked Inventory
            </h2>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
              <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mb-1">{inventory_items.length}</div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">Total Items</div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
              <FileText size={18} className="text-amber-500" /> Associated Invoices
            </h2>
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <div className="text-3xl font-black text-amber-700 dark:text-amber-400 mb-1">{invoices.length}</div>
              <div className="text-sm font-semibold text-amber-600 dark:text-amber-500">Total Invoices</div>
              {invoices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  {invoices.slice(0, 3).map(inv => (
                    <span key={inv.id} className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300">
                      {inv.invoice_number}
                    </span>
                  ))}
                  {invoices.length > 3 && <span className="text-amber-600">+{invoices.length - 3} more</span>}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12 text-xs text-gray-400 font-semibold uppercase tracking-widest border-t border-gray-100 dark:border-gray-800 pt-4">
          Generated via AIQ Track & Trace
        </div>
      </div>
    </div>
  );
}
