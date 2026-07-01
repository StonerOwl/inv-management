import { useState } from 'react'
import { ScanLine, Boxes, CheckCircle2 } from 'lucide-react'

import BatchIdentityCard from '../components/batch/BatchIdentityCard'
import ScanBatchModal from '../components/batch/ScanBatchModal'
import { parseBatchScan } from '../utils/batchScan'

// Swap for a real API call (e.g. GET /api/projects/batches) once the Projects
// module has a backend route -- this repo doesn't have one yet.
const MOCK_BATCHES = [
  { batch_id: 'PRSJ-2026-001-0001', project_name: 'Coconut Oil' },
  { batch_id: 'PRSJ-2026-001-0002', project_name: 'Coconut Oil' },
  { batch_id: 'PRSJ-2026-004-0007', project_name: 'Almond Milk' },
  { batch_id: 'PRSJ-2026-002-0011', project_name: 'Cold-Pressed Sesame' },
]

export default function ProjectBatches() {
  const [scanOpen, setScanOpen] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  const handleDetected = (raw) => {
    const { batchId } = parseBatchScan(raw)
    const match = MOCK_BATCHES.find((b) => b.batch_id === batchId)
    setLastScan({ value: batchId, match })
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Boxes size={22} className="text-primary-600" />
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Project Batches</h1>
        </div>
        <button
          onClick={() => setScanOpen(true)}
          className="btn-brutal-dark flex items-center gap-2"
        >
          <ScanLine size={16} />
          Scan Barcode / Batch
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Each batch gets a scannable barcode and QR code for fast lookup on the floor.
      </p>

      {lastScan && (
        <div className="mb-6 flex items-center gap-2.5 text-sm font-semibold px-4 py-3 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40">
          <CheckCircle2 size={16} className="shrink-0" />
          Scanned <span className="font-mono">{lastScan.value}</span>
          {lastScan.match ? ` — matched ${lastScan.match.project_name}` : ' — no matching batch found locally'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {MOCK_BATCHES.map((b) => (
          <BatchIdentityCard key={b.batch_id} batchId={b.batch_id} projectName={b.project_name} />
        ))}
      </div>

      <ScanBatchModal open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleDetected} />
    </div>
  )
}
