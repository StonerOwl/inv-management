import { useState, useEffect } from 'react'
import { getUnmatchedInvoices, suggestPOs, linkPO, listPOs } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Check, X, Search, Link2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export default function POMatching() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [suggestionsMap, setSuggestionsMap] = useState({}) // invoiceId -> suggestions array
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // For manual selection modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [selectedInvoiceForManual, setSelectedInvoiceForManual] = useState(null)
  const [approvedPOs, setApprovedPOs] = useState([])
  const [searchPO, setSearchPO] = useState('')

  useEffect(() => {
    fetchUnmatched()
    fetchApprovedPOs()
  }, [])

  const fetchApprovedPOs = async () => {
    try {
      const { data } = await listPOs({ status: 'approved', limit: 1000 })
      setApprovedPOs(data.items)
    } catch (err) {
      console.error('Failed to load approved POs', err)
    }
  }

  const fetchUnmatched = async () => {
    try {
      setLoading(true)
      const { data } = await getUnmatchedInvoices({ limit: 100 })
      setInvoices(data.items)
      
      // Fetch suggestions for all
      const suggMap = {}
      for (const inv of data.items) {
        try {
          const { data: sData } = await suggestPOs(inv.id)
          suggMap[inv.id] = sData.suggestions
        } catch (err) {
          suggMap[inv.id] = []
        }
      }
      setSuggestionsMap(suggMap)
    } catch (err) {
      setError('Failed to load unmatched invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmMatch = async (invoiceId, poId) => {
    try {
      await linkPO(invoiceId, poId)
      // Remove from list
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to link PO')
    }
  }

  const handleOpenManual = (invoice) => {
    setSelectedInvoiceForManual(invoice)
    setSearchPO('')
    setIsManualModalOpen(true)
  }

  const filteredApprovedPOs = approvedPOs.filter(po => 
    po.po_number.toLowerCase().includes(searchPO.toLowerCase()) || 
    po.item_name.toLowerCase().includes(searchPO.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">

      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter ">PO Matching</h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 mt-2 flex items-center gap-4">
              <span>&gt; BULK VERIFICATION [{invoices.length}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {loading ? (
          <div className="text-center py-12 text-primary-600 font-black font-semibold tracking-normal text-2xl animate-pulse">
            Finding Matches...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black font-semibold tracking-normal text-2xl">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="card-brutal-dark p-16 text-center">
            <Check size={48} className="mx-auto mb-4 text-emerald-400" />
            <p className="text-xl font-black tracking-normal text-emerald-400 ">All Caught Up</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-bold">No unmatched invoices pending verification.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {invoices.map(invoice => {
              const suggestions = suggestionsMap[invoice.id] || []
              const bestMatch = suggestions.length > 0 ? suggestions[0] : null
              
              return (
                <div key={invoice.id} className="card-brutal-dark p-6 border-l-4 border-primary-600">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Invoice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-black tracking-normal bg-white dark:bg-gray-800 px-2 py-1 text-gray-400 border border-gray-200 dark:border-gray-700">
                          INVOICE #{invoice.id}
                        </span>
                        {invoice.invoice_number && (
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ref: {invoice.invoice_number}</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal">Description</p>
                          <p className="text-sm font-bold truncate" title={invoice.product_description}>
                            {invoice.product_description || '—'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal">Quantity</p>
                            <p className="text-sm font-bold text-primary-600">{invoice.quantity || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal">Grand Total</p>
                            <p className="text-sm font-bold">₹{invoice.grand_total?.toFixed(2) || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 relative">
                      <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-4 h-4 text-primary-600">
                        <Link2 size={16} />
                      </div>
                      
                      {bestMatch ? (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black tracking-normal text-emerald-400  flex items-center gap-1">
                              <Check size={14} /> SUGGESTED MATCH
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-normal border border-gray-200 dark:border-gray-700 px-2 py-0.5">
                              SCORE: {bestMatch.score}%
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal">PO Number</p>
                              <p className="text-sm font-bold text-primary-600">{bestMatch.po.po_number}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal">Item Name</p>
                              <p className="text-sm font-bold truncate" title={bestMatch.po.item_name}>
                                {bestMatch.po.item_name}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                          <AlertCircle size={24} className="mb-2" />
                          <p className="text-xs font-bold font-semibold tracking-normal">No Confident Match Found</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-center gap-3 shrink-0 w-full md:w-auto">
                      {bestMatch && (
                        <button
                          onClick={() => handleConfirmMatch(invoice.id, bestMatch.po.id)}
                          className="btn-brutal-dark px-6 py-3 text-xs font-black font-semibold tracking-normal text-emerald-400 hover:text-gray-900 dark:text-gray-100"
                        >
                          CONFIRM MATCH
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenManual(invoice)}
                        className="px-6 py-3 text-xs font-black font-semibold tracking-normal text-gray-500 dark:text-gray-400 hover:text-primary-600 border border-gray-200 dark:border-gray-700 hover:border-primary-600 transition-colors bg-white dark:bg-gray-800"
                      >
                        MANUAL SELECT
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manual Selection Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
              <h2 className="text-xl font-black text-primary-600 tracking-tighter  flex justify-between items-center">
                MANUAL PO SELECT
                <button onClick={() => setIsManualModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-400">
                  <X size={20} />
                </button>
              </h2>
            </div>
            
            <div className="p-6 shrink-0 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400" />
                <input
                  type="text"
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                  placeholder="Search by PO Number or Item Name..."
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none placeholder-gray-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filteredApprovedPOs.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 font-bold  text-xs py-8">
                  No approved POs found
                </div>
              ) : (
                filteredApprovedPOs.map(po => (
                  <div key={po.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 hover:border-primary-600 transition-colors group">
                    <div>
                      <p className="text-sm font-bold text-primary-600">{po.po_number}</p>
                      <p className="text-xs font-bold text-gray-400">{po.item_name} — Qty: {po.quantity}</p>
                    </div>
                    <button
                      onClick={() => {
                        handleConfirmMatch(selectedInvoiceForManual.id, po.id)
                        setIsManualModalOpen(false)
                      }}
                      className="px-4 py-2 text-[10px] font-black font-semibold tracking-normal border border-gray-200 dark:border-gray-700 group-hover:border-primary-600 group-hover:text-primary-600 transition-colors"
                    >
                      SELECT
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
