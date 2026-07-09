import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Download, Trash2, Search, Filter, Plus, FileText, Upload as UploadIcon, AlertCircle, CheckCircle, Loader2, RefreshCw, Layers, Edit, Eye, XCircle, Clock, Package, Save, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext';
import { listInvoices, getInvoice, deleteInvoice, updateInvoice, getPWSItems, getPWSAssignments, assignInvoiceToProject, listInventoryItems, updateInventoryItem, deleteInventoryItem, getInvoiceAssignments } from '../api/client'
import { useUpload } from '../context/UploadContext'
import NoteTarget from '../components/NoteTarget';

const TerminalLogs = ({ logs }) => {
  const endRef = useRef(null)
  const containerRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 20
    if (isNearBottom && !autoScroll) setAutoScroll(true)
    else if (!isNearBottom && autoScroll) setAutoScroll(false)
  }

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  return (
    <div className="mt-4 mb-2 bg-[#0c0c0c] text-[#00ff00] font-mono text-xs border border-[#333] rounded shadow-inner relative flex flex-col">
      <div className="flex justify-between items-center bg-[#1a1a1a] px-4 py-1 border-b border-[#333]">
        <span className="text-gray-400 font-sans text-[10px] uppercase tracking-wider">Processing Logs</span>
        <label className="flex items-center text-gray-400 font-sans text-[10px] uppercase tracking-wider cursor-pointer hover:text-gray-200">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="mr-1.5 w-3 h-3 accent-[#00ff00] cursor-pointer"
          />
          Auto-scroll
        </label>
      </div>
      <div ref={containerRef} onScroll={handleScroll} className="p-4 h-48 overflow-y-auto overflow-x-hidden">
        {(!logs || logs.length === 0) ? (
          <div className="text-gray-500 italic">Waiting for processing to begin...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">
              <span className="text-gray-500 mr-2">&gt;</span>
              {log}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

export default function InventoryDashboard() {
  const [registerPopupOpen, setRegisterPopupOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedLineItemIds, setSelectedLineItemIds] = useState([])
  const [registerLoading, setRegisterLoading] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(null)

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // PWS Data
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])
  const [invoiceAssignments, setInvoiceAssignments] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Edit expanded row state
  const [expandedRow, setExpandedRow] = useState(null)
  const [editData, setEditData] = useState({})

  // Inventory items state
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryExpandedRow, setInventoryExpandedRow] = useState(null)
  const [inventoryEditData, setInventoryEditData] = useState({})

  const fetchInventoryItems = useCallback(async (search = '') => {
    setInventoryLoading(true)
    try {
      const res = await listInventoryItems({ limit: 200, search: search || undefined })
      setInventoryItems(res.data.items || [])
      setInventoryTotal(res.data.total || 0)
    } catch (err) {
      console.error('Failed to load inventory items:', err)
    } finally {
      setInventoryLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, pwsRes, assignRes, invAssignRes] = await Promise.all([
        listInvoices({ limit: 100 }),
        getPWSItems(),
        getPWSAssignments(),
        getInvoiceAssignments(),
      ])
      setInvoices(invRes.data.items || [])
      setTotal(invRes.data.total || 0)
      setPwsItems(pwsRes.data || [])
      setPwsAssignments(assignRes.data || [])
      setInvoiceAssignments(invAssignRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const navigate = useNavigate()

  const handleToggleExpand = (item) => {
    if (expandedRow === item.id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(item.id)
      setEditData({ ...item })
    }
  }

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index, field, value) => {
    setEditData(prev => {
      const newItems = [...(prev.line_items || [])]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, line_items: newItems }
    })
  }

  const handleSaveEdit = async (id) => {
    try {
      await updateInvoice(id, {
        invoice_number: editData.invoice_number,
        invoice_date: editData.invoice_date,
        invoice_details: editData.invoice_details,
        gst_registration_no: editData.gst_registration_no,
        pan_no: editData.pan_no,
        cin_no: editData.cin_no,
        status: editData.status,
        line_items: editData.line_items
      })
      alert("Invoice updated successfully!")
      setExpandedRow(null)
      fetchData()
    } catch (err) {
      console.error(err)
      alert("Failed to update invoice")
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id)
        fetchData()
      } catch (err) {
        console.error("Failed to delete invoice:", err)
      }
    }
  }

  const handleDownload = (item) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `invoice_${item.id}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  useEffect(() => {
    fetchData()
    fetchInventoryItems()
  }, [fetchData, fetchInventoryItems])

  const handleRegisterSave = async () => {
    if (!selectedInvoice || !selectedProjectId) return
    try {
      await assignInvoiceToProject(selectedProjectId, selectedInvoice.id, selectedLineItemIds)
      alert("Invoice successfully registered to the selected project!")
      closeRegisterPopup()
      fetchData()
      fetchInventoryItems(inventorySearch)
    } catch (err) {
      console.error("Failed to register invoice to project:", err)
      alert("Failed to register invoice to the selected project.")
    }
  }

  // ── Inventory item handlers ──────────────────────────────────────────────
  const handleInventoryToggleExpand = (item) => {
    if (inventoryExpandedRow === item.id) {
      setInventoryExpandedRow(null)
    } else {
      setInventoryExpandedRow(item.id)
      setInventoryEditData({ ...item })
    }
  }

  const handleInventoryEditChange = (field, value) => {
    setInventoryEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleInventorySave = async (id) => {
    try {
      await updateInventoryItem(id, {
        item_name: inventoryEditData.item_name,
        notes: inventoryEditData.notes,
        quantity: parseFloat(inventoryEditData.quantity) || 0,
        unit_price: parseFloat(inventoryEditData.unit_price) || 0,
        total_amount: parseFloat(inventoryEditData.total_amount) || 0,
      })
      setInventoryExpandedRow(null)
      fetchInventoryItems(inventorySearch)
    } catch (err) {
      console.error(err)
      alert('Failed to update inventory item')
    }
  }

  const handleInventoryDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await deleteInventoryItem(id)
        fetchInventoryItems(inventorySearch)
      } catch (err) {
        console.error('Failed to delete inventory item:', err)
      }
    }
  }

  const handleInventorySearchSubmit = (e) => {
    e.preventDefault()
    fetchInventoryItems(inventorySearch)
  }

  const projects = pwsItems.filter(i => i.type === 'project')
  const workflows = pwsItems.filter(i => i.type === 'workflow')
  const states = pwsItems.filter(i => i.type === 'state')

  const connectedWorkflows = pwsAssignments
    .filter(a => a.parent_id === selectedProjectId)
    .map(a => workflows.find(w => w.id === a.child_id))
    .filter(Boolean)

  const {
    files, setFiles,
    uploading, uploadPct,
    jobId, job,
    error, setError,
    clearAll, startUpload
  } = useUpload()

  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !names.has(f.name))]
    })
    setError(null)
  }, [setFiles, setError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  const openRegisterPopup = async (invoice) => {
    setRegisterPopupOpen(true)
    setSelectedInvoice({ ...invoice, fileName: invoice.file_name || invoice.invoice_number || `INV-${invoice.id}` })
    setSelectedProjectId('')
    setSelectedLineItemIds([])
    setAlreadyRegistered(null)

    // Check if already registered
    const existingAssignment = invoiceAssignments.find(a => a.invoice_id === invoice.id)
    if (existingAssignment) {
      const registeredProject = projects.find(p => p.id === existingAssignment.project_id)
      setAlreadyRegistered(registeredProject || { name: existingAssignment.project_id })
      return
    }

    setRegisterLoading(true)
    try {
      const res = await getInvoice(invoice.id)
      const fullInvoice = res.data

      const keywords = ["cash", "pay", "shipping", "freight", "discount", "tax",
        "cgst", "sgst", "igst", "round off", "roundoff", "delivery",
        "payment", "due", "balance", "total", "subtotal", "fee", "charge", "flight", "ticket"]

      const preSelected = (fullInvoice.line_items || []).filter(li => {
        const name = (li.name || '').toLowerCase()
        return !keywords.some(kw => name.includes(kw))
      }).map(li => li.id)

      setSelectedInvoice({
        ...fullInvoice,
        fileName: fullInvoice.file_name || fullInvoice.invoice_number || `INV-${fullInvoice.id}`
      })
      setSelectedLineItemIds(preSelected)
    } catch (err) {
      console.error('Failed to fetch invoice details:', err)
    } finally {
      setRegisterLoading(false)
    }
  }

  const closeRegisterPopup = () => {
    setRegisterPopupOpen(false)
    setSelectedInvoice(null)
    setSelectedProjectId('')
    setSelectedLineItemIds([])
    setAlreadyRegistered(null)
    setRegisterLoading(false)
  }

  const parsedCount = invoices.filter(i => i.status === 'processed' || i.status === 'needs_review').length
  const failedCount = invoices.filter(i => i.status === 'error').length
  const pendingCount = invoices.filter(i => !i.status || i.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col relative -m-8 p-8">
      <div className="max-w-7xl w-full mx-auto pb-20">

        {/* Upload Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">UPLOAD</h1>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mt-1">Upload invoice files and extract data automatically</p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer relative overflow-hidden mb-8 transition-all ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/80'
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 text-primary-600 dark:text-primary-400">
              <UploadIcon size={42} strokeWidth={2} />
            </div>
            <p className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4">
              Drag & Drop invoice files here or
            </p>
            <button className="aiq-btn-primary mb-4">Browse Files</button>
            <p className="text-gray-700 dark:text-gray-300 text-xs font-semibold">Supports: PDF, JPG, PNG, Excel, CSV (Max size: 20MB)</p>
          </div>
        </div>

        {/* Selected Files & Progress */}
        {files.length > 0 && (
          <div className="mb-10 aiq-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Files Ready for Processing ({files.length})</h3>
              <button onClick={clearAll} className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">Clear All</button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 mb-6 pr-2">
              {files.map(f => (
                <div key={f.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-md">{f.name}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter(file => file.name !== f.name))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XCircle size={18} />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">{error}</div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={startUpload}
                disabled={uploading || !!jobId}
                className={`w-full py-3 rounded-lg font-semibold text-gray-900 dark:text-gray-100 transition-all flex justify-center items-center gap-2 ${uploading ? 'bg-primary-400' : jobId ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow'
                  }`}
              >
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin" /> Uploading {uploadPct}%...</>
                ) : jobId ? (
                  <><CheckCircle size={18} /> Upload Complete</>
                ) : (
                  <><UploadIcon size={18} /> Process {files.length} File{files.length !== 1 ? 's' : ''}</>
                )}
              </button>

              {(uploading || job) && (
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${job ? 'bg-green-500' : 'bg-primary-600'}`}
                    style={{ width: `${job ? Math.round(((job.processed + job.failed) / Math.max(job.total_files, 1)) * 100) : uploadPct}%` }}
                  />
                </div>
              )}

              {job && (
                <div className="flex justify-between text-xs font-semibold text-gray-800 dark:text-gray-200 px-1 mt-1">
                  <span>Processed: {job.processed}</span>
                  {job.failed > 0 && <span className="text-red-500">Failed: {job.failed}</span>}
                  {job.pending > 0 && <span>Pending: {job.pending}</span>}
                </div>
              )}

              {job && <TerminalLogs logs={job.logs} />}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-5 mb-10">
          {[
            { label: 'Total Uploaded', value: total || invoices.length || 0, icon: UploadIcon, bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Parsed Successfully', value: parsedCount, icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Pending Parsing', value: pendingCount, icon: Clock, bg: 'bg-orange-50 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Failed', value: failedCount, icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
            { label: 'Duplicates', value: 0, icon: FileText, bg: 'bg-indigo-50 dark:bg-indigo-900/30', color: 'text-indigo-600 dark:text-indigo-400' },
          ].map(card => (
            <div key={card.label} className="aiq-card p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                  <card.icon size={16} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Upload History Table */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload History</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." className="aiq-input pl-9 pr-4 py-2 min-w-[250px]" />
            </div>
            <button className="aiq-btn-ghost flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] px-4">
              <Filter size={16} /> Filters
            </button>
            <button onClick={fetchData} className="aiq-btn-ghost flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] w-[42px] p-0">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="aiq-card overflow-hidden relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold tracking-wider uppercase">
              <tr>
                <th className="py-4 px-6">File Name</th>
                <th className="py-4 px-6">File Type</th>
                <th className="py-4 px-6">Invoice ID</th>
                <th className="py-4 px-6">Uploaded On</th>
                <th className="py-4 px-6">Parse Status</th>
                <th className="py-4 px-6">Registration</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200">
              {invoices.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-700 dark:text-gray-300 font-semibold">No upload history found.</td>
                </tr>
              ) : (
                invoices.map((item) => {
                  const parseStatus = item.status === 'processed' || item.status === 'needs_review' ? 'Parsed' : item.status === 'error' ? 'Failed' : 'Pending'
                  const isExpanded = expandedRow === item.id
                  const isRegistered = invoiceAssignments.some(a => a.invoice_id === item.id)
                  const registeredProject = isRegistered
                    ? projects.find(p => p.id === invoiceAssignments.find(a => a.invoice_id === item.id)?.project_id)
                    : null

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="py-4 px-6 max-w-[200px] truncate font-semibold" title={item.file_name || item.invoice_number}>
                          {item.file_name || item.invoice_number || `INV-${item.id}`}
                        </td>
                        <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                          {item.file_name ? item.file_name.split('.').pop().toUpperCase() : 'PDF'}
                        </td>
                        <td className="py-4 px-6 text-gray-800 dark:text-gray-200">{item.invoice_number || item.id}</td>
                        <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.invoice_date || '—')}
                        </td>
                        <td className="py-4 px-6">
                          {parseStatus === 'Parsed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">Parsed</span>
                          )}
                          {parseStatus === 'Failed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">Failed</span>
                          )}
                          {parseStatus === 'Pending' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">Pending</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {isRegistered ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle size={11} /> {registeredProject?.name || 'Registered'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              Unregistered
                            </span>
                          )}
                        </td>
                        <NoteTarget as="td" targetType="invoice" targetId={item.id} className="py-4 px-6 flex items-center justify-end gap-3 text-gray-400 relative z-20">
                          <button onClick={() => handleToggleExpand(item)} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="View/Edit"><Eye size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDownload(item)} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Download"><Download size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDelete(item.id)} className="hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete"><Trash2 size={18} strokeWidth={1.5} /></button>
                          <button
                            onClick={() => openRegisterPopup(item)}
                            className={`ml-3 py-1.5 px-3.5 text-xs h-auto rounded font-semibold transition-colors ${isRegistered
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'aiq-btn-primary'
                              }`}
                          >
                            {isRegistered ? 'Registered ✓' : 'Register'}
                          </button>
                        </NoteTarget>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm w-full">
                              <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-primary-600 dark:text-primary-400" />
                                Edit Invoice Details
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                {[
                                  { label: 'Invoice Number', field: 'invoice_number' },
                                  { label: 'Invoice Date', field: 'invoice_date' },
                                  { label: 'Invoice Details', field: 'invoice_details' },
                                  { label: 'GST Registration No', field: 'gst_registration_no' },
                                  { label: 'PAN No', field: 'pan_no' },
                                  { label: 'CIN No', field: 'cin_no' },
                                ].map(f => (
                                  <div key={f.field}>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">{f.label}</label>
                                    <input
                                      type="text"
                                      value={editData[f.field] || ''}
                                      onChange={(e) => handleEditChange(f.field, e.target.value)}
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                    />
                                  </div>
                                ))}
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Status</label>
                                  <select
                                    value={editData.status || ''}
                                    onChange={(e) => handleEditChange('status', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none bg-white dark:bg-gray-800"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processed">Processed</option>
                                    <option value="needs_review">Needs Review</option>
                                    <option value="error">Error</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mt-8">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Line Items</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                      <tr className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                                        {['Description', 'HSN', 'Unit Price', 'Qty', 'Net Amt', 'Tax Rate', 'Tax Type', 'Tax Amt', 'Total Amt'].map(h => (
                                          <th key={h} className="px-2 py-2">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(editData.line_items || []).map((li, index) => (
                                        <tr key={index} className="border-b dark:border-gray-700">
                                          <td className="p-1"><input type="text" className="w-32 border rounded px-1 py-1 text-xs" value={li.name || ''} onChange={(e) => handleLineItemChange(index, 'name', e.target.value)} /></td>
                                          <td className="p-1"><input type="text" className="w-20 border rounded px-1 py-1 text-xs" value={li.hsn_code || ''} onChange={(e) => handleLineItemChange(index, 'hsn_code', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-20 border rounded px-1 py-1 text-xs" value={li.unit_price || ''} onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-16 border rounded px-1 py-1 text-xs" value={li.quantity || ''} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-20 border rounded px-1 py-1 text-xs" value={li.net_amount || ''} onChange={(e) => handleLineItemChange(index, 'net_amount', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-16 border rounded px-1 py-1 text-xs" value={li.tax_rate || ''} onChange={(e) => handleLineItemChange(index, 'tax_rate', e.target.value)} /></td>
                                          <td className="p-1"><input type="text" className="w-20 border rounded px-1 py-1 text-xs" value={li.tax_type || ''} onChange={(e) => handleLineItemChange(index, 'tax_type', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-20 border rounded px-1 py-1 text-xs" value={li.tax_amount || ''} onChange={(e) => handleLineItemChange(index, 'tax_amount', e.target.value)} /></td>
                                          <td className="p-1"><input type="number" className="w-20 border rounded px-1 py-1 text-xs" value={li.total_amount || ''} onChange={(e) => handleLineItemChange(index, 'total_amount', e.target.value)} /></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setExpandedRow(null)} className="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 rounded transition-colors">Cancel</button>
                                <button onClick={() => handleSaveEdit(item.id)} className="px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors shadow-sm flex items-center gap-2">
                                  <CheckCircle size={16} /> Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Inventory Items Table */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inventory Items</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Items extracted from registered invoices via AI parsing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <form onSubmit={handleInventorySearchSubmit} className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="aiq-input pl-9 pr-4 py-2 min-w-[250px]"
                />
              </form>
              <button onClick={() => fetchInventoryItems(inventorySearch)} className="aiq-btn-ghost flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] w-[42px] p-0">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="aiq-card overflow-hidden relative min-h-[200px]">
            {inventoryLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
              </div>
            )}
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold tracking-wider uppercase">
                <tr>
                  <th className="py-4 px-6">Item Name</th>
                  <th className="py-4 px-6">Invoice Source</th>
                  <th className="py-4 px-6">Upload Date</th>
                  <th className="py-4 px-6">Qty</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Notes</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200">
                {inventoryItems.length === 0 && !inventoryLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Package size={24} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-700 dark:text-gray-300 font-semibold">No inventory items yet</p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Upload and register invoices to populate your inventory</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventoryItems.map((item) => {
                    const isExpanded = inventoryExpandedRow === item.id
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                          <td className="py-4 px-6 max-w-[250px]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                                <Package size={14} />
                              </div>
                              <span className="font-semibold truncate" title={item.item_name}>{item.item_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]" title={item.source_file_name}>{item.source_file_name || '—'}</span>
                              {item.invoice_number && <span className="text-[11px] text-gray-500 dark:text-gray-400">#{item.invoice_number}</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-4 px-6 text-gray-800 dark:text-gray-200 font-semibold">{item.quantity || 0}</td>
                          <td className="py-4 px-6 text-gray-800 dark:text-gray-200 font-semibold">
                            {item.total_amount ? `₹${Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-4 px-6 max-w-[180px]">
                            {item.notes
                              ? <span className="text-xs text-gray-600 dark:text-gray-400 truncate block" title={item.notes}>{item.notes}</span>
                              : <span className="text-xs text-gray-400 italic">No notes</span>
                            }
                          </td>
                          <td className="py-4 px-6 flex items-center justify-end gap-3 text-gray-400">
                            <button onClick={() => handleInventoryToggleExpand(item)} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="View / Edit">
                              <Eye size={18} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => handleInventoryDelete(item.id)} className="hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete">
                              <Trash2 size={18} strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-800">
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm w-full">
                                <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                  <Edit size={16} className="text-primary-600 dark:text-primary-400" />
                                  Modify Inventory Item
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                  <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Item Name</label>
                                    <input type="text" value={inventoryEditData.item_name || ''} onChange={(e) => handleInventoryEditChange('item_name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Quantity</label>
                                    <input type="number" step="any" value={inventoryEditData.quantity || ''} onChange={(e) => handleInventoryEditChange('quantity', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Unit Price</label>
                                    <input type="number" step="any" value={inventoryEditData.unit_price || ''} onChange={(e) => handleInventoryEditChange('unit_price', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Total Amount</label>
                                    <input type="number" step="any" value={inventoryEditData.total_amount || ''} onChange={(e) => handleInventoryEditChange('total_amount', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">HSN Code</label>
                                    <input type="text" value={inventoryEditData.hsn_code || ''} disabled className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 rounded px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5">Invoice Source</label>
                                    <input type="text" value={inventoryEditData.source_file_name || ''} disabled className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 rounded px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
                                  </div>
                                </div>

                                <div className="mt-5">
                                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Notes
                                  </label>
                                  <textarea
                                    value={inventoryEditData.notes || ''}
                                    onChange={(e) => handleInventoryEditChange('notes', e.target.value)}
                                    placeholder="Add notes about this inventory item..."
                                    rows={3}
                                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none resize-none"
                                  />
                                </div>

                                <div className="mt-5 flex justify-end gap-3">
                                  <button onClick={() => setInventoryExpandedRow(null)} className="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
                                  <button onClick={() => handleInventorySave(item.id)} className="px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors shadow-sm flex items-center gap-2">
                                    <Save size={16} /> Save Changes
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>

            {inventoryItems.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Showing {inventoryItems.length} of {inventoryTotal} inventory items
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {registerPopupOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg relative border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <button onClick={closeRegisterPopup} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:text-gray-200 transition-colors">
              <XCircle size={20} strokeWidth={2} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Register Invoice</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium truncate">{selectedInvoice?.fileName}</p>

            {/* Already registered */}
            {alreadyRegistered ? (
              <div className="flex flex-col gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Already Registered</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">This invoice has been registered to:</p>
                    <p className="text-sm font-black text-emerald-900 dark:text-emerald-200 mt-2">{alreadyRegistered.name}</p>
                    {alreadyRegistered.project_code && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                        {alreadyRegistered.project_code}{alreadyRegistered.batch_id ? ` · Batch: ${alreadyRegistered.batch_id}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  To register to a different project, remove the existing assignment first.
                </p>
                <div className="flex justify-end">
                  <button onClick={closeRegisterPopup} className="aiq-btn-ghost">Close</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="aiq-input appearance-none"
                  >
                    <option value="">-- Choose a Project --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.project_code ? `(ID: ${p.project_code}, Batch: ${p.batch_id || 'N/A'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectId && (
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg max-h-[200px] overflow-y-auto mb-4">
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Connected Hierarchy</h3>
                    {connectedWorkflows.length === 0 ? (
                      <div className="text-sm text-gray-400 italic">No workflows connected to this project.</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {connectedWorkflows.map(w => {
                          const connectedStates = pwsAssignments
                            .filter(a => a.parent_id === w.id)
                            .map(a => states.find(s => s.id === a.child_id))
                            .filter(Boolean)
                          return (
                            <div key={w.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded shadow-sm">
                              <div className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                                <span className="text-primary-600">Workflow:</span> {w.name}
                              </div>
                              <div className="pl-4 border-l-2 border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                                {connectedStates.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">No stages assigned</span>
                                ) : (
                                  connectedStates.map(s => (
                                    <span key={s.id} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Stage: {s.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Line Items Checklist */}
                {registerLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary-600" />
                      <p className="text-sm text-gray-500 font-medium">Loading invoice items...</p>
                    </div>
                  </div>
                ) : selectedInvoice?.line_items && selectedInvoice.line_items.length > 0 ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Select Inventory Items</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedLineItemIds((selectedInvoice.line_items || []).map(li => li.id))} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setSelectedLineItemIds([])} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {selectedLineItemIds.length} of {selectedInvoice.line_items.length} items selected. Uncheck items that are not physical products.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg max-h-[220px] overflow-y-auto space-y-2">
                      {selectedInvoice.line_items.map((li, idx) => (
                        <label key={li.id || idx} className="flex items-start gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedLineItemIds.includes(li.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLineItemIds(prev => [...prev, li.id])
                              } else {
                                setSelectedLineItemIds(prev => prev.filter(id => id !== li.id))
                              }
                            }}
                            className="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{li.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Qty: {li.quantity ?? '—'} · Unit Price: ₹{li.unit_price ?? '—'} · Total: ₹{li.total_amount ?? '—'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
                    No line items found for this invoice. The PDF may not have been parsed successfully.
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeRegisterPopup} className="aiq-btn-ghost">Cancel</button>
                  <button
                    onClick={handleRegisterSave}
                    disabled={!selectedProjectId || registerLoading}
                    className="aiq-btn-primary disabled:opacity-50"
                  >
                    Register & Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}