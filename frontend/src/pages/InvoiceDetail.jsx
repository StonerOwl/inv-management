import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoice, updateInvoice, deleteInvoice } from '../api/client'
import { ArrowLeft, Edit2, Save, Trash2, X, FileText, Package, Receipt } from 'lucide-react'
import clsx from 'clsx'

function Field({ label, value, editable, editKey, editValues, onChange }) {
  const val = editable ? (editValues[editKey] ?? value ?? '') : (value ?? '—')
  if (editable) {
    return (
      <div>
        <label className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</label>
        <input
          className="input mt-1"
          value={val}
          onChange={e => onChange(editKey, e.target.value)}
        />
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white mt-1 font-medium">{value || '—'}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = { processed: 'badge-processed', needs_review: 'badge-review', error: 'badge-error' }
  const label = { processed: 'Processed', needs_review: 'Needs Review', error: 'Error' }
  return <span className={cls[status] || 'badge-processed'}>{label[status] || status}</span>
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
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-white/50">Invoice not found.</div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white truncate max-w-lg">{invoice.file_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={invoice.status} />
              {invoice.platform && (
                <span className="bg-brand-600/20 text-brand-300 text-xs px-2 py-0.5 rounded-full">{invoice.platform}</span>
              )}
              <span className="text-xs text-white/30">ID #{invoice.id}</span>
              {invoice.confidence_score != null && (
                <span className="text-xs text-white/30">
                  · Confidence {Math.round(invoice.confidence_score * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setEditValues({}) }} className="btn-ghost flex items-center gap-2 text-sm">
                <X size={15} /> Cancel
              </button>
              <button onClick={saveEdits} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-ghost flex items-center gap-2 text-sm">
                <Edit2 size={15} /> Edit
              </button>
              <button onClick={handleDelete} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice details */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Receipt size={15} /> Invoice Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Invoice Number" value={invoice.invoice_number} editable={editing} editKey="invoice_number" editValues={editValues} onChange={handleEdit} />
              <Field label="Invoice Date" value={invoice.invoice_date} editable={editing} editKey="invoice_date" editValues={editValues} onChange={handleEdit} />
              <Field label="Order ID" value={invoice.order_id} editable={editing} editKey="order_id" editValues={editValues} onChange={handleEdit} />
              <Field label="Platform" value={invoice.platform} editable={editing} editKey="platform" editValues={editValues} onChange={handleEdit} />
              <Field label="Payment Method" value={invoice.payment_method} editable={editing} editKey="payment_method" editValues={editValues} onChange={handleEdit} />
              <Field label="Currency" value={invoice.currency} />
            </div>
          </div>

          {/* Seller */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Seller</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Seller Name" value={invoice.seller_name} editable={editing} editKey="seller_name" editValues={editValues} onChange={handleEdit} />
              <Field label="GSTIN" value={invoice.seller_gstin} editable={editing} editKey="seller_gstin" editValues={editValues} onChange={handleEdit} />
            </div>
          </div>

          {/* Buyer */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Buyer</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Buyer Name" value={invoice.buyer_name} editable={editing} editKey="buyer_name" editValues={editValues} onChange={handleEdit} />
              <Field label="Billing Address" value={invoice.billing_address} editable={editing} editKey="billing_address" editValues={editValues} onChange={handleEdit} />
              <Field label="Shipping Address" value={invoice.shipping_address} editable={editing} editKey="shipping_address" editValues={editValues} onChange={handleEdit} />
            </div>
          </div>

          {/* Line Items */}
          {invoice.line_items?.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <Package size={15} /> Line Items ({invoice.line_items.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['Item', 'SKU', 'HSN', 'Qty', 'Unit Price', 'Total', 'Tax'].map(h => (
                        <th key={h} className="table-head">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="table-cell font-medium text-white max-w-xs">
                          <span className="text-sm">{item.name}</span>
                        </td>
                        <td className="table-cell font-mono text-xs text-white/50">{item.sku || '—'}</td>
                        <td className="table-cell font-mono text-xs text-white/50">{item.hsn_code || '—'}</td>
                        <td className="table-cell text-center">{item.quantity}</td>
                        <td className="table-cell">{formatCurrency(item.unit_price)}</td>
                        <td className="table-cell font-semibold">{formatCurrency(item.total_price)}</td>
                        <td className="table-cell text-xs text-white/50">
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
        <div className="space-y-4">
          {/* Totals */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Financials</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxes?.map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white/50">{t.tax_type} {t.rate != null ? `(${t.rate}%)` : ''}</span>
                  <span className="text-white/70">{formatCurrency(t.amount)}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-semibold">Grand Total</span>
                <span className="text-xl font-bold gradient-text">{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Processing metadata */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Processing Info</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Source type</span>
                <span className="text-xs font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded">{invoice.source_type}</span>
              </div>
              {invoice.ocr_confidence != null && (
                <div className="flex justify-between">
                  <span className="text-white/40">OCR confidence</span>
                  <span className="text-white/70">{invoice.ocr_confidence?.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">AI confidence</span>
                <span className="text-white/70">{invoice.confidence_score != null ? `${Math.round(invoice.confidence_score * 100)}%` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Added</span>
                <span className="text-white/70 text-xs">{invoice.created_at ? new Date(invoice.created_at).toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>

          {/* Raw text toggle */}
          {invoice.raw_text && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setShowRaw(r => !r)}
                className="w-full px-5 py-3 text-sm font-medium text-white/60 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>Raw Extracted Text</span>
                <span className="text-xs text-white/30">{showRaw ? 'Hide' : 'Show'}</span>
              </button>
              {showRaw && (
                <pre className="text-xs text-white/50 font-mono px-5 pb-5 max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-white/5">
                  {invoice.raw_text}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
