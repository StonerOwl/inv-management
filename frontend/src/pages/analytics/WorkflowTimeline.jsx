import React, { useMemo, useState, useEffect } from 'react'
import {
  Image, Thermometer, ScanEye, Zap, ScanLine, Waves,
  FileSpreadsheet, BadgeCheck, ClipboardList, Layers,
  AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronRight,
} from 'lucide-react'
import api from '../../api/client'

// ─── Evidence type config ────────────────────────────────────────────────────
const IMAGE_TYPES = [
  { key: 'visual_image', label: 'Visual Image', Icon: Image, color: 'text-primary-500' },
  { key: 'nir_image', label: 'NIR Image', Icon: ScanEye, color: 'text-violet-500' },
  { key: 'thermal_image', label: 'Thermal Image', Icon: Thermometer, color: 'text-orange-500' },
  { key: 'xray_image', label: 'X-Ray Image', Icon: Zap, color: 'text-yellow-500' },
  { key: 'spectral_image', label: 'Spectral Image', Icon: ScanLine, color: 'text-cyan-500' },
  { key: 'ultrasonic_image', label: 'Ultrasonic Image', Icon: Waves, color: 'text-teal-500' },
  { key: 'qa_report', label: 'QA Report', Icon: FileSpreadsheet, color: 'text-emerald-500' },
  { key: 'manual_verification', label: 'Manual Verification', Icon: BadgeCheck, color: 'text-blue-500' },
]

