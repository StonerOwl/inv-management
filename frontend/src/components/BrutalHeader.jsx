import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

import { ChevronDown } from 'lucide-react'

export default function BrutalHeader() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navLinks = [
    { 
      name: 'INVENTORY',
      isDropdown: true,
      children: [
        { name: 'UPLOAD', path: '/upload', requireUpload: true },
        { name: 'DASHBOARD', path: '/inventory/dashboard' },
        { name: 'INVOICES', path: '/invoices' },
        { name: 'TRACKING', path: '/tracking' },
      ]
    },
    { name: 'ASK AI', path: '/query' },
    { name: 'ITEM CODES', path: '/item-codes' },
    { name: 'USERS', path: '/users', adminOnly: true },
  ]

  return (
    <div className="flex items-center justify-between mb-16 pt-4 px-8">
      <Link to="/dashboard" className="text-2xl font-black tracking-tighter hover:text-primary-600 transition-colors">
        /// InvoiceAI
      </Link>
      <div className="flex items-center gap-8 text-xs font-bold tracking-normal">
        {navLinks.map((link) => {
          if (link.adminOnly && user?.role !== 'admin') return null;
          if (link.requireUpload && user?.role !== 'admin' && !user?.can_upload) return null;
          
          if (link.isDropdown) {
            const isActive = link.children.some(child => location.pathname.startsWith(child.path))
            return (
              <div key={link.name} className="relative group py-2">
                <button className={clsx(
                  "transition-colors hover:text-gray-900 dark:text-gray-100 flex items-center gap-1  outline-none",
                  isActive ? "text-primary-600" : "text-gray-500 dark:text-gray-400"
                )}>
                  {link.name}
                  <ChevronDown size={12} className="opacity-50 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 mt-0 hidden group-hover:flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[4px_4px_0px_0px_rgba(252,213,53,1)] z-50 min-w-[200px]">
                  {link.children.map(child => {
                    if (child.requireUpload && user?.role !== 'admin' && !user?.can_upload) return null;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={clsx(
                          "px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-100 dark:bg-gray-800 transition-colors whitespace-nowrap",
                          location.pathname === child.path ? "text-primary-600" : "text-gray-400 hover:text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={link.path}
              to={link.path}
              className={clsx(
                "transition-colors hover:text-gray-900 dark:text-gray-100 py-2",
                location.pathname.startsWith(link.path) ? "text-primary-600" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {link.name}
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold tracking-normal text-primary-600 bg-white dark:bg-gray-800 px-2 py-1  border border-gray-200 dark:border-gray-700">
          {user?.username}
        </span>
        <button 
          onClick={logout}
          className="text-xs font-black tracking-normal text-red-500 hover:text-red-400  transition-colors"
        >
          LOGOUT
        </button>
      </div>
    </div>
  )
}
