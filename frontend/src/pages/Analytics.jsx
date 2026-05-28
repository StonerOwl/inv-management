import { useEffect, useState } from 'react'
import { getStats } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-sm border border-white/10">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name === 'total' || p.name === 'spend'
            ? `₹${Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats().then(r => { setStats(r.data); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const platformData = Object.entries(stats?.by_platform || {}).map(([name, total]) => ({ name, total }))
  const monthData = (stats?.by_month || []).map(m => ({ ...m, spend: m.total }))
  const sellerData = (stats?.top_sellers || []).slice(0, 8)

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-white/50 mt-1">Spending insights across all your invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly spend */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Monthly Spend</h2>
          {monthData.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="spend" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Platform distribution */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Platform Distribution</h2>
          {platformData.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No data yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                  >
                    {platformData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) => <span className="text-xs text-white/60">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Monthly invoice count */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Monthly Invoice Count</h2>
        {monthData.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top sellers */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Top Sellers by Spend</h2>
        {sellerData.length === 0 ? (
          <p className="text-white/30 text-sm">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {sellerData.map((s, i) => {
              const max = sellerData[0].total
              const pct = max > 0 ? (s.total / max) * 100 : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80 font-medium truncate max-w-sm">{s.seller}</span>
                    <span className="text-white/50 ml-4 shrink-0">
                      ₹{Number(s.total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `${COLORS[i % COLORS.length]}`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
