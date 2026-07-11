import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const uploadInvoices = (files, onProgress) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return api.post('/upload', form, {
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total)),
  })
}

export const getJobStatus = (jobId) => api.get(`/upload/job/${jobId}`)
export const listJobs = () => api.get('/upload/jobs')

export const listInvoices = (params) => api.get('/invoices', { params })
export const getUnmatchedInvoices = (params) => api.get('/invoices/unmatched', { params })
export const getInvoice = (id) => api.get(`/invoices/${id}`)
export const updateInvoice = (id, updates) => api.put(`/invoices/${id}`, updates)
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`)
export const suggestPOs = (id) => api.get(`/invoices/${id}/suggest-po`)
export const linkPO = (invoiceId, poId) => api.put(`/invoices/${invoiceId}/link-po?po_id=${poId}`)

const downloadBlob = async (url, filename) => {
  const response = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.parentNode.removeChild(link)
}

export const exportCSV = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  return downloadBlob(`/invoices/export/csv${query ? '?' + query : ''}`, 'invoices.csv')
}
export const exportExcel = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  return downloadBlob(`/invoices/export/excel${query ? '?' + query : ''}`, 'invoices.xlsx')
}

export const getNotes = (targetType = null, targetId = null) => {
  const params = {}
  if (targetType) params.target_type = targetType
  if (targetId) params.target_id = targetId
  return api.get('/notes', { params })
}

export const createNote = (targetType, targetId, content, files = []) => {
  const form = new FormData()
  form.append('target_type', targetType)
  form.append('target_id', targetId)
  form.append('content', content)
  files.forEach(f => form.append('files', f))
  return api.post('/notes', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getStats = () => api.get('/stats')
export const getHealth = () => api.get('/health')

export const listJsonFiles = () => api.get('/json-files')
export const getJsonFileUrl = (jobId, filename) => `/api/json-files/${jobId}/${filename}`
export const downloadJsonFile = (jobId, filename) => {
  window.open(getJsonFileUrl(jobId, filename), '_blank')
}

export const runNLQuery = (data) => api.post('/query/nl', data, { timeout: 120000 })
export const getQuerySuggestions = () => api.get('/query/suggestions')

export const login = (data) => api.post('/auth/token', data, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})
export const getCurrentUser = () => api.get('/auth/users/me')
export const listUsers = () => api.get('/auth/users')
export const createUser = (data) => api.post('/auth/users', data)
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data)

export const createPO = (data) => api.post('/po', data)
export const listPOs = (params) => api.get('/po', { params })
export const getPO = (id) => api.get(`/po/${id}`)
export const getPOStats = () => api.get('/po/stats')
export const approvePO = (id) => api.put(`/po/${id}/approve`)
export const rejectPO = (id) => api.put(`/po/${id}/reject`)
export const deletePO = (id) => api.delete(`/po/${id}`)
export const exportPOCSV = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  return downloadBlob(`/po/export/csv${query ? '?' + query : ''}`, 'purchase_orders.csv')
}
export const exportPOExcel = (params) => {
  const query = new URLSearchParams(params || {}).toString()
  return downloadBlob(`/po/export/excel${query ? '?' + query : ''}`, 'purchase_orders.xlsx')
}

export const listProducts = (params) => api.get('/products', { params })
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)

export const listCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

export const createWorkflow = (catId, data) => api.post(`/categories/${catId}/workflows`, data)
export const updateWorkflow = (catId, wid, data) => api.put(`/categories/${catId}/workflows/${wid}`, data)
export const deleteWorkflow = (catId, wid) => api.delete(`/categories/${catId}/workflows/${wid}`)

export const createProcess = (catId, wid, data) => api.post(`/categories/${catId}/workflows/${wid}/processes`, data)
export const updateProcess = (catId, wid, pid, data) => api.put(`/categories/${catId}/workflows/${wid}/processes/${pid}`, data)
export const deleteProcess = (catId, wid, pid) => api.delete(`/categories/${catId}/workflows/${wid}/processes/${pid}`)

export const getInvoiceTracking = (invoiceId) => api.get(`/tracking/invoice/${invoiceId}`)
export const toggleProcess = (invoiceId, processId, data) => api.put(`/tracking/invoice/${invoiceId}/process/${processId}`, data)
export const toggleWorkflow = (invoiceId, workflowId, data) => api.put(`/tracking/invoice/${invoiceId}/workflow/${workflowId}`, data)
export const getTrackingDashboard = (params) => api.get('/tracking/dashboard', { params })

export const reassignTrackingCategory = (invoiceId, data) => api.put(`/tracking/manage/invoice/${invoiceId}/reassign-category`, data)
export const revertTrackingCategory = (invoiceId) => api.put(`/tracking/manage/invoice/${invoiceId}/revert-category`)
export const resetTracking = (invoiceId) => api.delete(`/tracking/manage/invoice/${invoiceId}/reset`)
export const getTrackingHistory = (invoiceId) => api.get(`/tracking/manage/invoice/${invoiceId}/history`)
export const addTrackingNote = (invoiceId, data) => api.put(`/tracking/manage/invoice/${invoiceId}/note`, data)

export const getPWSItems = () => api.get('/pws/items')
export const createPWSItem = (data) => api.post('/pws/items', data)
export const updatePWSItem = (id, data) => api.put(`/pws/items/${id}`, data)
export const deletePWSItem = (id) => api.delete(`/pws/items/${id}`)
export const getPWSAssignments = () => api.get('/pws/assignments')
export const createPWSAssignment = (data) => api.post('/pws/assignments', data)
export const deletePWSAssignment = (parentId, childId) => api.delete(`/pws/assignments/${parentId}/${childId}`)
export const assignInvoiceToProject = (projectId, invoiceId, selectedLineItemIds = null) => api.post('/pws/invoice-project', { project_id: projectId, invoice_id: invoiceId, ...(selectedLineItemIds ? { selected_line_item_ids: selectedLineItemIds } : {}) })
export const getProjectAnalytics = (projectId) => api.get(`/pws/projects/${projectId}/analytics`)

export const getInvoiceAssignments = () => api.get('/pws/invoice-project/all')

// Stage ↔ Inventory Item Linking
export const getProjectInventory = (projectId) => api.get(`/pws/projects/${projectId}/inventory`)
export const getStageItemLinks = (stageId) => api.get(`/pws/stage-items/${stageId}`)
export const createStageItemLink = (data) => api.post('/pws/stage-items', data)
export const deleteStageItemLink = (linkId) => api.delete(`/pws/stage-items/${linkId}`)

// ── Inventory Items ───────────────────────────────────────────────────────────
export const listInventoryItems = (params) => api.get('/inventory/items', { params })
export const getInventoryItem = (id) => api.get(`/inventory/items/${id}`)
export const updateInventoryItem = (id, data) => api.put(`/inventory/items/${id}`, data)
export const deleteInventoryItem = (id) => api.delete(`/inventory/items/${id}`)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardData = () => api.get('/dashboard')

export const createQualityNote = (data) => api.post('/quality/notes', data)
export const listQualityNotes = (params) => api.get('/quality/notes', { params })
export const approveQualityNote = (id) => api.put(`/quality/notes/${id}/approve`)
export const getQualitySummary = () => api.get('/quality/summary')

export const getDevices = () => api.get('/devices/')
export const createDevice = (data) => api.post('/devices/', data)
export const updateDevice = (id, data) => api.put(`/devices/${id}`, data)
export const deleteDevice = (id) => api.delete(`/devices/${id}`)
export const addDeviceNote = (id) => api.post(`/devices/${id}/notes`)
export const getDeviceStats = () => api.get('/devices/stats')

export const uploadQualityEvidence = (noteId, evidenceByCategory) => {
  const formData = new FormData()
  let hasFiles = false
  Object.entries(evidenceByCategory).forEach(([category, files]) => {
    files.forEach((file) => {
      formData.append(category, file)
      hasFiles = true
    })
  })
  if (!hasFiles) return Promise.resolve(null)
  return api.post(`/quality/notes/${noteId}/evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getQualityNoteQRCode = (noteId) => api.get(`/quality/notes/${noteId}/qrcode`)
export const verifyQualityNoteQR = (payload) => api.post('/quality/notes/verify', { payload })

export default api