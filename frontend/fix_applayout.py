import re

with open('src/components/AppLayout.jsx', 'r') as f:
    content = f.read()

# 1. Update MAIN_TABS
main_tabs_old = """const MAIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', color: 'bg-primary-600', path: '/dashboard-overview' },
  { id: 'inventory', label: 'Inventory', color: 'bg-primary-600', path: '/inventory/dashboard' },
  { id: 'app-management', label: 'Application Management', color: 'bg-indigo-600', path: '/users' },
  { id: 'analytics', label: 'Analytics', color: 'bg-blue-600', path: '/analytics' },
];"""

main_tabs_new = """const MAIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', color: 'bg-primary-600', path: '/dashboard-overview' },
  { id: 'app-management', label: 'Application Management', color: 'bg-indigo-600', path: '/users' },
  { id: 'analytics', label: 'Analytics', color: 'bg-blue-600', path: '/analytics' },
];"""
content = content.replace(main_tabs_old, main_tabs_new)

# 2. Update SIDEBAR_OPTIONS
sidebar_options_old = """const SIDEBAR_OPTIONS = {
  'inventory': [
    { label: 'Upload', path: '/upload' },
    { label: 'Register', path: '/inventory/register' },
    { label: 'Manage', path: '/invoices' },
    { label: 'Search', path: '/inventory/search' },
  ],"""

sidebar_options_new = """import { LayoutDashboard, Package } from 'lucide-react';

const SIDEBAR_OPTIONS = {
  'dashboard': [
    { label: 'Overview', path: '/dashboard-overview' },
    { label: 'Inventory', path: '/inventory/dashboard' },
    { label: 'Upload', path: '/upload' },
    { label: 'Register', path: '/inventory/register' },
    { label: 'Manage', path: '/invoices' },
    { label: 'Search', path: '/inventory/search' },
  ],"""
# Note: we need to handle the import for lucide-react if we were to add icons, but let's stick to no icons as they weren't there for inventory.
sidebar_options_new = """const SIDEBAR_OPTIONS = {
  'dashboard': [
    { label: 'Overview', path: '/dashboard-overview' },
    { label: 'Inventory', path: '/inventory/dashboard' },
    { label: 'Upload', path: '/upload' },
    { label: 'Register', path: '/inventory/register' },
    { label: 'Manage', path: '/invoices' },
    { label: 'Search', path: '/inventory/search' },
  ],"""
content = content.replace(sidebar_options_old, sidebar_options_new)

# 3. NO_SIDEBAR_TABS
no_sidebar_old = "const NO_SIDEBAR_TABS = ['inventory', 'dashboard'];"
no_sidebar_new = "const NO_SIDEBAR_TABS = [];"
content = content.replace(no_sidebar_old, no_sidebar_new)

# 4. getActiveTab
get_active_tab_old = """  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard-overview')) return 'dashboard';
    if (path.startsWith('/inventory') || path === '/upload' || path === '/invoices') return 'inventory';"""

get_active_tab_new = """  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard-overview') || path.startsWith('/inventory') || path === '/upload' || path === '/invoices') return 'dashboard';"""
content = content.replace(get_active_tab_old, get_active_tab_new)

# In case the exact formatting is slightly different, let's use regex
content = re.sub(
    r"const NO_SIDEBAR_TABS = \['inventory', 'dashboard'\];",
    "const NO_SIDEBAR_TABS = [];",
    content
)

content = re.sub(
    r"if \(path\.startsWith\('/dashboard-overview'\)\) return 'dashboard';\s+if \(path\.startsWith\('/inventory'\) \|\| path === '/upload' \|\| path === '/invoices'\) return 'inventory';",
    "if (path.startsWith('/dashboard-overview') || path.startsWith('/inventory') || path === '/upload' || path === '/invoices') return 'dashboard';",
    content
)

with open('src/components/AppLayout.jsx', 'w') as f:
    f.write(content)

