import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Search, Loader2, FileText, Filter } from 'lucide-react';
import clsx from 'clsx';

function StatusBadge({ status }) {
  const cls = {
    processed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30',
    needs_review: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/30',
    duplicate: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800/30',
  }
  const label = { processed: 'Processed', needs_review: 'Review', error: 'Error', duplicate: 'Dup' }
  return <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap', cls[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700')}>{label[status] || status}</span>
}

export default function SearchInventory() {
  const [filters, setFilters] = useState({
    query: '',
    invoice_category: '',
    po_category: '',
    item_code: '',
    process_name: '',
    status: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    
    // Check if at least one filter is applied
    if (!Object.values(filters).some(val => val.trim() !== '')) return;
    
    setLoading(true);
    setSearched(true);
    try {
      // Remove empty strings from params
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v.trim() !== ''));
      const { data } = await api.get('/invoices/advanced-search', { params });
      setResults(data.items);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col p-8 pb-20 pt-10">
      
      <div className="max-w-6xl mx-auto w-full text-left mb-12 border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-3">
          Deep Search
        </h1>
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
          Multi-faceted search across Invoices, Purchase Orders, Items, and Workflows
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full mb-12">
        <form onSubmit={handleSearch} className="space-y-6">
          
          {/* Main Keyword Search */}
          <div className="relative flex items-center shadow-lg dark:shadow-none rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
            <Search className="absolute left-6 text-gray-600 dark:text-gray-400 w-6 h-6" />
            <input 
              type="text" 
              name="query"
              value={filters.query}
              onChange={handleFilterChange}
              placeholder="Enter general keyword, invoice #, or PO #..."
              className="w-full bg-transparent text-gray-900 dark:text-gray-100 p-6 pl-16 text-lg font-medium placeholder-gray-500 outline-none"
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-3 aiq-btn aiq-btn-primary px-6 py-2.5 flex items-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <span className="flex items-center gap-2 font-bold"><Filter className="w-4 h-4"/> Search</span>}
            </button>
          </div>

          {/* Specific Filters Grid */}
          <div className="aiq-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Invoice Category
                </label>
                <input
                  type="text"
                  name="invoice_category"
                  value={filters.invoice_category}
                  onChange={handleFilterChange}
                  placeholder="e.g. IT Services"
                  className="aiq-input w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  PO / Item Category
                </label>
                <input
                  type="text"
                  name="po_category"
                  value={filters.po_category}
                  onChange={handleFilterChange}
                  placeholder="e.g. Hardware"
                  className="aiq-input w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Item Code
                </label>
                <input
                  type="text"
                  name="item_code"
                  value={filters.item_code}
                  onChange={handleFilterChange}
                  placeholder="e.g. ITEM-001"
                  className="aiq-input w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Workflow Stage
                </label>
                <input
                  type="text"
                  name="process_name"
                  value={filters.process_name}
                  onChange={handleFilterChange}
                  placeholder="e.g. Approval"
                  className="aiq-input w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="aiq-input w-full cursor-pointer"
                >
                  <option value="">Any Status</option>
                  <option value="processed">Processed</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="error">Error</option>
                </select>
              </div>

            </div>
          </div>
        </form>
      </div>

      {searched && (
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-4 text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800 pb-4">
            Found <span className="text-primary-600 dark:text-primary-400">{results.length}</span> result(s)
          </div>

          <div className="aiq-card overflow-hidden relative min-h-[300px]">
             {loading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  {['INVOICE #', 'LINKED PO', 'MATCHING LINE ITEMS / DESC', 'TOTAL', 'STATUS'].map(h => (
                    <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-gray-800 dark:text-gray-200 font-medium">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      No results found matching all filters.
                    </td>
                  </tr>
                ) : (
                  results.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={clsx(
                        "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors",
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                      )}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-4 px-4">
                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100 font-mono">{inv.invoice_number || '—'}</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Cat: {inv.category || 'N/A'}</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">{inv.invoice_date}</div>
                      </td>
                      <td className="py-4 px-4">
                        {inv.po_number ? (
                          <>
                            <div className="font-bold text-primary-600 dark:text-primary-400 text-sm font-mono">{inv.po_number}</div>
                            <div className="text-xs text-gray-800 dark:text-gray-200 mt-1 truncate max-w-[200px]">{inv.linked_po?.item_name}</div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                Code: {inv.linked_po?.item_code || 'N/A'} | Cat: {inv.linked_po?.category || 'N/A'}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-sm truncate">
                          {inv.product_description || '—'}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {inv.line_items?.length > 0 && (
                            <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
                              + {inv.line_items.length} LINE ITEM(S)
                            </div>
                          )}
                          {inv.tracking?.length > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                              + {inv.tracking.length} WORKFLOW STAGE(S)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(inv.grand_total)}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
