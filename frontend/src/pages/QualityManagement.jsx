import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ShieldCheck, ListChecks, Hourglass, CheckCircle2, WifiOff } from 'lucide-react'
import clsx from 'clsx'

import EvidenceSummaryCards from '../components/quality/EvidenceSummaryCards'
import QualityNoteForm, { NOTE_STATUSES, SEVERITIES } from '../components/quality/QualityNoteForm'
import EvidenceDropzone from '../components/quality/EvidenceDropzone'
import QualityNotesTable from '../components/quality/QualityNotesTable'
import {
  createQualityNote,
  approveQualityNote,
  listQualityNotes,
  getQualitySummary,
  uploadQualityEvidence,
  getPWSItems,
  getPWSAssignments,
} from '../api/client'

const SEVERITY_STYLE = {
  Low: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40',
  Medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
  High: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40',
}

const STATUS_STYLE = {
  Open: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  'In Progress': 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/40',
  'Pending Approval': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
  Resolved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40',
  Closed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

function Pill({ value, styles }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border', styles[value] || styles.Open)}>
      {value}
    </span>
  )
}

// Shown only if GET /api/quality/notes hasn't been reached yet (backend not
// running / route not registered) so the page still demos meaningfully.
function seedNotes() {
  const base = [
    { project: 'Coconut Oil', projectId: 'PRSJ-2026-001', batch: 'PRSJ-2026-001-0001', type: 'Inspection', status: 'Resolved', severity: 'Low', submitter: 'a.sharma' },
    { project: 'Coconut Oil', projectId: 'PRSJ-2026-001', batch: 'PRSJ-2026-001-0002', type: 'Deviation', status: 'Pending Approval', severity: 'High', submitter: 'r.iyer' },
    { project: 'Almond Milk', projectId: 'PRSJ-2026-004', batch: 'PRSJ-2026-004-0007', type: 'Audit', status: 'In Progress', severity: 'Medium', submitter: 'a.sharma' },
  ]
  return base.map((n, i) => ({
    id: i + 1,
    note_id: `QN-${String(i + 1).padStart(4, '0')}`,
    project_name: n.project,
    project_id: n.projectId,
    batch_id: n.batch,
    note_type: n.type,
    status: n.status,
    severity: n.severity,
    submitter: n.submitter,
    created_at: new Date(Date.now() - i * 5 * 60 * 60 * 1000).toISOString(),
  }))
}

function toNoteId(id) {
  return `QN-${String(id).padStart(4, '0')}`
}

