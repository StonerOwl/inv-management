import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Search, Loader2, FileText, Filter } from 'lucide-react';
import clsx from 'clsx';

function StatusBadge({ status }) {
  const cls = {
    processed: 'bg-emerald-500 text-black',
    needs_review: 'bg-[#FCD535] text-black',
    error: 'bg-red-500 text-gray-900 dark:text-gray-100',
    duplicate: 'bg-primary-50 dark:bg-primary-900/300 text-gray-900 dark:text-gray-100',
  }
  const label = { processed: 'PROCESSED', needs_review: 'REVIEW', error: 'ERROR', duplicate: 'DUP' }
  return <span className={clsx('text-[10px] font-black px-2 py-1 font-semibold tracking-normal border border-black', cls[status] || 'bg-gray-50 dark:bg-gray-9000 text-gray-900 dark:text-gray-100')}>{label[status] || status}</span>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col p-8 pb-20">
      
      <div className="max-w-6xl mx-auto w-full text-left mb-12 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter  text-primary-600 mb-2">
          Deep Search
        </h1>
        <p className="text-gray-400 font-bold font-semibold tracking-normal text-xs">
          Multi-faceted search across Invoices, Purchase Orders, Items, and Workflows
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full mb-12">
        <form onSubmit={handleSearch} className="space-y-6">
          
          {/* Main Keyword Search */}
          <div className="relative flex items-center shadow-[4px_4px_0px_0px_rgba(252,213,53,1)] transition-shadow">
            <Search className="absolute left-6 text-primary-600 w-6 h-6" />
            <input 
              type="text" 
              name="query"
              value={filters.query}
              onChange={handleFilterChange}
              placeholder="ENTER GENERAL KEYWORD, INVOICE #, OR PO #..."
              className="w-full bg-white dark:bg-gray-800 border-2 border-primary-600 text-gray-900 dark:text-gray-100 p-5 pl-16 text-lg font-black tracking-normal placeholder-gray-700 outline-none focus:bg-white dark:bg-gray-800 transition-colors"
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-3 bg-[#FCD535] text-black px-6 py-2 font-black  tracking-normal hover:bg-white dark:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <span className="flex items-center gap-2"><Filter className="w-4 h-4"/> SEARCH</span>}
            </button>
          </div>

          {/* Specific Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-normal text-primary-600 ">
                Invoice Category
              </label>
              <input
                type="text"
                name="invoice_category"
                value={filters.invoice_category}
                onChange={handleFilterChange}
                placeholder="e.g. IT Services"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:outline-none focus:border-primary-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-normal text-primary-600 ">
                PO / Item Category
              </label>
              <input
                type="text"
                name="po_category"
                value={filters.po_category}
                onChange={handleFilterChange}
                placeholder="e.g. Hardware"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:outline-none focus:border-primary-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-normal text-primary-600 ">
                Item Code
              </label>
              <input
                type="text"
                name="item_code"
                value={filters.item_code}
                onChange={handleFilterChange}
                placeholder="e.g. ITEM-001"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:outline-none focus:border-primary-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-normal text-primary-600 ">
                Workflow Stage
              </label>
              <input
                type="text"
                name="process_name"
                value={filters.process_name}
                onChange={handleFilterChange}
                placeholder="e.g. Approval"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:outline-none focus:border-primary-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-normal text-primary-600 ">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:outline-none focus:border-primary-600 transition-colors  cursor-pointer"
              >
                <option value="">ANY STATUS</option>
                <option value="processed">PROCESSED</option>
                <option value="needs_review">NEEDS REVIEW</option>
                <option value="error">ERROR</option>
              </select>
            </div>

          </div>
        </form>
      </div>

      {searched && (
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-4 text-xs font-bold tracking-normal text-primary-600 border-b border-gray-200 dark:border-gray-700 pb-4">
            FOUND {results.length} RESULT(S)
          </div>

          <div className="card-brutal-dark overflow-x-auto relative min-h-[300px]">
             {loading && (
              <div className="absolute inset-0 bg-white dark:bg-gray-800/80 flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-primary-600 w-12 h-12" />
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                <tr>
                  {['INVOICE #', 'LINKED PO', 'MATCHING LINE ITEMS / DESC', 'TOTAL', 'STATUS'].map(h => (
                    <th key={h} className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 border-r border-gray-100 dark:border-gray-800 last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-gray-600 dark:text-gray-400 font-bold tracking-normal">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      NO RESULTS FOUND MATCHING ALL FILTERS.
                    </td>
                  </tr>
                ) : (
                  results.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={clsx(
                        "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 cursor-pointer transition-colors",
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                      )}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-4 px-4 border-r border-gray-100 dark:border-gray-800">
                        <div className="font-bold text-sm">{inv.invoice_number || '—'}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ">Cat: {inv.category || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{inv.invoice_date}</div>
                      </td>
                      <td className="py-4 px-4 border-r border-gray-100 dark:border-gray-800">
                        {inv.po_number ? (
                          <>
                            <div className="font-bold text-primary-600 text-xs">{inv.po_number}</div>
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">{inv.linked_po?.item_name}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ">
                                Code: {inv.linked_po?.item_code || 'N/A'} | Cat: {inv.linked_po?.category || 'N/A'}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 border-r border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-300 max-w-sm truncate">
                          {inv.product_description || '—'}
                        </div>
                        {inv.line_items?.length > 0 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1  tracking-wider">
                            + {inv.line_items.length} LINE ITEM(S)
                          </div>
                        )}
                        {inv.tracking?.length > 0 && (
                          <div className="text-[10px] text-emerald-500 mt-1  tracking-wider">
                            + {inv.tracking.length} WORKFLOW STAGE(S)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 border-r border-gray-100 dark:border-gray-800 font-black">
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
