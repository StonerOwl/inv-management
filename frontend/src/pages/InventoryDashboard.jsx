import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Download, Trash2, Search, Filter, Plus, FileText, Upload as UploadIcon, AlertCircle, CheckCircle, Loader2, RefreshCw, Layers, Edit, Eye, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext';
import { listInvoices, getUnmatchedInvoices, deleteInvoice, updateInvoice, uploadInvoices, getJobStatus, getPWSItems, getPWSAssignments, assignInvoiceToProject } from '../api/client'
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
    if (isNearBottom && !autoScroll) {
      setAutoScroll(true)
    } else if (!isNearBottom && autoScroll) {
      setAutoScroll(false)
    }
  }

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="p-4 h-48 overflow-y-auto overflow-x-hidden"
      >
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
  
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // PWS Data
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Edit expanded row state
  const [expandedRow, setExpandedRow] = useState(null)
  const [editData, setEditData] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, pwsRes, assignRes] = await Promise.all([
        listInvoices({ limit: 100 }),
        getPWSItems(),
        getPWSAssignments()
      ])
      setInvoices(invRes.data.items || [])
      setTotal(invRes.data.total || 0)
      setPwsItems(pwsRes.data || [])
      setPwsAssignments(assignRes.data || [])
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
  }, [fetchData])

  const handleRegisterSave = async () => {
    if (!selectedInvoice || !selectedProjectId) return

    try {
      await assignInvoiceToProject(selectedProjectId, selectedInvoice.id)
      alert("Invoice successfully registered to the selected project hierarchy!")
      closeRegisterPopup()
    } catch (err) {
      console.error("Failed to register invoice to project:", err)
      alert("Failed to register invoice to the selected project.")
    }
  }

  const projects = pwsItems.filter(i => i.type === 'project')
  const workflows = pwsItems.filter(i => i.type === 'workflow')
  const states = pwsItems.filter(i => i.type === 'state')

  // Get connected workflows for the selected project
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const openRegisterPopup = (invoice) => {
    setSelectedInvoice(invoice)
    setRegisterPopupOpen(true)
  }

  const closeRegisterPopup = () => {
    setRegisterPopupOpen(false)
    setSelectedInvoice(null)
  }

  // Calculate simple mock stats based on actual data
  const parsedCount = invoices.filter(i => i.status === 'processed' || i.status === 'needs_review').length
  const failedCount = invoices.filter(i => i.status === 'error').length
  const pendingCount = invoices.filter(i => !i.status || i.status === 'pending').length

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-sans flex flex-col relative -m-8 p-8 rounded-tl-xl shadow-inner">
      <div className="max-w-7xl w-full mx-auto pb-20">
        
        {/* Upload Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-primary-700 tracking-tight">UPLOAD</h1>
          <p className="text-[14px] text-gray-600 dark:text-gray-400 font-medium mt-1">Upload invoice files and extract data automatically</p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer relative overflow-hidden mb-8 transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-900'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
             <div className="mb-4 text-primary-600">
               <UploadIcon size={42} strokeWidth={2} />
             </div>
             <p className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
               Drag & Drop invoice files here or
             </p>
             <button className="bg-primary-600 hover:bg-primary-700 text-gray-900 dark:text-gray-100 font-semibold text-sm py-2 px-6 rounded-md transition-colors mb-4 shadow-sm">
               Browse Files
             </button>
             <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Supports: PDF, JPG, PNG, Excel, CSV (Max size: 20MB)</p>
          </div>
        </div>

        {/* Selected Files & Progress */}
        {files.length > 0 && (
          <div className="mb-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Files Ready for Processing ({files.length})</h3>
              <button onClick={clearAll} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
                Clear All
              </button>
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-2 mb-6 pr-2">
              {files.map(f => (
                <div key={f.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-primary-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-md">{f.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter(file => file.name !== f.name))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XCircle size={18} />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={startUpload}
                disabled={uploading || !!jobId}
                className={`w-full py-3 rounded-lg font-semibold text-gray-900 dark:text-gray-100 transition-all flex justify-center items-center gap-2 ${
                  uploading ? 'bg-primary-400' : jobId ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow'
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

              {/* Progress Bar */}
              {(uploading || job) && (
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${job ? 'bg-green-500' : 'bg-primary-50 dark:bg-primary-900/300'}`}
                    style={{ width: `${job ? Math.round(((job.processed + job.failed) / Math.max(job.total_files, 1)) * 100) : uploadPct}%` }}
                  ></div>
                </div>
              )}

              {job && (
                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 px-1 mt-1">
                  <span>Processed: {job.processed}</span>
                  {job.failed > 0 && <span className="text-red-500">Failed: {job.failed}</span>}
                  {job.pending > 0 && <span>Pending: {job.pending}</span>}
                </div>
              )}

              {/* Terminal Logs */}
              {job && <TerminalLogs logs={job.logs} />}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-5 mb-10">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary-600 text-gray-900 dark:text-gray-100 flex items-center justify-center shadow-sm">
                <UploadIcon size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-primary-700">Total Uploaded</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{total || invoices.length || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-600 text-gray-900 dark:text-gray-100 flex items-center justify-center shadow-sm">
                <CheckCircle size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-green-600">Parsed Successfully</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{parsedCount}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-400 text-gray-900 dark:text-gray-100 flex items-center justify-center shadow-sm">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-orange-500">Pending Parsing</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{pendingCount}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500 text-gray-900 dark:text-gray-100 flex items-center justify-center shadow-sm">
                <XCircle size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-red-500">Failed</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{failedCount}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-gray-900 dark:text-gray-100 flex items-center justify-center shadow-sm">
                <FileText size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-indigo-700">Duplicates</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">0</p>
          </div>
        </div>

        {/* Table Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload History</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-9 pr-4 outline-none text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 w-64 shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 shadow-sm transition-colors">
              <Filter size={16} /> Filters
            </button>
            <button onClick={fetchData} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-900 shadow-sm transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-bold  tracking-wider">
              <tr>
                <th className="py-4 px-6">File Name</th>
                <th className="py-4 px-6">File Type</th>
                <th className="py-4 px-6">Invoice ID</th>
                <th className="py-4 px-6">Uploaded On</th>
                <th className="py-4 px-6">Parse Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] font-medium text-gray-800 dark:text-gray-200">
              {invoices.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                    No upload history found.
                  </td>
                </tr>
              ) : (
                invoices.map((item) => {
                  const parseStatus = item.status === 'processed' || item.status === 'needs_review' ? 'Parsed' : item.status === 'error' ? 'Failed' : 'Pending';
                  const isExpanded = expandedRow === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6 max-w-[200px] truncate" title={item.file_name || item.invoice_number}>
                          {item.file_name || item.invoice_number || `INV-${item.id}`}
                        </td>
                        <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                          {item.file_name ? item.file_name.split('.').pop().toUpperCase() : 'PDF'}
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{item.invoice_number || item.id}</td>
                        <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.invoice_date || '—')}
                        </td>
                        <td className="py-4 px-6">
                          {parseStatus === 'Parsed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-200/60">
                              Parsed
                            </span>
                          )}
                          {parseStatus === 'Failed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                              Failed
                            </span>
                          )}
                          {parseStatus === 'Pending' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60">
                              Pending
                            </span>
                          )}
                        </td>
                        <NoteTarget as="td" targetType="invoice" targetId={item.id} className="py-4 px-6 flex items-center justify-end gap-3 text-gray-400 relative z-20">
                          <button onClick={() => handleToggleExpand(item)} className="hover:text-primary-600 transition-colors" title="View/Edit"><Eye size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDownload(item)} className="hover:text-primary-600 transition-colors" title="Download"><Download size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDelete(item.id)} className="hover:text-red-500 transition-colors" title="Delete"><Trash2 size={18} strokeWidth={1.5} /></button>
                          <button 
                            onClick={() => openRegisterPopup({ ...item, fileName: item.file_name || item.invoice_number || `INV-${item.id}` })}
                            className="ml-3 bg-primary-600 hover:bg-primary-700 text-gray-900 dark:text-gray-100 text-xs font-semibold py-1.5 px-3.5 rounded-md transition-colors shadow-sm"
                          >
                            Register
                          </button>
                        </NoteTarget>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/50 p-6 border-b border-gray-100 dark:border-gray-800">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm w-full">
                              <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-primary-600" />
                                Edit Invoice Details
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">Invoice Number</label>
                                  <input 
                                    type="text" 
                                    value={editData.invoice_number || ''} 
                                    onChange={(e) => handleEditChange('invoice_number', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">Invoice Date</label>
                                  <input 
                                    type="text" 
                                    value={editData.invoice_date || ''} 
                                    onChange={(e) => handleEditChange('invoice_date', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">Invoice Details</label>
                                  <input 
                                    type="text" 
                                    value={editData.invoice_details || ''} 
                                    onChange={(e) => handleEditChange('invoice_details', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">GST Registration No</label>
                                  <input 
                                    type="text" 
                                    value={editData.gst_registration_no || ''} 
                                    onChange={(e) => handleEditChange('gst_registration_no', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">PAN No</label>
                                  <input 
                                    type="text" 
                                    value={editData.pan_no || ''} 
                                    onChange={(e) => handleEditChange('pan_no', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">CIN No</label>
                                  <input 
                                    type="text" 
                                    value={editData.cin_no || ''} 
                                    onChange={(e) => handleEditChange('cin_no', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-primary-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-1.5">Status</label>
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

                              {/* Line Items Editor */}
                              <div className="mt-8">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Line Items</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                      <tr className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                                        <th className="px-2 py-2">Description</th>
                                        <th className="px-2 py-2">HSN</th>
                                        <th className="px-2 py-2">Unit Price</th>
                                        <th className="px-2 py-2">Qty</th>
                                        <th className="px-2 py-2">Net Amt</th>
                                        <th className="px-2 py-2">Tax Rate</th>
                                        <th className="px-2 py-2">Tax Type</th>
                                        <th className="px-2 py-2">Tax Amt</th>
                                        <th className="px-2 py-2">Total Amt</th>
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
                                <button 
                                  onClick={() => setExpandedRow(null)}
                                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-gray-900 dark:text-gray-100 rounded transition-colors shadow-sm flex items-center gap-2"
                                >
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
      </div>

      {/* Blank Popup Modal for Register */}
      {registerPopupOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg relative border border-gray-100 dark:border-gray-800">
            <button 
              onClick={closeRegisterPopup} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
            >
              <XCircle size={20} strokeWidth={2} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Register Invoice
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              {selectedInvoice?.fileName}
            </p>
            
            {/* PWS Hierarchy Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Project</label>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="">-- Choose a Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProjectId && (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400  tracking-wider mb-3">Connected Hierarchy</h3>
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
                              <span className="text-xs text-gray-400 italic">No states assigned</span>
                            ) : (
                              connectedStates.map(s => (
                                <span key={s.id} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  State: {s.name}
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
            
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={closeRegisterPopup}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRegisterSave}
                disabled={!selectedProjectId}
                className="px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
