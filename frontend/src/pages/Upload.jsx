import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadInvoices, getJobStatus } from '../api/client'
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const POLL_INTERVAL = 1500 // ms

function FileRow({ file, removed, onRemove }) {
  const sizeKB = (file.size / 1024).toFixed(0)
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={16} className="text-brand-400 shrink-0" />
        <span className="text-sm text-white truncate">{file.name}</span>
        <span className="text-xs text-white/30 shrink-0">{sizeKB} KB</span>
      </div>
      <button
        onClick={() => onRemove(file)}
        className="text-white/20 hover:text-red-400 transition-colors ml-2 shrink-0"
      >
        <XCircle size={16} />
      </button>
    </div>
  )
}

function ResultRow({ result }) {
  const statusIcons = {
    ok: <CheckCircle size={16} className="text-emerald-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    duplicate: <RefreshCw size={16} className="text-blue-400" />,
    pending: <Loader2 size={16} className="text-white/40 animate-spin" />,
  }
  return (
    <div className="flex items-center justify-between py-2.5 px-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {statusIcons[result.status] || <Clock size={16} className="text-white/30" />}
        <span className="text-sm text-white/80 truncate">{result.file_name}</span>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {result.status === 'ok' && (
          <span className="text-xs text-white/40">#{result.invoice_id} · conf. {(result.confidence * 100).toFixed(0)}%</span>
        )}
        {result.status === 'error' && (
          <span className="text-xs text-red-400 max-w-xs truncate" title={result.error}>{result.error}</span>
        )}
        {result.status === 'duplicate' && (
          <span className="text-xs text-blue-400">Already in DB (#{result.invoice_id})</span>
        )}
      </div>
    </div>
  )
}

export default function Upload() {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [jobId, setJobId] = useState(null)
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !names.has(f.name))]
    })
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  })

  const removeFile = (target) =>
    setFiles(prev => prev.filter(f => f.name !== target.name))

  const clearAll = () => {
    setFiles([])
    setJob(null)
    setJobId(null)
    setError(null)
    setUploadPct(0)
    clearInterval(pollRef.current)
  }

  const startUpload = async () => {
    if (!files.length) return
    setUploading(true)
    setError(null)
    setJob(null)
    try {
      const { data } = await uploadInvoices(files, setUploadPct)
      setJobId(data.job_id)
      setUploading(false)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
      setUploading(false)
    }
  }

  // Poll job status
  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const { data } = await getJobStatus(jobId)
        setJob(data)
        if (data.status === 'done' || data.status === 'failed' || data.status === 'partial_failure') {
          clearInterval(pollRef.current)
        }
      } catch (_) {}
    }
    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [jobId])

  const processPct = job
    ? Math.round(((job.processed + job.failed) / Math.max(job.total_files, 1)) * 100)
    : 0

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload Invoices</h1>
        <p className="text-white/50 mt-1">Batch upload PDFs and images — processed locally with Ollama.</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'glass-card border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer',
          'transition-all duration-300 hover:border-brand-500/50 hover:bg-brand-500/5',
          isDragActive && 'dropzone-active',
        )}
      >
        <input {...getInputProps()} />
        <div className={clsx(
          'w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4 transition-transform duration-300',
          isDragActive && 'scale-110',
        )}>
          <UploadIcon size={28} className="text-brand-400" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">
          {isDragActive ? 'Drop your invoices here!' : 'Drag & drop invoices'}
        </p>
        <p className="text-white/40 text-sm mb-4">or click to browse files</p>
        <p className="text-white/25 text-xs">PDF, JPG, PNG, TIFF, WebP · Max 50MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 glass-card overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-medium text-white/70">
              {files.length} file{files.length !== 1 ? 's' : ''} queued
            </span>
            <button onClick={clearAll} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Clear all
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {files.map(f => <FileRow key={f.name} file={f} onRemove={removeFile} />)}
          </div>
          <div className="px-4 py-3 border-t border-white/5 flex gap-3 justify-end">
            <button
              onClick={startUpload}
              disabled={uploading || !!jobId}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <><Loader2 size={16} className="animate-spin" /> Uploading... {uploadPct}%</>
              ) : jobId ? (
                <><CheckCircle size={16} /> Uploaded</>
              ) : (
                <><UploadIcon size={16} /> Process {files.length} Invoice{files.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Job progress */}
      {job && (
        <div className="mt-6 glass-card overflow-hidden animate-slide-up">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-white font-semibold">Processing Job</h2>
                <p className="text-white/40 text-xs font-mono mt-0.5">{jobId}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-medium">{job.processed} done</span>
                {job.failed > 0 && <span className="text-red-400 font-medium">· {job.failed} failed</span>}
                {job.pending > 0 && <span className="text-white/40">· {job.pending} pending</span>}
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  job.status === 'done' ? 'bg-emerald-500' :
                  job.status === 'failed' ? 'bg-red-500' :
                  'bg-gradient-to-r from-brand-500 to-violet-500 progress-stripe',
                )}
                style={{ width: `${processPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span className={clsx(
                'font-medium',
                job.status === 'done' && 'text-emerald-400',
                job.status === 'failed' && 'text-red-400',
                job.status === 'processing' && 'text-brand-400',
              )}>
                {job.status.replace('_', ' ').toUpperCase()}
              </span>
              <span>{processPct}%</span>
            </div>
          </div>

          {/* Per-file results */}
          {job.results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {job.results.map((r, i) => <ResultRow key={i} result={r} />)}
            </div>
          )}

          {job.status === 'done' && (
            <div className="px-6 py-4 bg-emerald-500/5 border-t border-emerald-500/20 flex items-center justify-between">
              <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                <CheckCircle size={16} /> All done! {job.processed} invoice{job.processed !== 1 ? 's' : ''} saved to database.
              </p>
              <button onClick={clearAll} className="btn-ghost text-xs">Upload More</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
