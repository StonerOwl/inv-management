import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Image, ScanEye, Thermometer, Zap, ScanLine, Waves,
  FileSpreadsheet, BadgeCheck, RefreshCw, Settings2, ChevronDown, ChevronRight,
  Loader2, File as FileIcon,
} from 'lucide-react';
import { getPWSItems, getPWSAssignments, listQualityNotes } from '../../api/client';
import api from '../../api/client';

const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-600 transition-colors rounded-lg';

// ─── Evidence type config (mirrors WorkflowTimeline) ──────────────────────────
const IMAGE_TYPES = [
  { key: 'visual_image',       label: 'Visual Image',        Icon: Image,           color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-900/30' },
  { key: 'nir_image',          label: 'NIR Image',           Icon: ScanEye,         color: 'text-violet-500',   bg: 'bg-violet-50 dark:bg-violet-900/30' },
  { key: 'thermal_image',      label: 'Thermal Image',       Icon: Thermometer,     color: 'text-orange-500',   bg: 'bg-orange-50 dark:bg-orange-900/30' },
  { key: 'xray_image',         label: 'X-Ray Image',         Icon: Zap,             color: 'text-yellow-500',   bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
  { key: 'spectral_image',     label: 'Spectral Image',      Icon: ScanLine,        color: 'text-cyan-500',     bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
  { key: 'ultrasonic_image',   label: 'Ultrasonic Image',    Icon: Waves,           color: 'text-teal-500',     bg: 'bg-teal-50 dark:bg-teal-900/30' },
  { key: 'qa_report',          label: 'QA Report',           Icon: FileSpreadsheet, color: 'text-emerald-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { key: 'manual_verification',label: 'Manual Verification', Icon: BadgeCheck,      color: 'text-blue-500',     bg: 'bg-blue-50 dark:bg-blue-900/30' },
];

function getImageTypeConfig(key) {
  return IMAGE_TYPES.find(t => t.key === key) || { label: key || 'File', Icon: FileIcon, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
}

function isImageFile(att) {
  const ft = (att.file_type || '').toLowerCase();
  const fn = (att.file_name || '').toLowerCase();
  return ft.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|tiff)$/.test(fn);
}

function isPDF(att) {
  const ft = (att.file_type || '').toLowerCase();
  const fn = (att.file_name || '').toLowerCase();
  return ft === 'application/pdf' || fn.endsWith('.pdf');
}

// ─── Components ──────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function AttachmentCard({ attachment }) {
  const { label, Icon, color, bg } = getImageTypeConfig(attachment.evidence_type);
  const name = attachment.file_name || 'Unnamed file';
  const [preview, setPreview] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canPreview = isImageFile(attachment) || isPDF(attachment);

  const loadFile = async () => {
    if (blobUrl) return blobUrl;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/quality/attachments/${attachment.id}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setBlobUrl(url);
      return url;
    } catch (e) {
      setError('Could not load file.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    const url = await loadFile();
    if (url) window.open(url, '_blank');
  };

  const handlePreview = async () => {
    if (!preview) await loadFile();
    setPreview(v => !v);
  };

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${bg}`}>
      {/* Preview area */}
      {canPreview && blobUrl && preview ? (
        <div className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-2 min-h-[160px]">
          {isImageFile(attachment)
            ? <img src={blobUrl} alt={name} className="max-h-48 max-w-full rounded object-contain" />
            : <iframe src={blobUrl} title={name} className="w-full h-48 rounded border-0" />
          }
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 bg-white/50 dark:bg-gray-900/50">
          <Icon size={36} className={color} />
        </div>
      )}

      {/* Info row */}
      <div className="px-3.5 py-3 bg-white dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mb-0.5" title={name}>{name}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">{label}</p>
        {error && <p className="text-[10px] text-red-500 mb-1">{error}</p>}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpen}
            disabled={loading}
            className="text-[10px] font-bold text-primary-600 dark:text-primary-400 px-2 py-1 rounded border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : 'Open ↗'}
          </button>
          {canPreview && (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {preview ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteSection({ note }) {
  const [open, setOpen] = useState(true);
  const attachments = note.attachments || [];
  if (attachments.length === 0) return null;

  return (
    <div className="mb-4">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 text-left w-full mb-2">
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {note.note_type} — {note.severity}
        </span>
        <span className="text-[10px] text-gray-400 ml-auto">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</span>
      </button>
      {note.observation && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 ml-5 mb-2 line-clamp-2">{note.observation}</p>
      )}
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-5">
          {attachments.map(att => (
            <AttachmentCard key={att.id} attachment={att} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProductQualityPage() {
  const [loading, setLoading] = useState(true);
  const [pwsItems, setPwsItems] = useState([]);
  const [pwsAssignments, setPwsAssignments] = useState([]);

  const [selections, setSelections] = useState({
    projectId: '',
    workflowId: '',
    stageId: '',
    processId: '',
  });

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // ── Load PWS data ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [itemsRes, assignsRes] = await Promise.all([
          getPWSItems().catch(() => ({ data: [] })),
          getPWSAssignments().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setPwsItems(itemsRes.data || []);
        setPwsAssignments(assignsRes.data || []);
      } catch (err) {
        console.warn('Failed to fetch PWS data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Derived cascading options ──
  const projects = useMemo(() => pwsItems.filter(p => p.type === 'project'), [pwsItems]);

  const availableWorkflows = useMemo(() => {
    const childIds = pwsAssignments.filter(a => a.parent_id === selections.projectId).map(a => a.child_id);
    return pwsItems.filter(p => p.type === 'workflow' && childIds.includes(p.id));
  }, [pwsItems, pwsAssignments, selections.projectId]);

  const availableStages = useMemo(() => {
    const childIds = pwsAssignments.filter(a => a.parent_id === selections.workflowId).map(a => a.child_id);
    return pwsItems.filter(p => p.type === 'stage' && childIds.includes(p.id));
  }, [pwsItems, pwsAssignments, selections.workflowId]);

  const availableProcesses = useMemo(() => {
    const childIds = pwsAssignments.filter(a => a.parent_id === selections.stageId).map(a => a.child_id);
    return pwsItems.filter(p => p.type === 'process' && childIds.includes(p.id));
  }, [pwsItems, pwsAssignments, selections.stageId]);

  const handleSelect = (field, value) => {
    setSelections(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'projectId') { next.workflowId = ''; next.stageId = ''; next.processId = ''; }
      if (field === 'workflowId') { next.stageId = ''; next.processId = ''; }
      if (field === 'stageId') { next.processId = ''; }
      return next;
    });
  };

  // ── Fetch quality notes when process is selected ──
  useEffect(() => {
    if (!selections.processId || !selections.projectId) {
      setNotes([]);
      return;
    }
    const selectedProcess = availableProcesses.find(p => p.id === selections.processId);
    const selectedStage = availableStages.find(s => s.id === selections.stageId);
    if (!selectedProcess) return;

    let cancelled = false;
    setNotesLoading(true);
    listQualityNotes({
      project_id: selections.projectId,
      workflow_stage: selectedStage?.name || undefined,
      process: selectedProcess.name,
    })
      .then(res => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setNotes(data);
      })
      .catch(err => {
        console.warn('Failed to fetch quality notes', err);
        if (!cancelled) setNotes([]);
      })
      .finally(() => { if (!cancelled) setNotesLoading(false); });

    return () => { cancelled = true; };
  }, [selections.processId, selections.projectId, selections.stageId, availableProcesses, availableStages]);

  // ── Stats ──
  const allAttachments = useMemo(() =>
    notes.flatMap(n => (n.attachments || []).map(a => ({ ...a, note_id: n.id }))),
    [notes]
  );
  const totalFiles = allAttachments.length;

  // ── Group by evidence type for summary badges ──
  const typeCounts = useMemo(() => {
    const counts = {};
    allAttachments.forEach(a => {
      const key = a.evidence_type || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allAttachments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedProcessName = availableProcesses.find(p => p.id === selections.processId)?.name;
  const selectedStageName = availableStages.find(s => s.id === selections.stageId)?.name;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-primary-600" />
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Product Quality</h1>
        <button onClick={() => window.location.reload()} className="ml-auto flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">
          <RefreshCw size={16} /> Reload
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Select a Project → Workflow → Stage → Process to view all attached evidence and images.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* LEFT PANEL: Cascading selectors */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm self-start sticky top-4">
          <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Settings2 size={18} className="text-primary-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Select Process</h2>
          </div>
          <div className="space-y-4">
            <Field label="1. Project">
              <select className={inputCls} value={selections.projectId} onChange={e => handleSelect('projectId', e.target.value)}>
                <option value="">-- Choose Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.project_code || p.id.substring(0, 8)})</option>
                ))}
              </select>
            </Field>
            <Field label="2. Workflow">
              <select className={inputCls} value={selections.workflowId} onChange={e => handleSelect('workflowId', e.target.value)} disabled={!selections.projectId}>
                <option value="">-- Choose Workflow --</option>
                {availableWorkflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </Field>
            <Field label="3. Stage">
              <select className={inputCls} value={selections.stageId} onChange={e => handleSelect('stageId', e.target.value)} disabled={!selections.workflowId}>
                <option value="">-- Choose Stage --</option>
                {availableStages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="4. Process">
              <select className={inputCls} value={selections.processId} onChange={e => handleSelect('processId', e.target.value)} disabled={!selections.stageId}>
                <option value="">-- Choose Process --</option>
                {availableProcesses.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Type summary badges */}
          {totalFiles > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Evidence Summary</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(typeCounts).map(([key, count]) => {
                  const cfg = getImageTypeConfig(key);
                  const CfgIcon = cfg.Icon;
                  return (
                    <span key={key} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 ${cfg.bg} ${cfg.color}`}>
                      <CfgIcon size={11} /> {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Attachments & notes */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {selectedProcessName ? `Attachments — ${selectedProcessName}` : 'Attachments'}
            </h2>
            {totalFiles > 0 && (
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {notes.length} note{notes.length !== 1 ? 's' : ''} · {totalFiles} file{totalFiles !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!selections.processId ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Image size={28} className="text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">No process selected</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Select a process from the left panel to view its evidence and attachments.</p>
            </div>
          ) : notesLoading ? (
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={28} className="text-primary-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading attachments…</p>
            </div>
          ) : notes.length === 0 ? (
            /* No notes state */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <FileIcon size={28} className="text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">No evidence found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No quality notes or attachments exist for{' '}
                <strong>{selectedStageName}</strong> → <strong>{selectedProcessName}</strong>.
              </p>
            </div>
          ) : (
            /* Notes with attachments */
            <div>
              {notes.map(note => (
                <NoteSection key={note.id} note={note} />
              ))}
              {/* If some notes have no attachments, show inline message */}
              {allAttachments.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quality notes exist but have no attached files.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
