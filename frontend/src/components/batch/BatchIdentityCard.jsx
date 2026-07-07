import { useRef } from 'react'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import { Printer, ScanLine } from 'lucide-react'

/**
 * "Project Batch Details" panel — drop this straight into the Projects
 * detail page (see AIQ_UI_Presentation_v1.pdf, "Projects Tab UI" screen).
 * It's self-contained: no routing, no shared-file edits required to use it.
 *
 * Usage inside the Project detail page:
 *   <BatchIdentityCard
 *     projectName={project.project_name}      // "Coconut Oil"
 *     projectId={project.project_id}          // "PRSJ-2026-001-B001"
 *     batchId={project.batch_id}               // "PBSJ-2026-001"
 *   />
 *
 * onScanNavigate is optional -- pass it if you want the printed QR's
 * "scan to view details" promise to actually go somewhere once a mobile
 * scan opens this same URL (e.g. via a query param); it's not required
 * for the card to render or print correctly.
 */
export default function BatchIdentityCard({
  projectName,
  projectId,
  batchId,
  product,
  showHeader = true,
}) {
  const printRef = useRef(null)

  const qrPayload = JSON.stringify({ type: 'batch', project_id: projectId, batch_id: batchId, project: projectName })

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=460,height=420')
    win.document.write(`
      <html>
        <head>
          <title>${batchId}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; }
            .print-grid { display: flex; gap: 32px; align-items: flex-start; }
            .print-col { text-align: center; }
            .print-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            .print-code { margin-top: 8px; font-family: monospace; font-size: 12px; font-weight: 700; }
          </style>
        </head>
        <body>${content}<script>window.onload = () => { window.print(); window.close(); }</script></body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="card-brutal-dark p-5">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
            Project Batch Details
          </h3>
          <button
            onClick={handlePrint}
            title="Print batch label"
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Printer size={15} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-6">
        {/* ID fields */}
        <div className="space-y-3">
          {projectName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Project Name</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{projectName}</p>
            </div>
          )}
          {product && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Product</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{product}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Project ID</p>
            <p className="font-mono text-sm font-bold text-primary-600">{projectId}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Batch ID</p>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{batchId}</p>
          </div>
        </div>

        {/* QR + Barcode, printable region */}
        <div ref={printRef} className="print-grid flex gap-6">
          <div className="print-col flex flex-col items-center bg-white rounded-lg p-3">
            <p className="print-label text-[10px] font-bold uppercase tracking-wide text-gray-500">
              QR Code (Project Batch)
            </p>
            <QRCode value={qrPayload} size={92} />
            <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-gray-500">
              <ScanLine size={10} /> Scan to view details
            </p>
          </div>

          <div className="print-col flex flex-col items-center bg-white rounded-lg p-3">
            <p className="print-label text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Barcode (Batch ID)
            </p>
            <Barcode value={batchId} format="CODE128" height={44} width={1.5} fontSize={0} margin={4} displayValue={false} />
            <p className="print-code mt-2 font-mono text-xs font-bold text-gray-900">{batchId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
