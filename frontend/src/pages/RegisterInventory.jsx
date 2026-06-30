import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, updateInvoice, listInvoices, listPOs, linkPO, listCategories } from '../api/client';
import { Save, AlertTriangle, FileText, Loader2, Link2, CheckCircle, ArrowRight, Package, Tag, GitBranch, Layers } from 'lucide-react';
import clsx from 'clsx';

const INVOICE_TYPES = ['Material', 'Service', 'Utility', 'Other'];

export default function RegisterInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  
  const [pos, setPos] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    seller_gstin: '',
    product_description: '',
    quantity: 1,
    grand_total: 0,
    category: 'Material',
  });

  const [saving, setSaving] = useState(false);

  // Get the selected PO object
  const selectedPO = pos.find(p => String(p.id) === String(selectedPoId));

  // Find the category object matching the PO's category to get its workflows/processes
  const poCategory = selectedPO ? categories.find(c => c.name === selectedPO.category) : null;

  // Initialization
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch POs for matching
        const poRes = await listPOs();
        setPos(poRes.data.items || []);

        // Fetch categories (with workflows/processes) for reference
        try {
          const catRes = await listCategories();
          setCategories(catRes.data.items || []);
        } catch (_) {}

        if (id) {
          const invRes = await getInvoice(id);
          setupForm(invRes.data);
        } else {
          // If no ID is provided, try to find the first needs_review invoice
          const pendingRes = await listInvoices({ status: 'needs_review', limit: 1 });
          if (pendingRes.data.items?.length > 0) {
            navigate(`/inventory/register/${pendingRes.data.items[0].id}`, { replace: true });
          } else {
            setLoading(false); // No pending invoices
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load invoice or purchase orders.');
        setLoading(false);
      }
    };
    init();
  }, [id, navigate]);

  const setupForm = (inv) => {
    setInvoice(inv);
    setFormData({
      invoice_number: inv.invoice_number || '',
      invoice_date: inv.invoice_date || '',
      seller_gstin: inv.seller_gstin || '',
      product_description: inv.product_description || inv.line_items?.[0]?.name || '',
      quantity: inv.quantity || inv.line_items?.[0]?.quantity || 1,
      grand_total: inv.grand_total || 0,
      category: inv.category || 'Material',
    });
    if (inv.linked_po) {
      setSelectedPoId(inv.linked_po.id);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'grand_total' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // 1. Update Invoice Details and mark as processed
      await updateInvoice(id, {
        ...formData,
        status: 'processed'
      });
      
      // 2. Link PO if selected and different from current
      if (selectedPoId && (!invoice.linked_po || invoice.linked_po.id !== selectedPoId)) {
        await linkPO(id, selectedPoId);
      }

      // Navigate to Manage on success
      navigate('/invoices');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to complete registration.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!id && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-gray-500 dark:text-gray-400">
        <CheckCircle size={48} className="mb-4 opacity-20" />
        <p className="font-bold font-semibold tracking-normal">No pending invoices to register.</p>
        <button 
          onClick={() => navigate('/upload')} 
          className="mt-6 btn-brutal-dark px-6 py-3 flex items-center gap-2 text-xs text-primary-600"
        >
          GO TO UPLOAD <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h1 className="text-5xl font-black tracking-tighter ">Review & Register</h1>
        <div className="text-sm font-bold tracking-normal text-primary-600 mt-2 flex items-center gap-4">
          <span>&gt; INVOICE #{invoice?.invoice_number || invoice?.id}</span>
          <div className="w-32 h-[1px] bg-[#FCD535]"></div>
        </div>
      </div>

      {error && (
        <div className="mb-8 border-l-4 border-red-500 bg-red-500/10 p-4 font-bold text-red-500  tracking-normal flex items-center gap-3">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Invoice Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card-brutal-dark p-8 relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FCD535]" />
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100  tracking-normal mb-6 flex items-center gap-2">
              <FileText size={18} className="text-primary-600" /> EXTRACTED DETAILS
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Invoice Number
                </label>
                <input
                  required
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Invoice Date
                </label>
                <input
                  required
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Seller GSTIN
                </label>
                <input
                  type="text"
                  name="seller_gstin"
                  value={formData.seller_gstin}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Product / Service Description
                </label>
                <input
                  required
                  type="text"
                  name="product_description"
                  value={formData.product_description}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Total Quantity
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Grand Total (₹)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="grand_total"
                  value={formData.grand_total}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary-600 font-black text-lg p-3 focus:outline-none focus:border-primary-600 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Classification & PO */}
        <div className="space-y-8">
          
          <div className="card-brutal-dark p-8 relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400" />
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100  tracking-normal mb-6 flex items-center gap-2">
              <Link2 size={18} className="text-cyan-400" /> CLASSIFICATION
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Match Purchase Order
                </label>
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-cyan-400 transition-colors font-bold  cursor-pointer"
                >
                  <option value="">-- NO PO MATCHED --</option>
                  {pos.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - {po.item_name} ({po.quantity} {po.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">
                  Invoice Type / Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:border-primary-600 transition-colors font-bold  cursor-pointer"
                >
                  {INVOICE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* PO Info Panel - shows when a PO is selected */}
          {selectedPO && (
            <div className="card-brutal-dark p-8 relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100  tracking-normal mb-6 flex items-center gap-2">
                <Package size={18} className="text-emerald-500" /> PO DETAILS
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">PO Number</span>
                  <span className="text-sm font-bold text-primary-600">{selectedPO.po_number}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">Item</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedPO.item_name}</span>
                </div>
                {selectedPO.item_code && (
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">Item Code</span>
                    <span className="text-sm font-bold text-cyan-400 font-sans">{selectedPO.item_code}</span>
                  </div>
                )}
                {selectedPO.category && (
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">Item Category</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-black font-semibold tracking-normal text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-sm">
                      <Tag size={10} />
                      {selectedPO.category}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">Quantity</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedPO.quantity} {selectedPO.unit}</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-black tracking-normal text-gray-500 dark:text-gray-400 ">Status</span>
                  <span className={clsx(
                    "text-[10px] font-black px-2 py-1 font-semibold tracking-normal border",
                    selectedPO.status === 'approved' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' :
                    selectedPO.status === 'rejected' ? 'text-red-400 bg-red-500/15 border-red-500/30' :
                    'text-gray-400 bg-gray-50 dark:bg-gray-9000/15 border-gray-500/30'
                  )}>
                    {selectedPO.status}
                  </span>
                </div>
              </div>

              {/* Workflow / Process info from PO's category */}
              {poCategory && poCategory.workflows && poCategory.workflows.length > 0 && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-[10px] text-primary-600 font-black font-semibold tracking-normal mb-3 flex items-center gap-1.5">
                    <GitBranch size={10} /> LINKED WORKFLOWS & PROCESSES
                  </p>
                  <div className="space-y-3">
                    {poCategory.workflows.map(wf => (
                      <div key={wf.id} className="border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch size={10} className="text-primary-600" />
                          <span className="text-[10px] font-black text-gray-900 dark:text-gray-100  tracking-normal">{wf.name}</span>
                        </div>
                        <div className="space-y-1 pl-4 border-l border-gray-200 dark:border-gray-700 ml-1.5">
                          {wf.processes?.length > 0 ? wf.processes.map((proc, idx) => (
                            <div key={proc.id} className="flex items-center gap-2 text-[10px] text-gray-400 font-bold tracking-normal">
                              <span className="text-gray-600 dark:text-gray-400 w-4">{idx + 1}.</span>
                              <Layers size={8} className="text-emerald-500" />
                              <span className="">{proc.name}</span>
                            </div>
                          )) : (
                            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold tracking-normal">NO PROCESSES DEFINED</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 bg-[#FCD535] text-black px-8 py-5 font-black tracking-normal text-sm  hover:bg-white dark:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer border border-primary-600"
            >
              {saving ? (
                <><Loader2 size={18} className="animate-spin" /> PROCESSING...</>
              ) : (
                <><Save size={18} /> COMPLETE REGISTRATION</>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 font-bold  tracking-normal mt-4">
              Will route to manage page upon success
            </p>
          </div>

        </div>
      </form>
    </div>
  );
}
