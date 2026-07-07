import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { runNLQuery } from '../api/client'
import { Search, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function NaturalQuery() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (initialQuery && !result && !loading && !error) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = async (overrideQuery) => {
    const searchString = typeof overrideQuery === 'string' ? overrideQuery : query
    if (!searchString.trim()) return
    
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await runNLQuery({ question: searchString })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred while generating the query.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex flex-col items-start justify-between">
              <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-4 text-gray-900 dark:text-gray-100">
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <MessageSquare size={24} />
                </div>
                Ask AI
              </h1>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 flex items-center gap-4">
                <span>Natural Language Semantic Querying</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <div className="flex items-center aiq-card p-2 border-2 focus-within:border-primary-500 dark:focus-within:border-primary-400 transition-colors">
                <Search className="text-gray-600 dark:text-gray-400 ml-4 mr-2 shrink-0" size={24} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Which invoices mentioned a delay in shipping?"
                  className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 font-semibold py-4 px-2 outline-none placeholder-gray-400 dark:placeholder-gray-600 text-lg"
                  disabled={loading}
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="aiq-btn-primary ml-2 px-8 py-4 text-base flex items-center gap-2 rounded-lg"
                >
                  {loading ? <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span> : <Sparkles size={20} />}
                  {loading ? 'Asking AI' : 'Ask AI'}
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-start gap-4">
                <AlertTriangle className="text-red-500 dark:text-red-400 shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-300 text-lg">Query Failed</h3>
                  <p className="text-red-600 dark:text-red-400 mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-8 animate-slide-up pb-20 mt-12">
                
                {/* AI Answer Pill */}
                <div className="flex flex-col gap-4 aiq-card border-2 border-primary-500/20 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-900/10 p-8">
                  <div className="flex items-center gap-4 mb-2">
                    <Sparkles size={28} className="text-primary-600 dark:text-primary-400 shrink-0" />
                    <strong className="text-primary-700 dark:text-primary-300 font-extrabold text-2xl">AI Response</strong>
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 font-medium text-lg leading-relaxed">
                    <ReactMarkdown>{result.answer}</ReactMarkdown>
                  </div>
                </div>

                {/* Context Details */}
                <details className="group border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 rounded-xl p-4">
                  <summary className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between outline-none">
                    <span>View Retrieved Context (Debug)</span>
                    <span className="text-xs text-primary-600 dark:text-primary-400">Click to Expand</span>
                  </summary>
                  <pre className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap border border-gray-200 dark:border-gray-800">
                    {result.context_used}
                  </pre>
                </details>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
