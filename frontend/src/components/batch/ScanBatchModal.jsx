import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, ScanLine, CameraOff, KeyboardIcon } from 'lucide-react'

const SCAN_REGION_ID = 'batch-scan-region'

// Supports the QR payload written by BatchIdentityCard plus common 1D
// batch/barcode formats, so the same button reads either code type.
const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
]

/**
 * onDetected(rawValue) fires once per successful scan or manual submission.
 * Camera access requires HTTPS (or localhost) -- browsers block getUserMedia
 * on plain HTTP, so this always keeps a manual-entry fallback available.
 */
export default function ScanBatchModal({ open, onClose, onDetected }) {
  const scannerRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const [manualValue, setManualValue] = useState('')
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCameraError(null)
    setStarting(true)

    const scanner = new Html5Qrcode(SCAN_REGION_ID, { formatsToSupport: FORMATS, verbose: false })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          onDetected?.(decodedText)
          onClose?.()
        },
        () => { /* per-frame "not found" noise -- ignore */ }
      )
      .then(() => { if (!cancelled) setStarting(false) })
      .catch((err) => {
        if (!cancelled) {
          setCameraError('Camera unavailable or permission denied. Use manual entry below.')
          setStarting(false)
        }
        console.error(err)
      })

    return () => {
      cancelled = true
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualValue.trim()) return
    onDetected?.(manualValue.trim())
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 border-2 border-primary-600 rounded-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ScanLine size={17} className="text-primary-600" />
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">Scan Batch Code</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div id={SCAN_REGION_ID} className="w-full rounded-lg overflow-hidden bg-black min-h-[240px] flex items-center justify-center">
            {starting && <span className="text-xs text-gray-400">Starting camera…</span>}
          </div>

          {cameraError && (
            <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2.5">
              <CameraOff size={14} className="shrink-0 mt-0.5" />
              {cameraError}
            </div>
          )}

          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              <KeyboardIcon size={12} /> Or enter manually
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                autoFocus={!!cameraError}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="PRSJ-2026-001-0001"
                className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary-600"
              />
              <button type="submit" className="btn-brutal-dark text-sm px-4">Use</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
