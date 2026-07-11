import { useState, useEffect } from 'react'
import { ClipboardPlus, Loader2, AlertTriangle, ScanLine, Printer, ShieldCheck, XCircle } from 'lucide-react'
import clsx from 'clsx'

import ScanBatchModal from '../batch/ScanBatchModal'
import { parseBatchScan } from '../../utils/batchScan'
import { getQualityNoteQRCode, verifyQualityNoteQR } from '../../api/client'

export const NOTE_TYPES = ['Inspection', 'Deviation', 'Audit', 'Calibration', 'Corrective Action']
export const NOTE_STATUSES = ['Open', 'In Progress', 'Pending Approval', 'Resolved', 'Closed']
export const SEVERITIES = ['Low', 'Medium', 'High']

const WORKFLOW_STAGES = ['Raw Material Intake', 'Processing', 'Packaging', 'Warehousing', 'Dispatch']
const PROCESSES = ['Visual Inspection', 'Lab Testing', 'Weight Verification', 'Label Check', 'Final QA Sign-off']

const emptyNote = {
  project_name: '',
  project_id: '',
  workflow_id: '',
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

function handlePrintQr(qr) {
  const win = window.open('', '_blank', 'width=380,height=440')
  if (!win) return
  win.document.write(`
    <html>
      <head>
        <title>${qr.note_display_id}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 28px; }
          img { width: 220px; height: 220px; }
          p { font-family: monospace; font-weight: 700; margin-top: 14px; font-size: 13px; }
        </style>
      </head>
      <body>
        <img src="${qr.image_base64}" />
        <p>${qr.note_display_id}</p>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
    </html>
  `)
  win.document.close()
}

export default function QualityNoteForm({ onSave, projectOptions = [], pwsItems = [], pwsAssignments = [], onAllowedTypesChange }) {
  const [note, setNote] = useState(emptyNote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [qr, setQr] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)

  // Derived options from PWS hierarchy
  const projects = pwsItems.filter(p => p.type === 'project');

  // Try to find the exact project by project_code or name
  const selectedProject = projects.find(p => p.project_code === note.project_id) || projects.find(p => p.name === note.project_name);

  // Workflows assigned to this project
  const projectWorkflowIds = pwsAssignments.filter(a => a.parent_id === selectedProject?.id).map(a => a.child_id);
  const availableWorkflows = pwsItems.filter(p => p.type === 'workflow' && projectWorkflowIds.includes(p.id));

  // Selected workflow object (for batch_id auto-fill)
  const selectedWorkflow = availableWorkflows.find(w => w.id === note.workflow_id);

  // Stages assigned to those workflows
  const stageIds = pwsAssignments.filter(a => projectWorkflowIds.includes(a.parent_id)).map(a => a.child_id);
  const availableStages = pwsItems.filter(p => p.type === 'stage' && stageIds.includes(p.id));

  // Find the selected stage object to filter processes
  const selectedStageObj = availableStages.find(s => s.name === note.workflow_stage);

  // Processes assigned to the selected stage
  const processIds = selectedStageObj ? pwsAssignments.filter(a => a.parent_id === selectedStageObj.id).map(a => a.child_id) : [];
  const availableProcesses = pwsItems.filter(p => p.type === 'process' && processIds.includes(p.id));

  // Derive allowedTypes from selected process only (process-level checkboxes only)
  const selectedProcessObj = availableProcesses.find(p => p.name === note.process);
  const derivedAllowedTypes = (selectedProcessObj?.allowed_image_types?.length > 0)
    ? selectedProcessObj.allowed_image_types
    : [];

  // Notify parent whenever the derived allowed types change
  const derivedKey = JSON.stringify(derivedAllowedTypes);
  useEffect(() => {
    onAllowedTypesChange?.(derivedAllowedTypes);
  }, [derivedKey]); // eslint-disable-line

  const handleProjectSelect = (e) => {
    const projId = e.target.value;
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setNote(n => ({
        ...n,
        project_name: proj.name,
        project_id: proj.project_code || proj.id,
        workflow_id: '',
        batch_id: '',
        workflow_stage: '',
        process: ''
      }));
    } else {
      setNote(n => ({
        ...n,
        project_name: '',
        project_id: '',
        workflow_id: '',
        batch_id: '',
        workflow_stage: '',
        process: ''
      }));
    }
  };

  const handleWorkflowSelect = (e) => {
    const wfId = e.target.value;
    const wf = availableWorkflows.find(w => w.id === wfId);
    setNote(n => ({
      ...n,
      workflow_id: wfId,
      batch_id: wf?.batch_id || '',
      workflow_stage: '',
      process: ''
    }));
  };

  const update = (field) => (e) => setNote((n) => ({ ...n, [field]: e.target.value }))

  const handleScanDetected = async (raw) => {
    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }

    if (parsed && parsed.type === 'quality_note') {
      setVerifyResult(null)
      setVerifying(true)
      try {
        const { data } = await verifyQualityNoteQR(raw)
        setVerifyResult(data)
      } catch (err) {
        setVerifyResult({ valid: false, reason: 'Could not reach the server to verify this code.' })
      } finally {
        setVerifying(false)
      }
      return
    }

    const { batchId, projectId, projectName, workflowStage } = parseBatchScan(raw)
    setNote((n) => ({
      ...n,
      batch_id: batchId || n.batch_id,
      project_id: projectId || n.project_id,
      project_name: n.project_name || projectName || n.project_name,
      workflow_stage: workflowStage || n.workflow_stage,
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
      const created = await onSave?.(note)
      setNote(emptyNote)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)

      setQr(null)
      setVerifyResult(null)
      if (created?.id) {
        setQrLoading(true)
        try {
          const { data } = await getQualityNoteQRCode(created.id)
          setQr(data)
        } catch (err) {
          setQr(null)
        } finally {
          setQrLoading(false)
        }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save quality note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="card-brutal-dark p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardPlus size={18} className="text-primary-600" />
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
            New Quality Note
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project Name">
            <select
              className={inputCls}
              value={selectedProject?.id || ''}
              onChange={handleProjectSelect}
            >
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <Field
            label="Project ID"
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
              className={clsx(inputCls, 'font-mono bg-gray-50 dark:bg-gray-900 cursor-not-allowed text-gray-500 dark:text-gray-400')}
              placeholder="Auto-filled by project selection"
              value={note.project_id}
              readOnly
              tabIndex={-1}
            />
          </Field>

          <Field label="Workflow">
            <select
              className={clsx(inputCls, !selectedProject && 'opacity-50 cursor-not-allowed')}
              value={note.workflow_id}
              onChange={handleWorkflowSelect}
              disabled={!selectedProject}
            >
              <option value="">
                {selectedProject
                  ? availableWorkflows.length === 0
                    ? 'No workflows assigned to project'
                    : 'Select a workflow...'
                  : 'Select a project first...'}
              </option>
              {availableWorkflows.map(w => (
                <option key={w.id} value={w.id}>{w.name}{w.batch_id ? ` — ${w.batch_id}` : ''}</option>
              ))}
            </select>
          </Field>

          <Field label="Batch ID">
            <input
              className={clsx(inputCls, 'font-mono bg-gray-50 dark:bg-gray-900 cursor-not-allowed text-gray-500 dark:text-gray-400')}
              placeholder="Auto-filled by workflow selection"
              value={note.batch_id}
              readOnly
              tabIndex={-1}
            />
          </Field>

          <Field label="Stage">
            <select
              className={inputCls}
              value={note.workflow_stage}
              onChange={(e) => setNote(n => ({ ...n, workflow_stage: e.target.value, process: '' }))}
            >
              <option value="">Select a stage...</option>
              {availableStages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>

          <Field label="Process">
            <select className={inputCls} value={note.process} onChange={update('process')}>
              <option value="">Select a process...</option>
              {availableProcesses.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
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

          <div className="sm:col-span-2">
            <Field label="Severity">
              <div className="flex gap-3">
                {SEVERITIES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setNote((n) => ({ ...n, severity: s }))}
                    className={clsx(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors',
                      note.severity === s
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', SEVERITY_DOT[s])} />
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
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

        {qrLoading && (
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Generating QR label…
          </div>
        )}

        {qr && !qrLoading && (
          <div className="mt-5 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4">
            <img src={qr.image_base64} alt={qr.note_display_id} className="w-20 h-20 bg-white rounded-lg p-1" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Note QR Label</p>
              <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{qr.note_display_id}</p>
              <button
                type="button"
                onClick={() => handlePrintQr(qr)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                <Printer size={13} /> Print label
              </button>
            </div>
          </div>
        )}

        {verifying && (
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Verifying scanned code…
          </div>
        )}

        {verifyResult && !verifying && (
          <div
            className={clsx(
              'mt-5 flex items-start gap-2 text-xs font-semibold rounded-lg px-3 py-2.5 border',
              verifyResult.valid
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40'
                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40'
            )}
          >
            {verifyResult.valid ? <ShieldCheck size={14} className="shrink-0 mt-0.5" /> : <XCircle size={14} className="shrink-0 mt-0.5" />}
            <span>
              {verifyResult.valid
                ? `Verified against server records — ${verifyResult.note?.note_type} note, status ${verifyResult.note?.status}.`
                : verifyResult.reason || 'This code could not be verified.'}
            </span>
          </div>
        )}
      </form>

      <ScanBatchModal open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleScanDetected} />
    </>
  )
}