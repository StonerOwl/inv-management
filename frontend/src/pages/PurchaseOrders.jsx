import { useState, useEffect, useCallback, useRef } from 'react'
import { listPOs, createPO, approvePO, rejectPO, deletePO, getPOStats, listProducts, exportPOCSV, exportPOExcel } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Plus, Check, X, Trash2, Package, Clock, CheckCircle2, XCircle, Filter, ChevronDown, Download } from 'lucide-react'
import clsx from 'clsx'

const UNITS = ['pcs', 'kg', 'litre', 'box', 'set', 'other']

const STATUS_CONFIG = {
  pending:  { label: 'PENDING',  color: 'text-amber-400',   bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: Clock },
  approved: { label: 'APPROVED', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'REJECTED', color: 'text-red-400',     bg: 'bg-red-500/15', border: 'border-red-500/30', icon: XCircle },
}

const CATEGORY_COLORS = {
  'Category 1': { color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30' },
  'Category 2': { color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
  'Category 3': { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
}

export default function PurchaseOrders() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [pos, setPOs] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Product catalog for autocomplete
  const [catalogProducts, setCatalogProducts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef(null)
  const inputRef = useRef(null)

  const [formData, setFormData] = useState({
    item_name: '',
    item_code: '',
    category: '',
    quantity: '',
    unit: 'pcs',
    notes: '',
  })

  // Fetch product catalog once
  useEffect(() => {
    listProducts({ limit: 1000 })
      .then(res => setCatalogProducts(res.data.items))
      .catch(() => {})
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter

      const [posRes, statsRes] = await Promise.all([
        listPOs(params),
        getPOStats(),
      ])
      setPOs(posRes.data.items)
      setStats(statsRes.data)
    } catch (err) {
      setError('Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleItemNameChange = (value) => {
    setFormData(prev => ({ ...prev, item_name: value }))

    if (value.trim().length > 0) {
      const filtered = catalogProducts.filter(p =>
        p.item_name.toLowerCase().includes(value.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setFormData(prev => ({ ...prev, item_code: '', category: '' }))
    }
  }

  const handleSelectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      item_name: product.item_name,
      item_code: product.item_code,
      category: product.category,
    }))
    setShowSuggestions(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await createPO({
        item_name: formData.item_name,
        item_code: formData.item_code || null,
        category: formData.category || null,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        notes: formData.notes || null,
      })
      setIsModalOpen(false)
      setFormData({ item_name: '', item_code: '', category: '', quantity: '', unit: 'pcs', notes: '' })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create PO')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (poId) => {
    try {
      await approvePO(poId)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve PO')
    }
  }

  const handleReject = async (poId) => {
    try {
      await rejectPO(poId)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject PO')
    }
  }

  const handleDelete = async (poId) => {
    try {
      await deletePO(poId)
      setDeleteConfirm(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete PO')
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const handleExport = async (type) => {
    setExporting(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      if (type === 'csv') await exportPOCSV(params)
      else await exportPOExcel(params)
    } catch (err) {
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">

      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter ">Purchase Orders</h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 mt-2 flex items-center gap-4">
              <span>&gt; PO MANAGEMENT [{stats.total}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="relative group">
              <button disabled={exporting} className="btn-brutal-dark px-6 py-3 flex items-center gap-2 text-sm font-black font-semibold tracking-normal disabled:opacity-50">
                <Download size={16} /> {exporting ? 'EXPORTING...' : 'EXPORT'}
              </button>
              <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex-col hidden group-hover:flex z-50">
                <button onClick={() => handleExport('csv')} className="px-4 py-3 text-xs font-black tracking-normal text-primary-600 hover:bg-[#FCD535] hover:text-black  text-left transition-colors border-b border-gray-200 dark:border-gray-700">
                  CSV FORMAT
                </button>
                <button onClick={() => handleExport('excel')} className="px-4 py-3 text-xs font-black tracking-normal text-primary-600 hover:bg-[#FCD535] hover:text-black  text-left transition-colors">
                  EXCEL FORMAT
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setFormData({ item_name: '', item_code: '', category: '', quantity: '', unit: 'pcs', notes: '' })
                setIsModalOpen(true)
              }}
              className="btn-brutal-dark px-6 py-3 flex items-center gap-2 text-sm font-black font-semibold tracking-normal text-black bg-[#FCD535]"
            >
              <Plus size={16} /> RAISE PO
            </button>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'TOTAL', value: stats.total, color: 'text-gray-900 dark:text-gray-100', accent: 'border-primary-600', icon: Package },
            { label: 'PENDING', value: stats.pending, color: 'text-amber-400', accent: 'border-amber-500', icon: Clock },
            { label: 'APPROVED', value: stats.approved, color: 'text-emerald-400', accent: 'border-emerald-500', icon: CheckCircle2 },
            { label: 'REJECTED', value: stats.rejected, color: 'text-red-400', accent: 'border-red-500', icon: XCircle },
          ].map(({ label, value, color, accent, icon: Icon }) => (
            <div
              key={label}
              className={clsx(
                'card-brutal-dark p-5 border-l-4 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02]',
                accent
              )}
            >
              <Icon size={24} className={color} />
              <div>
                <p className="text-xs font-bold tracking-normal text-gray-500 dark:text-gray-400 ">{label}</p>
                <p className={clsx('text-3xl font-black', color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <Filter size={16} className="text-gray-500 dark:text-gray-400" />
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 pr-10 text-xs font-black tracking-normal text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none  cursor-pointer"
            >
              <option value="">ALL STATUS</option>
              <option value="pending">PENDING</option>
              <option value="approved">APPROVED</option>
              <option value="rejected">REJECTED</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-bold tracking-normal">
            {pos.length} RESULT{pos.length !== 1 ? 'S' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-primary-600 font-black font-semibold tracking-normal text-2xl animate-pulse">
            Loading Purchase Orders...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black font-semibold tracking-normal text-2xl">{error}</div>
        ) : pos.length === 0 ? (
          <div className="card-brutal-dark p-16 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-600 dark:text-gray-400" />
            <p className="text-xl font-black tracking-normal text-gray-500 dark:text-gray-400 ">No Purchase Orders</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-bold">Click "RAISE PO" to create one.</p>
          </div>
        ) : (
          <div className="card-brutal-dark relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">PO #</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">ITEM</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">CODE</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">CATEGORY</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">QTY</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">UNIT</th>
                    {isAdmin && (
                      <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">RAISED BY</th>
                    )}
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">DATE</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">STATUS</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">ACTIONED BY</th>
                    {isAdmin && (
                      <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap">ACTIONS</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po, idx) => {
                    const sc = STATUS_CONFIG[po.status] || STATUS_CONFIG.pending
                    const StatusIcon = sc.icon
                    const cc = po.category ? (CATEGORY_COLORS[po.category] || {}) : {}
                    return (
                      <tr
                        key={po.id}
                        className={clsx(
                          'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-colors',
                          idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                        )}
                      >
                        <td className="py-3 px-4 text-sm font-bold text-primary-600 border-r border-gray-100 dark:border-gray-800">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold border-r border-gray-100 dark:border-gray-800 max-w-[200px]">
                          <span className="block truncate">{po.item_name}</span>
                          {po.notes && (
                            <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate" title={po.notes}>
                              {po.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-cyan-400 border-r border-gray-100 dark:border-gray-800 font-sans">
                          {po.item_code || '—'}
                        </td>
                        <td className="py-3 px-4 border-r border-gray-100 dark:border-gray-800">
                          {po.category ? (
                            <span className={clsx(
                              'inline-flex items-center px-2.5 py-1 text-[10px] font-black font-semibold tracking-normal rounded-sm border',
                              cc.bg, cc.color, cc.border
                            )}>
                              {po.category}
                            </span>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800 tabular-nums">
                          {po.quantity}
                        </td>
                        <td className="py-3 px-4 text-xs font-bold  text-gray-400 border-r border-gray-100 dark:border-gray-800">
                          {po.unit}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-sm font-bold border-r border-gray-100 dark:border-gray-800">
                            {po.requested_by_username}
                          </td>
                        )}
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 font-bold border-r border-gray-100 dark:border-gray-800 whitespace-nowrap">
                          {formatDate(po.created_at)}
                        </td>
                        <td className="py-3 px-4 border-r border-gray-100 dark:border-gray-800">
                          <span className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black font-semibold tracking-normal rounded-sm border',
                            sc.bg, sc.color, sc.border
                          )}>
                            <StatusIcon size={12} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 font-bold border-r border-gray-100 dark:border-gray-800">
                          {po.approved_by_username || '—'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            {po.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(po.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black font-semibold tracking-normal text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                                  title="Approve"
                                >
                                  <Check size={12} /> APPROVE
                                </button>
                                <button
                                  onClick={() => handleReject(po.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black font-semibold tracking-normal text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                  title="Reject"
                                >
                                  <X size={12} /> REJECT
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(po.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black font-semibold tracking-normal text-gray-500 dark:text-gray-400 hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-500/30 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} /> DELETE
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-2xl font-black text-primary-600 tracking-tighter ">
                RAISE PURCHASE ORDER
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Item Name with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Item Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  onFocus={() => {
                    if (formData.item_name.trim() && suggestions.length > 0) setShowSuggestions(true)
                  }}
                  placeholder="Start typing to search products..."
                  autoComplete="off"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none placeholder-gray-700"
                />
                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-2 border-primary-600 max-h-48 overflow-y-auto"
                  >
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{product.item_name}</span>
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-normal mt-0.5">
                            {product.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary-600 font-sans shrink-0">
                          {product.item_code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Item Code (auto-filled, read-only when from catalog) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Item Code</label>
                <input
                  type="text"
                  value={formData.item_code}
                  readOnly
                  placeholder="Auto-filled from catalog"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-primary-600 outline-none placeholder-gray-700 font-sans cursor-not-allowed"
                />
              </div>

              {/* Category (auto-filled, read-only when from catalog) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  readOnly
                  placeholder="Auto-filled from catalog"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none placeholder-gray-700 cursor-not-allowed "
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none placeholder-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Unit</label>
                  <div className="relative">
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none  cursor-pointer"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u} className="bg-white dark:bg-gray-800">
                          {u.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional details..."
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none resize-none placeholder-gray-700"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-xs font-black font-semibold tracking-normal text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-brutal-dark px-8 py-3 text-xs font-black font-semibold tracking-normal disabled:opacity-50"
                >
                  {submitting ? 'SUBMITTING...' : 'SUBMIT PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-black text-red-400 tracking-tighter ">CONFIRM DELETE</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-400 font-bold mb-6">This action cannot be undone. Are you sure you want to delete this PO?</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-3 text-xs font-black font-semibold tracking-normal text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-6 py-3 text-xs font-black font-semibold tracking-normal text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
