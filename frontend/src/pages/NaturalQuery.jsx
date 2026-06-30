import { useState, useRef } from 'react'
import { runNLQuery } from '../api/client'
import { Search, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function NaturalQuery() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await runNLQuery({ question: query })
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
            <div className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 flex flex-col items-start justify-between">
              <h1 className="text-7xl font-black tracking-tighter flex items-center gap-6">
                <div className="w-16 h-16 bg-[#FCD535] flex items-center justify-center border-4 border-primary-600">
                  <MessageSquare size={36} className="text-black" />
                </div>
                ASK AI
              </h1>
              <div className="text-sm font-bold tracking-normal text-primary-600 mt-4 flex items-center gap-4">
                <span>&gt; SEMANTIC · RAG · SEARCH</span>
                <div className="w-32 h-[1px] bg-[#FCD535]"></div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <div className="flex items-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus-within:border-primary-600 transition-colors p-2 shadow-[8px_8px_0_0_#000]">
                <Search className="text-primary-600 ml-4 mr-2 shrink-0" size={24} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. WHICH INVOICES MENTIONED A DELAY IN SHIPPING?"
                  className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 font-bold tracking-normal py-4 px-2 outline-none placeholder-gray-700"
                  disabled={loading}
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="bg-[#FCD535] text-black hover:bg-white dark:bg-gray-800 transition-colors font-black tracking-normal px-8 py-4 ml-2 flex items-center gap-2 border-2 border-black"
                >
                  {loading ? <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span> : <Sparkles size={18} />}
                  {loading ? 'ASKING AI' : 'ASK AI'}
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-500 border-2 border-black p-6 shadow-[8px_8px_0_0_#000] flex items-start gap-4">
                <AlertTriangle className="text-black shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-black text-black tracking-normal text-lg">QUERY FAILED</h3>
                  <p className="text-black font-bold tracking-normal mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-8 animate-slide-up pb-20 mt-12">
                
                {/* AI Answer Pill */}
                <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 border-2 border-primary-600 p-8 shadow-[8px_8px_0_0_#000]">
                  <div className="flex items-center gap-4 mb-2">
                    <Sparkles size={28} className="text-primary-600 shrink-0" />
                    <strong className="text-primary-600 font-black tracking-tighter text-2xl uppercase">AI RESPONSE</strong>
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 font-bold text-lg leading-relaxed">
                    <ReactMarkdown>{result.answer}</ReactMarkdown>
                  </div>
                </div>

                {/* Context Details */}
                <details className="group border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <summary className="font-black text-gray-500 dark:text-gray-400 cursor-pointer flex items-center justify-between outline-none">
                    <span>VIEW RETRIEVED CONTEXT (DEBUG)</span>
                    <span className="text-xs text-primary-600">CLICK TO EXPAND</span>
                  </summary>
                  <pre className="mt-6 bg-gray-100 dark:bg-gray-900 p-6 overflow-x-auto text-xs font-mono text-gray-500 whitespace-pre-wrap font-bold border border-gray-200 dark:border-gray-700">
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
