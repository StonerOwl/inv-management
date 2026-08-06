import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Barcode from 'react-barcode'
import { Printer, X, Copy, Check } from 'lucide-react'

/**
 * ClickableBarcode
 *
 * Drop-in replacement for <Barcode>.  Renders the barcode inline at whatever
 * size the caller requests, but wraps it in a clickable container.  Clicking
 * opens a full-screen modal showing the barcode at a larger size with a label
 * and a "Print" button that opens a clean print window.
 *
 * Props forwarded to react-barcode: value, format, height, width, fontSize, margin, background
 * Extra props:
 *   label  – optional human-readable label shown above the barcode in the modal (e.g. "Project ID")
 */
export default function ClickableBarcode({
  value,
  format = 'CODE128',
  height = 48,
  width = 1.2,
  fontSize = 9,
  margin = 2,
  background,
  label,
  ...rest
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const modalRef = useRef(null)
  const printRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Close on click-outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setOpen(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(`
      <html>
        <head>
          <title>${label ? label + ': ' : ''}${value}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              height: 100vh; font-family: system-ui, -apple-system, sans-serif;
            }
            .label {
              font-size: 16px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.08em; color: #000; margin-bottom: 16px;
            }
            .value {
              font-family: monospace; font-size: 16px; font-weight: 800;
              color: #000; margin-top: 12px;
            }
            svg { max-width: 100%; height: auto; }
            @media print {
               @page { margin: 0; }
               body { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${label ? `<div class="label">${label}</div>` : ''}
          ${content}
          <div class="value">${value}</div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 100);
            };
          </script>
        </body>
      </html>
    `)
    doc.close()

    // Clean up iframe after print dialog is closed or after a delay
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 10000)
  }

  return (
    <>
      {/* Inline barcode – clickable */}
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className="cursor-pointer relative group/bc flex justify-center w-full max-w-full overflow-hidden [&>svg]:max-w-full [&>svg]:object-contain"
        title="Click to enlarge & print"
      >
        <Barcode
          value={value}
          format={format}
          height={height}
          width={width}
          fontSize={fontSize}
          margin={margin}
          background={background}
          {...rest}
        />
        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-primary-600/0 group-hover/bc:bg-primary-600/5 rounded transition-colors duration-200 pointer-events-none flex items-center justify-center">
          <span className="opacity-0 group-hover/bc:opacity-100 transition-opacity duration-200 bg-gray-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider pointer-events-none">
            Click to print
          </span>
        </div>
      </div>

      {/* Modal */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          style={{ animation: 'bc-modal-fade-in 0.15s ease-out' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden"
            style={{ animation: 'bc-modal-scale-in 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  {label || 'Barcode'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono font-bold">
                  {value}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barcode display */}
            <div className="px-6 py-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50">
              <div ref={printRef} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-200">
                <Barcode
                  value={value}
                  format={format}
                  height={90}
                  width={2.2}
                  fontSize={14}
                  margin={8}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Printer size={16} />
                Print Barcode
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Keyframe animations (injected once) */}
      <style>{`
        @keyframes bc-modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bc-modal-scale-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
