import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats, listInvoices } from '../api/client'
import { TrendingUp, FileText, IndianRupee, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
  }
  return (
    <div className="stat-card animate-slide-up">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    processed: 'badge-processed',
    needs_review: 'badge-review',
    error: 'badge-error',
    duplicate: 'badge-duplicate',
  }
  const labels = {
    processed: 'Processed',
    needs_review: 'Review',
    error: 'Error',
    duplicate: 'Duplicate',
  }
  return <span className={map[status] || 'badge-processed'}>{labels[status] || status}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getStats(), listInvoices({ limit: 8 })]).then(([s, r]) => {
      setStats(s.data)
      setRecent(r.data.items || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back 👋
        </h1>
        <p className="text-white/50 mt-1">Here's your invoice summary at a glance.</p>
      </div>

      {/* Blobs */}
      <div className="blob w-96 h-96 bg-brand-600 -top-32 -right-32 fixed" />
      <div className="blob w-64 h-64 bg-violet-600 top-1/2 -left-32 fixed" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative">
        <StatCard
          icon={FileText}
          label="Total Invoices"
          value={stats?.total_invoices ?? 0}
          sub="All time"
          color="brand"
        />
        <StatCard
          icon={IndianRupee}
          label="Total Spend"
          value={formatCurrency(stats?.total_spend)}
          sub="Grand total across all invoices"
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Platforms"
          value={Object.keys(stats?.by_platform || {}).length}
          sub="Unique sources"
          color="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs Review"
          value={stats?.needs_review_count ?? 0}
          sub="Low confidence extractions"
          color="rose"
        />
      </div>

      {/* Platform spend + Recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Spend by Platform</h2>
          {Object.keys(stats?.by_platform || {}).length === 0 ? (
            <p className="text-white/30 text-sm">No data yet — upload invoices to get started.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(stats.by_platform)
                .sort(([, a], [, b]) => b - a)
                .map(([platform, total]) => {
                  const max = Math.max(...Object.values(stats.by_platform))
                  const pct = max > 0 ? (total / max) * 100 : 0
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/80 font-medium">{platform || 'Unknown'}</span>
                        <span className="text-white/50">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Recent invoices */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Recent Invoices</h2>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No invoices yet.</p>
              <button
                onClick={() => navigate('/upload')}
                className="mt-3 btn-primary text-xs px-4 py-2"
              >
                Upload your first invoice
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(inv => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{inv.file_name}</p>
                      <p className="text-xs text-white/40">
                        {inv.platform || 'Unknown'} · {inv.seller_name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-sm font-semibold text-white">{formatCurrency(inv.grand_total)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
