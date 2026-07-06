import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoice, updateInvoice, deleteInvoice } from '../api/client'
import { ArrowLeft, Edit2, Save, Trash2, X, FileText, Package, Receipt, Link2 } from 'lucide-react'
import clsx from 'clsx'

function Field({ label, value, editable, editKey, editValues, onChange }) {
  const val = editable ? (editValues[editKey] ?? value ?? '') : (value ?? '—')
  if (editable) {
    return (
      <div>
        <label className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest">{label}</label>
        <input
          className="aiq-input w-full mt-1"
          value={val}
          onChange={e => onChange(editKey, e.target.value)}
        />
      </div>
    )
  }
  return (
    <div>
      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-semibold">{value || '—'}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = {
    processed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    needs_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    duplicate: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  }
  const label = { processed: 'PROCESSED', needs_review: 'REVIEW', error: 'ERROR', duplicate: 'DUP' }
  return <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide border', cls[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700')}>{label[status] || status}</span>
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    getInvoice(id).then(r => {
      setInvoice(r.data)
      setLoading(false)
    })
  }, [id])

  const handleEdit = (key, val) => setEditValues(ev => ({ ...ev, [key]: val }))

  const saveEdits = async () => {
    setSaving(true)
    try {
      const { data } = await updateInvoice(id, editValues)
      setInvoice(prev => ({ ...prev, ...data }))
      setEditing(false)
      setEditValues({})
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice from the database?')) return
    await deleteInvoice(id)
    navigate('/invoices')
  }

  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-gray-700 dark:text-gray-300">Invoice not found.</div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      
      <div className="max-w-6xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/invoices')} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 truncate max-w-lg">
                INV {invoice.invoice_number || `#${invoice.id}`}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge status={invoice.status} />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ID #{invoice.id}</span>
                {invoice.confidence_score != null && (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    · CONF {(invoice.confidence_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setEditValues({}) }} className="px-4 py-2.5 flex items-center gap-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <X size={14} /> CANCEL
                </button>
                <button onClick={saveEdits} disabled={saving} className="aiq-btn px-4 py-2.5 flex items-center gap-2 text-xs">
                  <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="aiq-btn px-4 py-2.5 flex items-center gap-2 text-xs">
                  <Edit2 size={14} /> EDIT
                </button>
                <button onClick={handleDelete} className="px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold transition-colors flex items-center gap-2">
                  <Trash2 size={14} /> DELETE
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Invoice details */}
            <div className="aiq-card p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 rounded-r-full" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Receipt size={16} className="text-primary-600 dark:text-primary-400" /> Invoice Details
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <Field label="INVOICE NUMBER" value={invoice.invoice_number} editable={editing} editKey="invoice_number" editValues={editValues} onChange={handleEdit} />
                <Field label="INVOICE DATE" value={invoice.invoice_date} editable={editing} editKey="invoice_date" editValues={editValues} onChange={handleEdit} />
                <Field label="INVOICE TYPE" value={invoice.category} editable={editing} editKey="category" editValues={editValues} onChange={handleEdit} />
                <Field label="ORDER ID" value={invoice.order_id} editable={editing} editKey="order_id" editValues={editValues} onChange={handleEdit} />
              </div>
            </div>

            {/* Linked PO */}
            {invoice.linked_po && (
              <div className="aiq-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 rounded-r-full" />
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <Link2 size={16} className="text-cyan-500 dark:text-cyan-400" /> Linked Purchase Order
                  </h2>
                  <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 px-3 py-1 text-[10px] font-bold rounded-full tracking-wide">
                    {invoice.linked_po.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Field label="PO NUMBER" value={invoice.linked_po.po_number} editable={false} />
                  <Field label="ITEM CODE" value={invoice.linked_po.item_code} editable={false} />
                  <Field label="CATEGORY" value={invoice.linked_po.category} editable={false} />
                  <Field label="QUANTITY" value={`${invoice.linked_po.quantity} ${invoice.linked_po.unit.toUpperCase()}`} editable={false} />
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <Field label="ITEM NAME" value={invoice.linked_po.item_name} editable={false} />
                </div>
              </div>
            )}

            {/* Seller */}
            <div className="aiq-card p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 rounded-r-full" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-6">Seller</h2>
              <div className="grid grid-cols-2 gap-6">
                <Field label="GSTIN" value={invoice.seller_gstin} editable={editing} editKey="seller_gstin" editValues={editValues} onChange={handleEdit} />
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items?.length > 0 && (
              <div className="aiq-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 rounded-r-full" />
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-primary-600 dark:text-primary-400" /> Line Items [{invoice.line_items.length}]
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        {['ITEM', 'HSN', 'QTY', 'UNIT PRICE', 'TOTAL', 'TAX'].map(h => (
                          <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100 max-w-xs text-sm">
                            <span className="block truncate">{item.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-700 dark:text-gray-300">{item.hsn_code || '—'}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-sm text-gray-900 dark:text-gray-100">{item.quantity}</td>
                          <td className="py-3.5 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100 text-sm">{formatCurrency(item.total_price)}</td>
                          <td className="py-3.5 px-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                            {item.tax_rate != null ? `${item.tax_rate}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Financials + Taxes + Metadata */}
          <div className="space-y-8">
            {/* Totals */}
            <div className="aiq-card p-8">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-6">Financials</h2>
              <div className="space-y-4">
                {invoice.taxes?.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm font-semibold border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-700 dark:text-gray-300">{t.tax_type} {t.rate != null ? `(${t.rate}%)` : ''}</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-end">
                  <span className="text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider text-xs">Grand Total</span>
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Processing metadata */}
            <div className="aiq-card p-8">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-6">Metadata</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">Source</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800">{invoice.source_type}</span>
                </div>
                {invoice.ocr_confidence != null && (
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">OCR Conf</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">{invoice.ocr_confidence?.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">AI Conf</span>
                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{invoice.confidence_score != null ? `${(invoice.confidence_score * 100).toFixed(0)}%` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Raw text toggle */}
            {invoice.raw_text && (
              <div className="aiq-card overflow-hidden">
                <button
                  onClick={() => setShowRaw(r => !r)}
                  className="w-full px-6 py-4 text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 uppercase tracking-wider flex items-center justify-between transition-colors"
                >
                  <span>Raw Text</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{showRaw ? '[ HIDE ]' : '[ SHOW ]'}</span>
                </button>
                {showRaw && (
                  <pre className="text-[11px] text-gray-800 dark:text-gray-200 font-mono p-6 max-h-64 overflow-y-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800">
                    {invoice.raw_text}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
