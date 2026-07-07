import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useUpload } from '../context/UploadContext'
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'



function FileRow({ file, removed, onRemove }) {
  const sizeKB = (file.size / 1024).toFixed(0)
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 group rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={16} className="text-primary-600 dark:text-primary-400 shrink-0" />
        <span className="text-sm font-bold truncate text-gray-900 dark:text-gray-100">{file.name}</span>
        <span className="text-xs text-gray-700 dark:text-gray-300 shrink-0">{sizeKB} KB</span>
      </div>
      <button
        onClick={() => onRemove(file)}
        className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2 shrink-0"
      >
        <XCircle size={16} />
      </button>
    </div>
  )
}

function TerminalLogs({ logs }) {
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

  if (!logs || logs.length === 0) return null;

  return (
    <div className="mb-6 bg-[#0c0c0c] text-[#00ff00] font-mono text-xs border border-[#333] rounded shadow-inner relative flex flex-col">
      <div className="flex justify-between items-center bg-[#1a1a1a] px-4 py-1 border-b border-[#333]">
        <span className="text-gray-400 font-sans text-[10px] uppercase tracking-wider">Processing Logs</span>
        <label className="flex items-center text-gray-400 font-sans text-[10px] uppercase tracking-wider cursor-pointer hover:text-gray-200">
          <input 
            type="checkbox" 
            checked={autoScroll} 
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="mr-1.5 w-3 h-3 accent-primary-500 cursor-pointer"
          />
          Auto-scroll
        </label>
      </div>
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="p-4 h-48 overflow-y-auto overflow-x-hidden"
      >
        {logs.map((log, i) => (
          <div key={i} className="mb-1">
            <span className="text-gray-500 mr-2">&gt;</span>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function ResultRow({ result, navigate }) {
  const statusIcons = {
    ok: <CheckCircle size={16} className="text-primary-600 dark:text-primary-400" />,
    error: <XCircle size={16} className="text-red-500 dark:text-red-400" />,
    duplicate: <RefreshCw size={16} className="text-gray-600 dark:text-gray-400" />,
    pending: <Loader2 size={16} className="text-gray-700 dark:text-gray-300 animate-spin" />,
  }
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {statusIcons[result.status] || <Clock size={16} className="text-gray-800 dark:text-gray-200" />}
        <span className="text-sm font-bold truncate text-gray-900 dark:text-gray-100">{result.file_name}</span>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0 font-sans">
        {result.status === 'ok' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">#{result.invoice_id} · CONF {(result.confidence * 100).toFixed(0)}%</span>
            <button 
              onClick={() => navigate(`/inventory/register/${result.invoice_id}`)}
              className="text-[10px] font-black tracking-normal text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 px-3 py-1 rounded-full transition-colors"
            >
              REGISTER
            </button>
          </div>
        )}
        {result.status === 'error' && (
          <span className="text-xs text-red-500 max-w-xs truncate" title={result.error}>{result.error}</span>
        )}
        {result.status === 'duplicate' && (
          <span className="text-xs text-gray-700 dark:text-gray-300">EXISTS (#{result.invoice_id})</span>
        )}
      </div>
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
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



  const processPct = job
    ? Math.round(((job.processed + job.failed) / Math.max(job.total_files, 1)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      
      <div className="max-w-5xl mx-auto w-full px-8 flex-1 pb-20 pt-10">
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Upload</h1>
          <div className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-4">
            <span>&gt; BATCH · EXTRACTION · QUEUE</span>
            <div className="w-32 h-[1px] bg-primary-500"></div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={clsx(
            'aiq-card border-2 border-dashed border-gray-300 dark:border-gray-700 p-16 text-center cursor-pointer relative overflow-hidden transition-all duration-200',
            isDragActive && 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10 scale-[1.02]',
            !isDragActive && 'hover:border-primary-400 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          )}
        >
          {isDragActive && (
            <div className="absolute inset-0 border-[6px] border-primary-500/20 pointer-events-none z-10 rounded-xl" />
          )}
          <input {...getInputProps()} />
          <div className={clsx(
            'w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 border-2 flex items-center justify-center mx-auto mb-6 transition-all duration-300 shadow-sm',
            isDragActive ? 'scale-110 border-primary-500 text-primary-600 dark:text-primary-400 shadow-md shadow-primary-500/20' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 group-hover:border-primary-300'
          )}>
            <UploadIcon size={32} />
          </div>
          <p className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-gray-100 mb-2">
            {isDragActive ? 'DROP TO QUEUE' : 'DRAG & DROP INVOICES'}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-6 tracking-wider">OR CLICK TO BROWSE FILES</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs font-semibold">PDF, JPG, PNG, TIFF, WEBP · MAX 50MB EACH</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="w-full h-1 bg-gradient-to-r from-primary-500/20 via-primary-500/40 to-primary-500/20 mb-8 rounded-full"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold tracking-normal text-primary-600 dark:text-primary-400">
                &gt; QUEUE [{files.length}]
              </span>
              <button onClick={clearAll} className="text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                [ CLEAR ALL ]
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6 pr-2">
              {files.map(f => <FileRow key={f.name} file={f} onRemove={removeFile} />)}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={startUpload}
                disabled={uploading || !!jobId}
                className="aiq-btn flex items-center gap-3 text-sm px-8 py-4"
              >
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin" /> UPLOADING... {uploadPct}%</>
                ) : jobId ? (
                  <><CheckCircle size={18} /> UPLOAD COMPLETE</>
                ) : (
                  <><UploadIcon size={18} /> PROCESS {files.length} FILE{files.length !== 1 ? 'S' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 border-l-4 border-red-500 bg-red-500/10 p-4 font-bold text-red-500  tracking-normal">
            ERROR: {error}
          </div>
        )}

        {/* Job progress */}
        {job && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">Processing Job</h2>
               <p className="text-gray-700 dark:text-gray-300 text-xs font-bold tracking-normal">ID: {jobId}</p>
            </div>
            
            <div className="aiq-card p-6">
              <div className="flex items-center justify-between mb-4 text-sm font-bold tracking-normal">
                <div className="flex gap-4">
                  <span className="text-primary-600 dark:text-primary-400">DONE: {job.processed}</span>
                  {job.failed > 0 && <span className="text-red-500 dark:text-red-400">FAIL: {job.failed}</span>}
                  {job.pending > 0 && <span className="text-gray-700 dark:text-gray-300">PEND: {job.pending}</span>}
                </div>
                <span className={clsx(
                  job.status === 'done' && 'text-primary-600',
                  job.status === 'failed' && 'text-red-500',
                  job.status === 'processing' && 'text-gray-900 dark:text-gray-100'
                )}>
                  STATUS: {job.status.replace('_', ' ')}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 mb-6 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full transition-all duration-500',
                    job.status === 'done' ? 'bg-primary-500' :
                    job.status === 'failed' ? 'bg-red-500' :
                    'bg-primary-400 animate-pulse',
                  )}
                  style={{ width: `${processPct}%` }}
                />
              </div>

              {/* Terminal Logs */}
              <TerminalLogs logs={job.logs} />

              {/* Per-file results */}
              {job.results.length > 0 && (
                <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg">
                  {job.results.map((r, i) => <ResultRow key={i} result={r} navigate={navigate} />)}
                </div>
              )}

              {job.status === 'done' && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-primary-600 font-bold tracking-normal flex items-center gap-2">
                    <CheckCircle size={20} /> BATCH COMPLETED
                  </p>
                  <button onClick={clearAll} className="text-sm font-bold tracking-normal text-gray-400 hover:text-gray-900 dark:text-gray-100 border-b border-transparent hover:border-white transition-all">
                    START NEW BATCH
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
