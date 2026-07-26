import React, { useState, useEffect } from 'react'
import { ShieldCheck, Plus, Trash2, Settings2, Save } from 'lucide-react'
import { getPWSItems, getPWSAssignments } from '../../api/client'

const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-600 transition-colors rounded-lg'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </span>
      {children}
    </label>
  )
}

export default function QualityParametersPage() {
  const [loading, setLoading] = useState(true)
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])

  const [selections, setSelections] = useState({
    projectId: '',
    workflowId: '',
    stageId: '',
    processId: ''
  })

  const [parameters, setParameters] = useState([
    { id: Date.now(), name: '', value: '', type: 'text' }
  ])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [itemsRes, assignsRes] = await Promise.all([
          getPWSItems().catch(() => ({ data: [] })),
          getPWSAssignments().catch(() => ({ data: [] }))
        ])
        if (cancelled) return
        setPwsItems(itemsRes.data || [])
        setPwsAssignments(assignsRes.data || [])
      } catch (err) {
        console.warn('Failed to fetch PWS data', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Derived options
  const projects = pwsItems.filter(p => p.type === 'project')
  
  const projectWorkflowIds = pwsAssignments.filter(a => a.parent_id === selections.projectId).map(a => a.child_id)
  const availableWorkflows = pwsItems.filter(p => p.type === 'workflow' && projectWorkflowIds.includes(p.id))

  const stageIds = pwsAssignments.filter(a => a.parent_id === selections.workflowId).map(a => a.child_id)
  const availableStages = pwsItems.filter(p => p.type === 'stage' && stageIds.includes(p.id))

  const processIds = pwsAssignments.filter(a => a.parent_id === selections.stageId).map(a => a.child_id)
  const availableProcesses = pwsItems.filter(p => p.type === 'process' && processIds.includes(p.id))

  const parameterId = selections.processId ? `PARAM-${selections.processId.substring(0, 8).toUpperCase()}` : ''

  const handleSelect = (field, value) => {
    setSelections(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'projectId') { next.workflowId = ''; next.stageId = ''; next.processId = ''; }
      if (field === 'workflowId') { next.stageId = ''; next.processId = ''; }
      if (field === 'stageId') { next.processId = ''; }
      return next
    })
  }

  const addParameter = () => {
    setParameters(prev => [...prev, { id: Date.now(), name: '', value: '', type: 'text' }])
  }

  const removeParameter = (id) => {
    setParameters(prev => prev.filter(p => p.id !== id))
  }

  const updateParameter = (id, field, val) => {
    setParameters(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-primary-600" />
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Quality Management</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Define and manage quality parameters and standard thresholds across processes.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* LEFT BOX: PWS Selection */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg">
              <Settings2 size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quality Parameter Settings</h2>
          </div>

          <div className="space-y-5">
            <Field label="1. Select Project">
              <select className={inputCls} value={selections.projectId} onChange={e => handleSelect('projectId', e.target.value)}>
                <option value="">-- Choose Project --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.project_code || p.id.substring(0,8)})</option>)}
              </select>
            </Field>

            <Field label="2. Select Workflow">
              <select className={inputCls} value={selections.workflowId} onChange={e => handleSelect('workflowId', e.target.value)} disabled={!selections.projectId}>
                <option value="">-- Choose Workflow --</option>
                {availableWorkflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>

            <Field label="3. Select Stage">
              <select className={inputCls} value={selections.stageId} onChange={e => handleSelect('stageId', e.target.value)} disabled={!selections.workflowId}>
                <option value="">-- Choose Stage --</option>
                {availableStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>

            <Field label="4. Select Process">
              <select className={inputCls} value={selections.processId} onChange={e => handleSelect('processId', e.target.value)} disabled={!selections.stageId}>
                <option value="">-- Choose Process --</option>
                {availableProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            {parameterId && (
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">Generated Parameter ID</div>
                  <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{parameterId}</div>
                </div>
                <ShieldCheck className="text-emerald-500 opacity-50" size={32} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT BOX: Dynamic Parameters List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Defined Parameters</h2>
            <button 
              onClick={addParameter}
              className="flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus size={16} /> Add Parameter
            </button>
          </div>

          {!selections.processId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <Settings2 size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Select a Process to manage parameters</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {parameters.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 italic">No parameters added yet.</div>
              ) : (
                parameters.map((param, index) => (
                  <div key={param.id} className="group relative bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeParameter(param.id)} className="text-red-500 hover:text-red-600 p-1 bg-red-50 dark:bg-red-900/20 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-3">Parameter {index + 1}</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Parameter Name">
                        <input 
                          type="text" 
                          placeholder="e.g. Max Temperature" 
                          className={inputCls} 
                          value={param.name}
                          onChange={e => updateParameter(param.id, 'name', e.target.value)}
                        />
                      </Field>
                      <Field 
                        label={
                          <div className="flex items-center justify-between w-full">
                            <span>Condition / Value</span>
                            <select 
                              className="text-[10px] bg-transparent border-none text-primary-600 font-bold uppercase cursor-pointer outline-none"
                              value={param.type || 'text'}
                              onChange={e => {
                                updateParameter(param.id, 'type', e.target.value);
                                updateParameter(param.id, 'value', ''); // Reset value on type change
                              }}
                            >
                              <option value="text">Text / Number</option>
                              <option value="file">File Upload</option>
                            </select>
                          </div>
                        }
                      >
                        {(param.type === 'file') ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              className="block w-full text-sm text-gray-500 dark:text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary-50 file:text-primary-700
                                hover:file:bg-primary-100
                                dark:file:bg-primary-900/30 dark:file:text-primary-400"
                              onChange={e => updateParameter(param.id, 'value', e.target.files[0])}
                            />
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="e.g. <= 50°C" 
                            className={inputCls} 
                            value={param.value}
                            onChange={e => updateParameter(param.id, 'value', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selections.processId && parameters.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button className="w-full aiq-btn-primary flex justify-center items-center gap-2 py-3">
                <Save size={16} /> Save Parameters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
