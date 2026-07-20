import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Package, FileText, Search, Loader2, Download } from 'lucide-react';
import { listGroups, listInventoryItems, exportInventoryExcel } from '../api/client';
import clsx from 'clsx';

export default function InventoryReports() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await listGroups();
      setGroups(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedGroupId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const fetchItems = useCallback(async () => {
    if (!selectedGroupId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listInventoryItems({ group_id: selectedGroupId, limit: 500 });
      setItems(res.data.items || []);
    } catch (err) {
      console.error("Failed to load items for group:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const handleExport = async () => {
    if (!selectedGroupId) return;
    try {
      await exportInventoryExcel({ group_id: selectedGroupId });
    } catch (err) {
      console.error("Failed to export items", err);
      alert("Failed to export items");
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col relative -m-8 p-8">
      <div className="max-w-7xl w-full mx-auto pb-20">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <FileText className="text-primary-600" size={32} />
            GROUP REPORTS
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mt-1">View inventory items categorized by your invoice groups</p>
        </div>

        <div className="aiq-card p-6 mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Select Group</label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="aiq-input pl-10 appearance-none bg-white dark:bg-gray-900 w-full"
              >
                <option value="" disabled>-- Choose a Group --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedGroup && (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Group Info:</span>
              <span className={clsx("inline-flex items-center px-2.5 py-1 text-xs font-bold rounded border uppercase tracking-wider", `bg-${selectedGroup.color}-50 text-${selectedGroup.color}-700 border-${selectedGroup.color}-200 dark:bg-${selectedGroup.color}-900/30 dark:text-${selectedGroup.color}-400 dark:border-${selectedGroup.color}-800`)}>
                {selectedGroup.name}
              </span>
              {selectedGroup.description && (
                <span className="text-sm text-gray-600 dark:text-gray-400">· {selectedGroup.description}</span>
              )}
            </div>
          )}
        </div>

        <div className="aiq-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="text-primary-500" size={20} />
              Items in Group
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-sm font-bold text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </div>
              <button 
                onClick={handleExport}
                disabled={items.length === 0}
                className="aiq-btn-primary px-4 py-2 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} /> Export to Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-500 gap-3">
                <Loader2 className="animate-spin text-primary-500" size={24} />
                <span className="text-sm font-semibold">Loading items...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-gray-400 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Package size={32} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No items found</p>
                <p className="text-sm">There are no inventory items assigned to this group yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">HSN</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Quantity</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Tax Type</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Tax Amt</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Amt</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{item.item_name}</div>
                        {item.notes && <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{item.notes}</div>}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {item.invoice_number || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {item.hsn_code || '—'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200 font-semibold text-right">
                        {item.quantity || 0}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono text-right">
                        {item.tax_type || '—'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200 font-semibold text-right">
                        {item.tax_amount ? `₹${Number(item.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200 font-semibold text-right">
                        {item.total_amount ? `₹${Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        {item.project_assignments?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.project_assignments.map((a, i) => (
                              <span key={i} className="inline-flex w-max items-center px-2 py-0.5 text-[10px] font-bold rounded-full border bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-mono">
                                {a.project_code || a.project_id}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
