import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useNotes } from '../context/NotesContext';
import NotesDrawer from './NotesDrawer';
import { ErrorBoundary } from './ErrorBoundary';
import clsx from 'clsx';
import { Zap, Moon, Sun, Database, Layers, GitBranch, Home, Package, Search, Sparkles, HelpCircle, Settings as SettingsIcon, MessageSquare, ChevronRight, ShieldCheck, Folder } from 'lucide-react';

const MAIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard-overview' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory/dashboard' },
  { id: 'quality', label: 'Quality Management', icon: ShieldCheck, path: '/quality' },
  { id: 'app-management', label: 'Projects', icon: Folder, path: '/users' },
  { id: 'analytics', label: 'Analytics', icon: GitBranch, path: '/analytics' },
];

const SIDEBAR_OPTIONS = {
  'dashboard': [
    { label: 'Dashboard', path: '/dashboard-overview', icon: Home },
    { label: 'Inventory', path: '/inventory/dashboard', icon: Package },
  ],
  'quality': [
    { label: 'Dashboard', path: '/quality' },
  ],
  'app-management': [
    { label: 'User', path: '/users', icon: Package },
    { label: 'Create P/W/S', path: '/app-management/create-pws', icon: Layers },
  ],
  'analytics': [
    { label: 'Track & Trace', path: '/analytics', icon: Layers },
    { label: 'Farm to Fork', path: '/analytics/farm-to-fork', icon: GitBranch },
  ],
  'inventory': [
    { label: 'Inventory', path: '/inventory/dashboard', icon: Package },
  ],
};

const NO_SIDEBAR_TABS = [];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { toggleDrawer } = useNotes();
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/inventory')) return 'inventory';
    if (path.startsWith('/dashboard-overview') || path === '/upload' || path === '/invoices') return 'dashboard';
    if (path.startsWith('/purchase')) return 'purchase';
    if (path.startsWith('/quality')) return 'quality';
    if (path.startsWith('/app-management') || path === '/users') return 'app-management';
    if (path.startsWith('/analytics') || path.startsWith('/tracking')) return 'analytics';
    if (path.startsWith('/admin')) return 'admin';
    return 'inventory';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabClick = (tabId, path) => {
    setActiveTab(tabId);
    if (path) navigate(path);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        navigate(`/query?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate('/query');
      }
    }
  };

  const activeSidebarOptions = SIDEBAR_OPTIONS[activeTab] || [];
  const showSidebar = !NO_SIDEBAR_TABS.includes(activeTab);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-100 selection:text-primary-900">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 z-20">
          <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
            <svg width="42" height="32" viewBox="0 0 46 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="22" height="22" rx="4" fill="#2563EB" />
              <rect x="12" y="14" width="22" height="22" rx="4" fill="#0D9488" />
              <rect x="23.3" y="0" width="22" height="22" rx="4" fill="#3B82F6" />
            </svg>
            <div className="flex flex-col justify-center">
              <span className="text-xl font-extrabold text-[#0B1B3D] dark:text-white leading-none">
                AIQ Platform
              </span>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mt-1">
                Integrated with Inventory Management
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search projects, batches, invoices, quality notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm rounded-full py-2.5 pl-10 pr-4 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/query" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
              <Sparkles size={16} /> Ask AI
            </Link>

            <button className="flex items-center gap-1.5 px-3 py-1.5 text-gray-800 dark:text-gray-300 font-bold text-sm hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <HelpCircle size={18} /> Help & Support
            </button>

            <Link to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 text-gray-800 dark:text-gray-300 font-bold text-sm hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <SettingsIcon size={18} /> Settings
            </Link>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>

            <button onClick={toggleTheme} className="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <a href="http://localhost:5050" target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" title="Database (pgAdmin)">
              <Database size={20} />
            </a>

            {user ? (
              <div className="flex items-center gap-3 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{user.username}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{user.role || 'User'}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <Link to="/login" className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors ml-4">Login</Link>
            )}
          </div>
        </header>

        {/* ── Tab Bar ── */}
        <nav className="flex items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 px-6 py-2 gap-2 shadow-sm relative z-10 overflow-x-auto">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.path)}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                {tab.icon && <tab.icon size={16} />}
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* ── Main Layout Area ── */}
        <div className={clsx("flex flex-1 overflow-hidden relative z-0", settings.sidebarLayout === 'right' ? 'flex-row-reverse' : '')}>
          {showSidebar && (
            <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0 overflow-y-auto flex flex-col py-6 z-10">
              <div className="px-6 mb-4">
                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Navigation</p>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {activeSidebarOptions.map((opt) => (
                  <NavLink
                    key={opt.path}
                    to={opt.path}
                    end={opt.path === '/analytics'}
                    className={({ isActive }) => clsx(
                      "px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap text-sm font-semibold flex items-center justify-between group",
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                        : "text-gray-800 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {opt.icon && <opt.icon size={18} className="text-current" />}
                      {opt.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </aside>
          )}

          <main className="flex-1 overflow-y-auto bg-gray-100/50 dark:bg-gray-950 relative z-0 flex flex-col">
            <div className="flex-1 p-8">
              <Outlet />
            </div>

            {/* ── Footer ── */}
            <footer className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
              <div>
                © 2026 AIQ Platform. All rights reserved.
              </div>
              <div className="flex items-center gap-2">
                <span className="capitalize">{MAIN_TABS.find(t => t.id === activeTab)?.label || activeTab.replace('-', ' ')}</span>
                <ChevronRight size={12} />
                <span>Dashboard</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-medium">
                  <ShieldCheck size={14} /> Data is secure and encrypted
                </span>
                <span>Last updated: {new Date().toLocaleString()}</span>
              </div>
            </footer>
          </main>
        </div>

        <NotesDrawer />
        <button
          onClick={toggleDrawer}
          className="fixed bottom-16 right-8 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
          title="Open Discussions"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </ErrorBoundary>
  );
}