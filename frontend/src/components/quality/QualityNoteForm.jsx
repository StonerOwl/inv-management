import { useState } from 'react'
import { ClipboardPlus, Loader2, AlertTriangle, ScanLine } from 'lucide-react'
import clsx from 'clsx'

import ScanBatchModal from '../batch/ScanBatchModal'
import { parseBatchScan } from '../../utils/batchScan'

export const NOTE_TYPES = ['Inspection', 'Deviation', 'Audit', 'Calibration', 'Corrective Action']
export const NOTE_STATUSES = ['Open', 'In Progress', 'Pending Approval', 'Resolved', 'Closed']
export const SEVERITIES = ['Low', 'Medium', 'High']

// Placeholder taxonomy -- in this repo, Workflow / Process names already exist
// per-category under Track & Trace (see api/client.js: listCategories / createWorkflow).
// Swap these for `useEffect(() => listCategories()...)` results to stay in sync.
const WORKFLOW_STAGES = ['Raw Material Intake', 'Processing', 'Packaging', 'Warehousing', 'Dispatch']
const PROCESSES = ['Visual Inspection', 'Lab Testing', 'Weight Verification', 'Label Check', 'Final QA Sign-off']

const emptyNote = {
  project_name: '',
  batch_id: '',
  workflow_stage: WORKFLOW_STAGES[0],
  process: PROCESSES[0],
  note_type: NOTE_TYPES[0],
  status: NOTE_STATUSES[1],
  severity: SEVERITIES[0],
  observation: '',
}

function Field({ label, action, children }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {action}
      </span>
      {children}
    </label>
  )
}

const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-600 transition-colors rounded-lg'

const SEVERITY_DOT = { Low: 'bg-emerald-500', Medium: 'bg-amber-500', High: 'bg-red-500' }

/**
 * onSave(note) should call the FastAPI endpoint (POST /api/quality/notes, see
 * backend/api/routes/quality.py) and return the created note. It may reject --
 * the form surfaces that as an inline error and keeps the user's input.
 */
export default function QualityNoteForm({ onSave, projectOptions = [] }) {
  const [note, setNote] = useState(emptyNote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  const update = (field) => (e) => setNote((n) => ({ ...n, [field]: e.target.value }))

  // Reads whatever project/batch QR the Projects module prints (see
  // BatchIdentityCard) and drops it straight into the form. Only backfills
  // Project Name if the scan carried one and the field is still empty, so it
  // never clobbers something the inspector already typed.
  const handleScanDetected = (raw) => {
    const { batchId, projectName } = parseBatchScan(raw)
    setNote((n) => ({
      ...n,
      batch_id: batchId || n.batch_id,
      project_name: n.project_name || projectName || n.project_name,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.project_name.trim() || !note.batch_id.trim() || !note.observation.trim()) {
      setError('Project Name, Batch ID, and Observation are required.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave?.(note)
      setNote(emptyNote)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save quality note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="card-brutal-dark p-6">
      <div className="flex items-center gap-2 mb-5">
        <ClipboardPlus size={18} className="text-primary-600" />
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
          New Quality Note
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Project Name">
          <input
            list="qm-project-options"
            className={inputCls}
            placeholder="e.g. Coconut Oil"
            value={note.project_name}
            onChange={update('project_name')}
          />
          <datalist id="qm-project-options">
            {projectOptions.map((p) => <option key={p} value={p} />)}
          </datalist>
        </Field>

        <Field
          label="Batch ID"
          action={
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary-600 hover:text-primary-700"
            >
              <ScanLine size={11} /> Scan
            </button>
          }
        >
          <input
            className={clsx(inputCls, 'font-mono')}
            placeholder="e.g. PRSJ-2026-001-0001, or tap Scan"
            value={note.batch_id}
            onChange={update('batch_id')}
          />
        </Field>

        <Field label="Workflow Stage">
          <select className={inputCls} value={note.workflow_stage} onChange={update('workflow_stage')}>
            {WORKFLOW_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Process">
          <select className={inputCls} value={note.process} onChange={update('process')}>
            {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Note Type">
          <select className={inputCls} value={note.note_type} onChange={update('note_type')}>
            {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Status">
          <select className={inputCls} value={note.status} onChange={update('status')}>
            {NOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Severity">
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setNote((n) => ({ ...n, severity: s }))}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold border transition-colors',
                  note.severity === s
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full', SEVERITY_DOT[s])} />
                {s}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Observation / Note">
          <textarea
            className={clsx(inputCls, 'min-h-28 resize-y')}
            placeholder="Describe what was observed during this check..."
            value={note.observation}
            onChange={update('observation')}
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-brutal-dark flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardPlus size={15} />}
          Save Quality Note
        </button>
        {savedFlash && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
      </div>
    </form>

    <ScanBatchModal open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleScanDetected} />
    </>
  )
}
