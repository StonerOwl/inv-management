import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

export default function AnalyticsCharts({ data }) {
  const states = data?.states || []

  const chartData = useMemo(() => {
    // 1. Stage Completion Status (Pie Chart)
    const completedCount = states.filter(s => s.completed).length
    const pendingCount = states.length - completedCount
    
    const pieData = [
      { name: 'Completed', value: completedCount },
      { name: 'Pending', value: pendingCount }
    ]

    // 2. Processes per Stage (Bar Chart)
    const barData = states.map(stage => ({
      name: stage.name,
      processes: (stage.processes || []).length
    }))

    return { pieData, barData }
  }, [states])

  const COLORS = ['#10b981', '#cbd5e1'] // Emerald for completed, Gray for pending

  if (states.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Bar Chart: Processes per Stage */}
      <div className="aiq-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-5 bg-violet-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Complexity: Processes per Stage</h3>
        </div>
        <div className="h-64 text-gray-800 dark:text-gray-200">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <RechartsTooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
              />
              <Bar dataKey="processes" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32} name="Number of Processes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Completion Status */}
      <div className="aiq-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Overall Stage Progress</h3>
        </div>
        <div className="h-64 text-gray-800 dark:text-gray-200">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
