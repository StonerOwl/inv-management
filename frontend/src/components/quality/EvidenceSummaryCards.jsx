import { Images, FileCheck2, ClipboardCheck, FolderOpen } from 'lucide-react'
import clsx from 'clsx'

// Swap `metrics` for a live payload from GET /api/quality/summary once the
// backend endpoint (see api/routes/quality.py) is wired into api/client.js.
const DEFAULT_METRICS = {
  total_evidence_files: 128,
  qa_reports: 34,
  manual_verifications: 19,
  note_files: 75,
}

const CARDS = [
  { key: 'total_evidence_files', label: 'Total Evidence Files', icon: FolderOpen, accent: 'text-primary-600' },
  { key: 'qa_reports', label: 'QA Device Reports', icon: FileCheck2, accent: 'text-cyan-500' },
  { key: 'manual_verifications', label: 'Manual Verifications', icon: ClipboardCheck, accent: 'text-emerald-500' },
  { key: 'note_files', label: 'Note Files (Image/NIR/Thermal)', icon: Images, accent: 'text-amber-500' },
]

export default function EvidenceSummaryCards({ metrics = DEFAULT_METRICS, loading = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon: Icon, accent }) => (
        <div
          key={key}
          className="card-brutal-dark p-5 flex items-start gap-4"
        >
          <div className={clsx('w-11 h-11 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0', accent)}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              {label}
            </p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {loading ? '—' : (metrics?.[key] ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
