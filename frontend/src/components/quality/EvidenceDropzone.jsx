import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X, Image, Thermometer, ScanEye, FileSpreadsheet, BadgeCheck, FileText, FileType2, File as FileGeneric } from 'lucide-react'
import clsx from 'clsx'

// Per-file icon so a mixed category (e.g. "QA Device Report", which accepts
// PDF/DOCX/XLS) still shows what each attached file actually is at a glance.
function fileTypeIcon(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { Icon: FileText, cls: 'text-red-500' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, cls: 'text-emerald-600' }
  if (['doc', 'docx'].includes(ext)) return { Icon: FileType2, cls: 'text-blue-600' }
  if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp'].includes(ext)) return { Icon: Image, cls: 'text-primary-600' }
  return { Icon: FileGeneric, cls: 'text-gray-400' }
}

// Each category maps to its own dropzone so uploads are visually categorized
// as soon as they land, per the Evidence & Attachments requirement.
const CATEGORIES = [
  { key: 'visual_image', label: 'Visual Image', icon: Image, accept: { 'image/*': [] }, hint: 'JPG, PNG, WEBP' },
  { key: 'nir_image', label: 'NIR Image', icon: ScanEye, accept: { 'image/*': [] }, hint: 'JPG, PNG, TIFF' },
  { key: 'thermal_image', label: 'Thermal Image', icon: Thermometer, accept: { 'image/*': [] }, hint: 'JPG, PNG, TIFF' },
  {
    key: 'qa_report',
    label: 'QA Device Report',
    icon: FileSpreadsheet,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    hint: 'PDF, DOCX, XLS',
  },
  { key: 'manual_verification', label: 'Manual Verification', icon: BadgeCheck, accept: { 'application/pdf': ['.pdf'], 'image/*': [] }, hint: 'PDF or photo' },
]

function CategoryDropzone({ category, files, onAdd, onRemove }) {
  const onDrop = useCallback((accepted) => onAdd(category.key, accepted), [category.key, onAdd])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: category.accept, multiple: true })
  const Icon = category.icon

  return (
    <div className="card-brutal-dark p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-primary-600" />
        <span className="text-xs font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">{category.label}</span>
        {files.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
            {files.length}
          </span>
        )}
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'flex-1 border-2 border-dashed rounded-lg px-3 py-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud size={20} className="text-gray-400 mb-1.5" />
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {isDragActive ? 'Drop to add' : 'Drag & drop or click'}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{category.hint}</p>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {files.map((file, idx) => {
            const { Icon: FileIcon, cls } = fileTypeIcon(file.name)
            return (
              <li key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded px-2 py-1.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <FileIcon size={12} className={clsx('shrink-0', cls)} />
                  <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(category.key, idx)}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                >
                  <X size={12} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Uncontrolled by default -- keeps its own { category: File[] } state and calls
 * onChange(evidenceByCategory) whenever it changes, so the parent can attach
 * these to the note payload (e.g. as multipart FormData, same pattern as
 * api/client.js `createNote`).
 */
export default function EvidenceDropzone({ onChange }) {
  const [evidence, setEvidence] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.key, []]))
  )

  const emit = (next) => {
    setEvidence(next)
    onChange?.(next)
  }

  const handleAdd = (key, accepted) => {
    const next = { ...evidence, [key]: [...evidence[key], ...accepted] }
    emit(next)
  }

  const handleRemove = (key, idx) => {
    const next = { ...evidence, [key]: evidence[key].filter((_, i) => i !== idx) }
    emit(next)
  }

  return (
    <div className="card-brutal-dark p-6">
      <div className="flex items-center gap-2 mb-5">
        <UploadCloud size={18} className="text-primary-600" />
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
          Evidence & Attachments
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryDropzone
            key={category.key}
            category={category}
            files={evidence[category.key]}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  )
}
