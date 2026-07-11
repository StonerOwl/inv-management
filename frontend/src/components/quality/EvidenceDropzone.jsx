import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  UploadCloud, X, Image, Thermometer, ScanEye, FileSpreadsheet, BadgeCheck,
  FileText, FileType2, File as FileGeneric, Zap, Waves, ScanLine,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'

function fileTypeIcon(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { Icon: FileText, cls: 'text-red-500' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, cls: 'text-emerald-600' }
  if (['doc', 'docx'].includes(ext)) return { Icon: FileType2, cls: 'text-blue-600' }
  if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp'].includes(ext)) return { Icon: Image, cls: 'text-primary-600' }
  return { Icon: FileGeneric, cls: 'text-gray-400' }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CATEGORIES = [
  {
    key: 'visual_image',
    label: 'Visual Image',
    icon: Image,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · WEBP',
    group: 'Images',
  },
  {
    key: 'nir_image',
    label: 'NIR Image',
    icon: ScanEye,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · TIFF',
    group: 'Images',
  },
  {
    key: 'thermal_image',
    label: 'Thermal Image',
    icon: Thermometer,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · TIFF',
    group: 'Images',
  },
  {
    key: 'xray_image',
    label: 'X-Ray Image',
    icon: Zap,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · TIFF · DICOM',
    group: 'Images',
  },
  {
    key: 'spectral_image',
    label: 'Spectral Image',
    icon: ScanLine,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · TIFF',
    group: 'Images',
  },
  {
    key: 'ultrasonic_image',
    label: 'Ultrasonic Image',
    icon: Waves,
    accept: { 'image/*': [] },
    hint: 'JPG · PNG · TIFF · BMP',
    group: 'Images',
  },
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
    hint: 'PDF · DOCX · XLS',
    group: 'Documents',
  },
  {
    key: 'manual_verification',
    label: 'Manual Verification',
    icon: BadgeCheck,
    accept: { 'application/pdf': ['.pdf'], 'image/*': [] },
    hint: 'PDF · Photo',
    group: 'Documents',
  },
]

// Compact row for each category in the list
function CategoryRow({ category, files, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  const onDrop = useCallback((accepted) => {
    onAdd(category.key, accepted)
    if (accepted.length > 0) setExpanded(true)
  }, [category.key, onAdd])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: category.accept,
    multiple: true,
    noClick: true,
  })

  const Icon = category.icon
  const hasFiles = files.length > 0

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'rounded-lg border transition-colors',
        isDragActive
          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : hasFiles
            ? 'border-primary-200 dark:border-primary-800/60 bg-white dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      <input {...getInputProps()} ref={inputRef} />

      {/* Row header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Expand toggle — only shown when there are files */}
        <button
          type="button"
          onClick={() => hasFiles && setExpanded(v => !v)}
          className={clsx('shrink-0 text-gray-400', hasFiles ? 'hover:text-gray-600 dark:hover:text-gray-300' : 'cursor-default opacity-0')}
          tabIndex={hasFiles ? 0 : -1}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Icon */}
        <Icon size={15} className={clsx('shrink-0', hasFiles ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500')} />

        {/* Label */}
        <span className={clsx('text-xs font-semibold flex-1 truncate', hasFiles ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>
          {category.label}
        </span>

        {/* Hint */}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block shrink-0">{category.hint}</span>

        {/* File count badge */}
        {hasFiles && (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60">
            {files.length}
          </span>
        )}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors',
            isDragActive
              ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
          )}
        >
          <UploadCloud size={11} />
          {isDragActive ? 'Drop' : 'Add'}
        </button>
      </div>

      {/* Expanded file list */}
      {expanded && hasFiles && (
        <ul className="border-t border-gray-100 dark:border-gray-700/60 mx-3 mb-2 pt-2 space-y-1">
          {files.map((file, idx) => {
            const { Icon: FileIcon, cls } = fileTypeIcon(file.name)
            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded px-2 py-1.5"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <FileIcon size={12} className={clsx('shrink-0', cls)} />
                  <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                </span>
                <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(category.key, idx)}
                  className="text-gray-400 hover:text-red-500 shrink-0 transition-colors"
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

// Map PWS image type labels → category keys in CATEGORIES
const IMAGE_TYPE_MAP = {
  'Visual': 'visual_image',
  'NIR': 'nir_image',
  'Thermal': 'thermal_image',
  'X-Ray': 'xray_image',
  'Spectral': 'spectral_image',
  'Ultrasonic': 'ultrasonic_image',
}

const GROUPS = ['Images', 'Documents']

export default function EvidenceDropzone({ onChange, allowedTypes = [] }) {
  const [evidence, setEvidence] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.key, []]))
  )

  // If allowedTypes has entries, restrict image rows to those keys.
  // Documents (qa_report, manual_verification) are always shown.
  const allowedImageKeys = allowedTypes.length > 0
    ? allowedTypes.map(t => IMAGE_TYPE_MAP[t]).filter(Boolean)
    : null // null = show all

  const isVisible = (cat) => {
    if (cat.group === 'Documents') return true
    if (allowedImageKeys === null) return true
    return allowedImageKeys.includes(cat.key)
  }

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

  const totalFiles = Object.values(evidence).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="card-brutal-dark p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <UploadCloud size={18} className="text-primary-600" />
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
          Evidence & Attachments
        </h3>
        {allowedTypes.length > 0 && (
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            {allowedTypes.join(' · ')} only
          </span>
        )}
        {totalFiles > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} queued
          </span>
        )}
      </div>

      {/* Category list, grouped */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto">
        {GROUPS.map(group => {
          const cats = CATEGORIES.filter(c => c.group === group && isVisible(c))
          if (cats.length === 0) return null
          return (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">
                {group}
              </p>
              <div className="flex flex-col gap-1.5">
                {cats.map(category => (
                  <CategoryRow
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
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500 text-center">
        Drag files onto any row, or click <strong>Add</strong> to browse. Files attach on Save.
      </p>
    </div>
  )
}