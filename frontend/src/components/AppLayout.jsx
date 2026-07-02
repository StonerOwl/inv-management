import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useNotes } from '../context/NotesContext';
import NotesDrawer from './NotesDrawer';
import { ErrorBoundary } from './ErrorBoundary';
import clsx from 'clsx';
import { Zap, Moon, Sun, Database, Layers } from 'lucide-react';

const MAIN_TABS = [
  { id: 'inventory', label: 'Inventory', color: 'bg-primary-600', path: '/inventory/dashboard' },
  { id: 'app-management', label: 'Application Management', color: 'bg-indigo-600', path: '/users' },
  { id: 'analytics', label: 'Analytics', color: 'bg-blue-600', path: '/analytics' },
];

const SIDEBAR_OPTIONS = {
  'inventory': [
    { label: 'Upload', path: '/upload' },
    { label: 'Register', path: '/inventory/register' },
    { label: 'Manage', path: '/invoices' },
    { label: 'Search', path: '/inventory/search' },
  ],
  'track-trace': [
    { label: 'Trace Inv', path: '/tracking/trace-inv' },
    { label: 'Trace Workflow', path: '/tracking/workflow' },
    { label: 'Trace Process', path: '/tracking/process' },
    { label: 'Manage', path: '/tracking/manage' },
  ],
  'app-management': [
    { label: 'User', path: '/users' },
    { label: 'Create P/W/S', path: '/app-management/create-pws' },
  ],
  'analytics': [
    { label: 'Track & Trace UI', path: '/analytics', icon: Layers }
  ]
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { toggleDrawer } = useNotes();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/inventory') || path === '/upload' || path === '/invoices') return 'inventory';
    if (path.startsWith('/purchase')) return 'purchase';
    if (path.startsWith('/app-management') || path === '/users') return 'app-management';
    if (path.startsWith('/analytics') || path.startsWith('/tracking')) return 'analytics';
    return 'inventory'; // Default fallback
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Keep active tab in sync with location if navigated from somewhere else
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabClick = (tabId, path) => {
    setActiveTab(tabId);
    if (path) navigate(path);
  };

  const activeSidebarOptions = SIDEBAR_OPTIONS[activeTab] || [];

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-5 px-8 pb-4 shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Link to="/dashboard" className="text-2xl font-bold tracking-tight hover:text-primary-600 transition-colors flex items-center gap-2">
          <Zap size={24} className="text-primary-600" /> <span className="text-primary-900">INVOICE_AI</span>
        </Link>
        
        <div className="flex items-center gap-8 text-sm font-semibold text-gray-600 dark:text-gray-400">
          <Link to="/query" className="hover:text-primary-600 transition-colors">Ask AI</Link>
          <Link to="/help" className="hover:text-primary-600 transition-colors">Help & Support</Link>
          <Link to="/settings" className="hover:text-primary-600 transition-colors">Settings</Link>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href={`${window.location.protocol}//${window.location.hostname}:5050`} 
            target="_blank" 
            rel="noopener noreferrer"
            title="Open pgAdmin"
            className="text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Database size={20} />
          </a>
          <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <>
              <span className="text-sm font-semibold text-primary-700 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-900/50">
                {user.username}
              </span>
              <button 
                onClick={logout}
                className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">Login</Link>
          )}
        </div>
      </div>

      {/* Lower Row / Main Tabs */}
      <div className="flex items-end bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0 px-8 pt-2 gap-8 shadow-sm relative z-20">
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.path)}
              className={clsx(
                "pb-3 text-sm font-bold transition-colors border-b-2",
                isActive 
                  ? "text-primary-600 border-primary-600" 
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:text-gray-200 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Content Area: Sidebar + Outlet */}
      <div className={clsx("flex flex-1 overflow-hidden relative z-10", settings.sidebarLayout === 'right' ? 'flex-row-reverse' : '')}>
        {/* Sidebar */}
        {activeTab !== 'inventory' && (
          <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0 overflow-y-auto flex flex-col py-4 shadow-sm z-10">
            {activeSidebarOptions.map((opt) => (
              <NavLink
                key={opt.path}
                to={opt.path}
                className={({ isActive }) => clsx(
                  "px-8 py-3 transition-colors whitespace-nowrap text-sm font-semibold flex items-center justify-between",
                  isActive ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30/50 border-r-2 border-r-primary-600" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-900 hover:text-gray-900 dark:text-gray-100"
                )}
              >
                <span className="flex items-center gap-2">
                  {opt.icon && <opt.icon size={16} className="text-current" />}
                  {opt.label}
                </span>
              </NavLink>
            ))}
          </aside>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 relative z-0">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Global Notes Drawer & Bubble */}
      <NotesDrawer />
      <button
        onClick={toggleDrawer}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
        title="Open Discussions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

    </div>
    </ErrorBoundary>
  );
}
