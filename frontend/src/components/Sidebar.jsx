import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, FileText, BarChart3, Zap, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

export default function Sidebar() {
  const [ollamaOk, setOllamaOk] = useState(null)

  useEffect(() => {
    getHealth()
      .then(r => setOllamaOk(r.data.ollama?.status === 'ok'))
      .catch(() => setOllamaOk(false))
  }, [])

  return (
    <aside className="w-64 shrink-0 bg-surface-800 border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">InvoiceAI</h1>
            <p className="text-xs text-white/40">Local Scanner</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('nav-link', isActive && 'active')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Ollama status */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className={clsx(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium',
          ollamaOk === null && 'bg-white/5 text-white/40',
          ollamaOk === true && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          ollamaOk === false && 'bg-red-500/10 text-red-400 border border-red-500/20',
        )}>
          <Activity size={14} className={ollamaOk ? 'animate-pulse' : ''} />
          <span>
            {ollamaOk === null && 'Checking Ollama...'}
            {ollamaOk === true && 'Ollama Connected'}
            {ollamaOk === false && 'Ollama Offline'}
          </span>
        </div>
        <p className="text-xs text-white/25 mt-2 px-1">100% local · No cloud</p>
      </div>
    </aside>
  )
}
