import { useEffect, useState } from 'react'
import { Boxes, ScanLine, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

import BatchIdentityCard from '../components/batch/BatchIdentityCard'
import ScanBatchModal from '../components/batch/ScanBatchModal'

/**
 * ⚠️ TEMPORARY LOCAL TEST HARNESS -- not part of the real app.
 *
 * There is no Project/Batch table in the backend yet (that's a teammate's
 * module, per the UI deck: "Project CRUD... Manage Projects"). Building one
 * here would create a second, competing Project concept that collides with
 * theirs later. So instead, batches created on this page live ONLY in this
 * browser's localStorage -- good enough to prove the QR/barcode generation
 * and the scan-and-look-up flow both genuinely work end-to-end, without
 * touching the backend or shared nav at all.
 *
 * DELETE this file + its one route line in App.jsx once the real Projects
 * API exists, and pass real batch_id / project_id values into
 * <BatchIdentityCard /> instead.
 */

const STORAGE_KEY = 'aiq_demo_batches_v1'

function loadBatches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveBatches(batches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches))
}

function nextIds(existingCount) {
  const year = new Date().getFullYear()
  const seq = String(existingCount + 1).padStart(3, '0')
  return {
    projectId: `PRSJ-${year}-${seq}-B${seq}`,
    batchId: `PBSJ-${year}-${seq}`,
  }
}

export default function BatchIdentityDemo() {
  const [batches, setBatches] = useState([])
  const [projectName, setProjectName] = useState('')
  const [product, setProduct] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  useEffect(() => { setBatches(loadBatches()) }, [])

  const handleGenerate = (e) => {
    e.preventDefault()
    if (!projectName.trim()) return
    const { projectId, batchId } = nextIds(batches.length)
    const next = [
      { id: crypto.randomUUID(), projectName: projectName.trim(), product: product.trim() || projectName.trim(), projectId, batchId, createdAt: new Date().toISOString() },
      ...batches,
    ]
    setBatches(next)
    saveBatches(next)
    setProjectName('')
    setProduct('')
  }

  const handleDelete = (id) => {
    const next = batches.filter((b) => b.id !== id)
    setBatches(next)
    saveBatches(next)
  }

  const handleDetected = (raw) => {
    // QR payloads are JSON ({type, project_id, batch_id, project}); barcodes
    // just encode the batch_id string directly. Handle both.
    let candidateBatchId = raw
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.batch_id) candidateBatchId = parsed.batch_id
    } catch {
      // not JSON -- treat raw as the batch_id itself (barcode case)
    }
    const match = batches.find((b) => b.batchId === candidateBatchId || b.projectId === candidateBatchId)
    setScanResult({ raw: candidateBatchId, match })
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-start gap-2.5 mb-6 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-4 py-3">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <span>
          Test harness only. Batches created here are stored in <strong>this browser's localStorage</strong>, not the
          database -- use it to prove QR/barcode generation and scanning work, not as real project data.
        </span>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Boxes size={22} className="text-primary-600" />
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Batch QR/Barcode Test Harness</h1>
        </div>
        <button onClick={() => setScanOpen(true)} className="btn-brutal-dark flex items-center gap-2">
          <ScanLine size={16} /> Scan Barcode / Batch
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Generate a fake batch, print/scan its code, and confirm the round trip actually resolves.
      </p>

      {scanResult && (
        <div className={`mb-6 flex items-center gap-2.5 text-sm font-semibold px-4 py-3 rounded-lg border ${
          scanResult.match
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40'
        }`}>
          {scanResult.match ? <CheckCircle2 size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />}
          Scanned <span className="font-mono">{scanResult.raw}</span>
          {scanResult.match ? ` — matched "${scanResult.match.projectName}"` : ' — no matching batch in this browser\'s test data'}
        </div>
      )}

      <form onSubmit={handleGenerate} className="card-brutal-dark p-5 mb-8 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Project Name</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Coconut Oil"
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary-600"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Product (optional)</label>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Defaults to project name"
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary-600"
          />
        </div>
        <button type="submit" className="btn-brutal-dark flex items-center gap-2">
          <Plus size={15} /> Generate Batch
        </button>
      </form>

      {batches.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No test batches yet — generate one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {batches.map((b) => (
            <div key={b.id} className="relative">
              <button
                onClick={() => handleDelete(b.id)}
                title="Delete test batch"
                className="absolute -top-2 -right-2 z-10 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-400 hover:text-red-500 shadow-sm"
              >
                <Trash2 size={12} />
              </button>
              <BatchIdentityCard projectName={b.projectName} projectId={b.projectId} batchId={b.batchId} product={b.product} />
            </div>
          ))}
        </div>
      )}

      <ScanBatchModal open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleDetected} />
    </div>
  )
}
