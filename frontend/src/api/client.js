import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadInvoices = (files, onProgress) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total)),
  })
}

export const getJobStatus = (jobId) => api.get(`/upload/job/${jobId}`)
export const listJobs = () => api.get('/upload/jobs')

// ── Invoices ──────────────────────────────────────────────────────────────────
export const listInvoices = (params) => api.get('/invoices', { params })
export const getInvoice = (id) => api.get(`/invoices/${id}`)
export const updateInvoice = (id, updates) => api.put(`/invoices/${id}`, updates)
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`)

// ── Export ────────────────────────────────────────────────────────────────────
export const exportCSV = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  window.open(`/api/invoices/export/csv${query ? '?' + query : ''}`, '_blank')
}
export const exportExcel = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  window.open(`/api/invoices/export/excel${query ? '?' + query : ''}`, '_blank')
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = () => api.get('/stats')
export const getHealth = () => api.get('/health')

export default api