const SEVERITY_CONFIG = {
  Critical: { cls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400', Icon: AlertTriangle },
  Major: { cls: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400', Icon: AlertTriangle },
  Minor: { cls: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400', Icon: Info },
  Info: { cls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400', Icon: Info },
}

// ─── Dropdown options ────────────────────────────────────────────────────────
const VIEW_OPTIONS = [
  { value: 'none', label: 'Default View' },
  { value: 'all', label: 'All Evidence & Notes' },
  { value: 'quality', label: 'Quality Notes' },
  ...IMAGE_TYPES.map(t => ({ value: t.key, label: t.label })),
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getImageTypeConfig(key) {
  return IMAGE_TYPES.find(t => t.key === key) || { label: key, Icon: Image, color: 'text-gray-400' }
}

function fileName(filePath) {
  return filePath ? filePath.split('/').pop() : 'Unnamed file'
}

function isImage(attachment) {
  const ft = (attachment.file_type || '').toLowerCase()
  const fn = (attachment.file_name || '').toLowerCase()
  return ft.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|tiff)$/.test(fn)
}

function isPDF(attachment) {
  const ft = (attachment.file_type || '').toLowerCase()
  const fn = (attachment.file_name || '').toLowerCase()
  return ft === 'application/pdf' || fn.endsWith('.pdf')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttachmentRow({ attachment }) {
  const { label, Icon, color } = getImageTypeConfig(attachment.evidence_type)
  const name = attachment.file_name || fileName(attachment.file_path)
  const [preview, setPreview] = useState(false)
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const canPreview = isImage(attachment) || isPDF(attachment)

  // Fetch file via axios so the auth token is included
  const loadFile = async () => {
    if (blobUrl) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/quality/attachments/${attachment.id}/file`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      setBlobUrl(url)
    } catch (e) {
      setError('Could not load file.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async () => {
    await loadFile()
    if (blobUrl) window.open(blobUrl, '_blank')
  }

  const handlePreview = async () => {
    if (!preview) await loadFile()
    setPreview(v => !v)
  }

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900/50">
      <div className="flex items-center gap-3 px-3 py-2">
        <Icon size={13} className={color + ' shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={name}>{name}</p>
          <p className="text-[10px] text-gray-400">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpen}
            disabled={loading}
            className="text-[10px] font-bold text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : 'Open ↗'}
          </button>
          {canPreview && (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {preview ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-[10px] text-red-500 px-3 pb-2">{error}</p>
      )}
      {preview && blobUrl && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 flex justify-center">
          {isImage(attachment)
            ? <img src={blobUrl} alt={name} className="max-h-64 max-w-full rounded object-contain" />
            : <iframe src={blobUrl} title={name} className="w-full h-64 rounded border border-gray-200 dark:border-gray-700" />
          }
        </div>
      )}
    </div>
  )
}

function QualityNoteCard({ note }) {
  const sev = SEVERITY_CONFIG[note.severity] || SEVERITY_CONFIG['Info']
  const SevIcon = sev.Icon
  return (
    <div className={`rounded-lg border p-3 ${sev.cls}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <SevIcon size={13} />
          <span className="text-[10px] font-black uppercase tracking-wide">{note.severity || 'Info'}</span>
          <span className="text-[10px] opacity-60">·</span>
          <span className="text-[10px] font-semibold opacity-70">{note.note_type}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">{note.status}</span>
      </div>
      {note.observation && (
        <p className="text-xs leading-relaxed line-clamp-3">{note.observation}</p>
      )}
      {note.attachments?.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {note.attachments.map(a => <AttachmentRow key={a.id} attachment={a} />)}
        </div>
      )}
      <p className="text-[9px] opacity-50 mt-2">
        {note.batch_id && <span className="font-mono mr-2">{note.batch_id}</span>}
        {note.created_at && new Date(note.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}

// ─── Panel rendered below the timeline ───────────────────────────────────────
function TimelineDetailPanel({ view, qualityNotes, allAttachments, stageOrder }) {
  if (view === 'none') return null

  const isImageType = IMAGE_TYPES.some(t => t.key === view)

  // Build an ordered list of {stageName, processes:[{procName, notes:[]}]}
  // following the exact order from stageOrder (which mirrors data.stages → processes)
  function buildOrdered(filterFn) {
    const result = []
    for (const { stageName, processes } of stageOrder) {
      const stageEntry = { stageName, processes: [] }
      // stage-level notes (process === null/undefined or no process match)
      const stageNotes = qualityNotes.filter(n =>
        n.workflow_stage === stageName && !n.process && filterFn(n)
      )
      if (stageNotes.length) stageEntry.processes.push({ procName: null, notes: stageNotes })
      // per-process notes in order
      for (const procName of processes) {
        const procNotes = qualityNotes.filter(n =>
          n.workflow_stage === stageName && n.process === procName && filterFn(n)
        )
        if (procNotes.length) stageEntry.processes.push({ procName, notes: procNotes })
      }
      if (stageEntry.processes.length) result.push(stageEntry)
    }
    // anything with an unknown/unassigned stage at the end
    const knownStages = new Set(stageOrder.map(s => s.stageName))
    const unassigned = qualityNotes.filter(n =>
      (!n.workflow_stage || !knownStages.has(n.workflow_stage)) && filterFn(n)
    )
    if (unassigned.length) result.push({ stageName: 'Unassigned', processes: [{ procName: null, notes: unassigned }] })
    return result
  }

  // ── All evidence & notes ──
  if (view === 'all') {
    const ordered = buildOrdered(() => true)
    const totalFiles = allAttachments.length
    return (
      <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={15} className="text-primary-500" />
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">All Evidence & Notes</h3>
          <span className="ml-auto text-[10px] text-gray-400">{qualityNotes.length} note{qualityNotes.length !== 1 ? 's' : ''} · {totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
        </div>
        {ordered.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No quality notes for this project.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {ordered.map(({ stageName, processes }) => (
              <StageGroup key={stageName} stageName={stageName} processes={processes} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Quality Notes ──
  if (view === 'quality') {
    const ordered = buildOrdered(() => true)
    return (
      <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={15} className="text-primary-500" />
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">Quality Notes</h3>
          <span className="ml-auto text-[10px] text-gray-400">{qualityNotes.length} note{qualityNotes.length !== 1 ? 's' : ''}</span>
        </div>
        {ordered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-semibold text-gray-500">No quality notes recorded for this project.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {ordered.map(({ stageName, processes }) => (
              <StageGroup key={stageName} stageName={stageName} processes={processes} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Specific image type ──
  if (isImageType) {
    const { label, Icon, color } = getImageTypeConfig(view)
    const ordered = buildOrdered(n => n.attachments?.some(a => a.evidence_type === view))
    const filtered = allAttachments.filter(a => a.evidence_type === view)
    return (
      <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon size={15} className={color} />
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">{label}</h3>
          <span className="ml-auto text-[10px] text-gray-400">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {ordered.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">No {label} files attached to this project.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {ordered.map(({ stageName, processes }) => (
              <StageGroup
                key={stageName}
                stageName={stageName}
                processes={processes}
                attachmentTypeFilter={view}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

function StageGroup({ stageName, processes, attachmentTypeFilter }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{stageName}</span>
      </button>
      {open && (
        <div className="ml-5 flex flex-col gap-4">
          {processes.map(({ procName, notes }) => (
            <div key={procName || '__stage__'}>
              {procName && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-1.5 ml-0.5">
                  ↳ {procName}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {notes.map(n => (
                  attachmentTypeFilter
                    ? n.attachments?.filter(a => a.evidence_type === attachmentTypeFilter).map(a => (
                      <AttachmentRow key={a.id} attachment={a} />
                    ))
                    : <QualityNoteCard key={n.id} note={n} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkflowTimeline({ data }) {
  const stageItems = useMemo(() => data?.stages || [], [data])
  const currentStage = data?.invoice?.current_stage || 'Not Started'
  const currentWorkflowName = data?.current_workflow || null
  const [expandedStage, setExpandedStage] = useState(null)
  const [view, setView] = useState('none')

  const qualityNotes = useMemo(() => data?.qualityNotes || [], [data])
  const allAttachments = useMemo(() =>
    qualityNotes.flatMap(n =>
      (n.attachments || []).map(a => ({
        ...a,
        stage: n.workflow_stage,
        process: n.process,
        note_id: n.id,
      }))
    ), [qualityNotes])

  // Ordered list of stages → processes matching analytics data order
  const stageOrder = useMemo(() =>
    (data?.stages || []).map(s => ({
      stageName: s.name,
      processes: (s.processes || []).map(p => p.name),
    }))
    , [data])

  const stageNodes = useMemo(() => {
    return stageItems.map((stage, idx) => {
      const processes = stage.processes || []
      const completed = processes.filter(p => p.completed).length
      const total = processes.length
      const progress = total > 0 ? Math.round((completed / total) * 100) : (stage.completed ? 100 : 0)
      const isActive = stage.name === currentStage && stage.workflow_name === currentWorkflowName
      const nodeKey = `${stage.workflow_id}::${stage.id}::${idx}`
      return { ...stage, processes, completedCount: completed, total, progress, isActive, nodeKey }
    })
  }, [stageItems, currentStage, currentWorkflowName])

  const toggleStage = (id) => setExpandedStage(prev => prev === id ? null : id)

  // Badge counts for the dropdown label
  const notesCount = qualityNotes.length
  const filesCount = allAttachments.length

  return (
    <div className="aiq-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50">
        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Stage Timeline</h2>
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">Click a stage node to expand its processes</p>
        </div>
        {(notesCount > 0 || filesCount > 0) && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            {notesCount > 0 && <span className="px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-bold">{notesCount} note{notesCount !== 1 ? 's' : ''}</span>}
            {filesCount > 0 && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold">{filesCount} file{filesCount !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {stageNodes.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-700 dark:text-gray-300">No stages defined for this project.</div>
      ) : (
        <>
          {/* Timeline */}
          <div className="px-6 py-8 overflow-x-auto">
            <div className="relative flex items-start w-full min-w-max">
              <div className="absolute top-[1.65rem] h-px bg-black dark:bg-white z-0" style={{ left: `${100 / (2 * stageNodes.length)}%`, right: `${100 / (2 * stageNodes.length)}%` }}></div>
              {stageNodes.map((stage, idx) => {
                const isExpanded = expandedStage === stage.nodeKey
                return (
                  <div key={stage.nodeKey} className="relative flex items-start flex-1">
                    <div className="flex flex-col items-center w-full">
                      <button
                        onClick={() => toggleStage(stage.nodeKey)}
                        className="group relative flex flex-col items-center focus:outline-none w-full max-w-[160px]"
                      >
                        <div className={`
                          relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-sm
                          transition-all duration-200 group-hover:scale-105
                          ${stage.isActive
                            ? 'border-primary-500 bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900'
                            : stage.progress === 100
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'border-black dark:border-white bg-white dark:bg-gray-800 text-black dark:text-white group-hover:border-primary-400'
                          }
                        `}>
                          {stage.progress === 100 ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-sm font-black">{idx + 1}</span>
                          )}
                        </div>

                        <div className="mt-3 text-center px-1">
                          <p className={`text-xs font-bold leading-tight ${stage.isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {stage.name}
                          </p>
                          {(stage.progress === 100 || stage.completed_at) && (
                            <p className="text-[9px] text-gray-700 dark:text-gray-300 mt-0.5">
                              {stage.completed_at ? new Date(stage.completed_at).toLocaleString() : new Date().toLocaleString()}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-1">{stage.total} process{stage.total !== 1 ? 'es' : ''}</p>

                          <div className="mt-2 w-20 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${stage.progress === 100 ? 'bg-emerald-500' : stage.isActive ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                              style={{ width: `${stage.progress}%` }}
                            />
                          </div>

                          <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors ${isExpanded ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                            {isExpanded ? (
                              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Collapse</>
                            ) : (
                              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>{stage.total} process{stage.total !== 1 ? 'es' : ''}</>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && stage.processes.length > 0 && (
                        <div className="mt-4 w-40 px-1">
                          <div className="relative flex flex-col gap-0">
                            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
                            {stage.processes.map((proc, pIdx) => (
                              <div key={proc.id} className="relative z-10">
                                <div className="flex items-center gap-3 py-2">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-white dark:bg-gray-800 transition-colors
                                    ${proc.completed ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}
                                  `}>
                                    {proc.completed ? (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span>{pIdx + 1}</span>
                                    )}
                                  </div>
                                  <div className="pt-1 min-w-0 flex-1">
                                    <p className={`text-[11px] font-semibold leading-tight ${proc.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {proc.name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend + Dropdown */}
            <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center flex-wrap gap-5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex flex-wrap gap-5">
                <LegendItem color="bg-primary-600" label="Active stage" />
                <LegendItem color="bg-emerald-500" label="Completed" />
                <LegendItem color="bg-gray-300 dark:bg-gray-600" label="Not started" />
                <LegendItem color="bg-violet-200 dark:bg-violet-900" label="Process" />
              </div>
              <div>
                <select
                  className="aiq-input text-xs py-2 px-3 min-w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm font-semibold cursor-pointer"
                  value={view}
                  onChange={e => setView(e.target.value)}
                >
                  {VIEW_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Detail panel — rendered below the timeline when a view is active */}
          <TimelineDetailPanel
            view={view}
            qualityNotes={qualityNotes}
            allAttachments={allAttachments}
            stageOrder={stageOrder}
          />
        </>
      )}
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
      <span className="text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  )
}