export default function QualityManagement() {
  const [notes, setNotes] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(true) // false once we fall back to seed data
  const [approving, setApproving] = useState(null)
  const [evidence, setEvidence] = useState({})
  const [dropzoneKey, setDropzoneKey] = useState(0) // bump to clear EvidenceDropzone after a save
  const [allowedEvidenceTypes, setAllowedEvidenceTypes] = useState([])
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [notesRes, summaryRes, itemsRes, assignsRes] = await Promise.all([
          listQualityNotes(),
          getQualitySummary(),
          getPWSItems().catch(() => ({ data: [] })),
          getPWSAssignments().catch(() => ({ data: [] }))
        ])
        if (cancelled) return
        setNotes(notesRes.data.map((n) => ({ ...n, note_id: toNoteId(n.id) })))
        setSummary(summaryRes.data)
        setPwsItems(itemsRes.data || [])
        setPwsAssignments(assignsRes.data || [])
        setLive(true)
      } catch (err) {
        console.warn('Quality API not reachable yet, showing sample data', err)
        if (cancelled) return
        setNotes(seedNotes())
        setLive(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const projectOptions = useMemo(() => [...new Set(notes.map((n) => n.project_name))], [notes])
  const pendingApprovals = useMemo(() => notes.filter((n) => n.status === 'Pending Approval'), [notes])

  const handleSave = async (formNote) => {
    let created
    try {
      const { data } = await createQualityNote(formNote)
      created = { ...data, note_id: toNoteId(data.id) }
      setLive(true)
    } catch (err) {
      console.warn('POST /api/quality/notes failed, adding locally', err)
      created = {
        id: Date.now(),
        note_id: `QN-${notes.length + 1}`.padStart(4, '0'),
        ...formNote,
        submitter: 'you',
        created_at: new Date().toISOString(),
      }
      setLive(false)
    }

    setNotes((prev) => [created, ...prev])

    // Ship any queued evidence for this note, then clear the dropzone.
    const hasEvidence = Object.values(evidence).some((files) => files?.length)
    if (hasEvidence && created?.id) {
      try {
        await uploadQualityEvidence(created.id, evidence)
        const { data: freshSummary } = await getQualitySummary()
        setSummary(freshSummary)
      } catch (err) {
        console.warn('Evidence upload failed (note was still saved)', err)
      }
    }
    setEvidence({})
    setDropzoneKey((k) => k + 1)
  }

  const handleApprove = async (row) => {
    setApproving(row.id)
    try {
      await approveQualityNote(row.id)
    } catch (err) {
      console.warn('PUT /api/quality/notes/:id/approve not available yet, updating locally', err)
    } finally {
      setNotes((prev) => prev.map((n) => (n.id === row.id ? { ...n, status: 'Resolved' } : n)))
      setApproving(null)
    }
  }

  const recentColumns = [
    { key: 'note_id', label: 'Note ID' },
    { key: 'project_id', label: 'Project ID', render: (r) => <span className="font-mono text-xs">{r.project_id || '—'}</span> },
    { key: 'created_at', label: 'Date & Time', render: (r) => format(new Date(r.created_at), 'MMM d, yyyy · h:mm a') },
    { key: 'note_type', label: 'Note Type' },
    { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} styles={STATUS_STYLE} /> },
    { key: 'submitter', label: 'Submitter' },
  ]

  const approvalColumns = [
    { key: 'note_id', label: 'Note ID' },
    { key: 'batch_id', label: 'Batch ID' },
    { key: 'note_type', label: 'Note Type' },
    { key: 'severity', label: 'Severity', render: (r) => <Pill value={r.severity} styles={SEVERITY_STYLE} /> },
    { key: 'submitter', label: 'Submitter' },
    {
      key: 'action', label: '', sortable: false, render: (r) => (
        <button
          onClick={() => handleApprove(r)}
          disabled={approving === r.id}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          <CheckCircle2 size={14} /> Approve
        </button>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-primary-600" />
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Quality Management</h1>
        {!loading && !live && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-full px-2.5 py-1">
            <WifiOff size={11} /> Showing sample data — API not reachable
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Log inspection notes, attach evidence, and track approvals across every batch.
      </p>

      <div className="mb-8">
        <EvidenceSummaryCards metrics={summary} loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
        <div className="xl:col-span-2">
          <QualityNoteForm onSave={handleSave} projectOptions={projectOptions} pwsItems={pwsItems} pwsAssignments={pwsAssignments} onAllowedTypesChange={setAllowedEvidenceTypes} />
        </div>
        <div className="xl:col-span-3">
          <EvidenceDropzone key={dropzoneKey} onChange={setEvidence} allowedTypes={allowedEvidenceTypes} />
        </div>
      </div>

      <div className="space-y-6">
        <QualityNotesTable
          title="Recent Quality Notes"
          icon={ListChecks}
          rows={notes}
          columns={recentColumns}
          searchKeys={['note_id', 'note_type', 'submitter', 'batch_id', 'project_name', 'project_id']}
          statusOptions={NOTE_STATUSES}
          emptyMessage="No quality notes logged yet."
        />
        <QualityNotesTable
          title="Approvals Queue"
          icon={Hourglass}
          rows={pendingApprovals}
          columns={approvalColumns}
          searchKeys={['note_id', 'batch_id', 'submitter']}
          statusOptions={SEVERITIES}
          statusKey="severity"
          emptyMessage="Nothing awaiting manager sign-off."
        />
      </div>
    </div>
  )
}