import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DashboardPage from './pages/DashboardPage'
import Upload from './pages/Upload'
import InvoiceList from './pages/InvoiceList'
import InvoiceDetail from './pages/InvoiceDetail'
import TrackTracePage from './pages/analytics/TrackTracePage'
import FarmToForkPage from './pages/analytics/FarmToForkPage'
import Modify from './pages/Modify'
import NaturalQuery from './pages/NaturalQuery'
import BackgroundPreview from './pages/BackgroundPreview'
import Login from './pages/Login'
import UserManagement from './pages/UserManagement'
import ItemCodes from './pages/ItemCodes'
import TrackingDashboard from './pages/TrackingDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import TraceWorkflow from './pages/TraceWorkflow'
import TraceProcess from './pages/TraceProcess'
import TraceInventory from './pages/TraceInventory'
import ManageTracking from './pages/ManageTracking'
import PlaceholderPage from './pages/PlaceholderPage'
import RegisterInventory from './pages/RegisterInventory'
import SearchInventory from './pages/SearchInventory'
import CreatePWS from './pages/CreatePWS'
import ManageWorkflow from './pages/ManageWorkflow'
import IntegrateDevices from './pages/IntegrateDevices'
import MobilePairing from './pages/MobilePairing'
import Settings from './pages/Settings'
import HelpSupport from './pages/HelpSupport'
import QualityManagement from './pages/QualityManagement'
import { MonitoringLogs, MonitoringAlerts, MonitoringDevices, MonitoringNotifications } from './pages/Monitoring'
import { AuthProvider } from './context/AuthContext'
import { UploadProvider } from './context/UploadContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { NotesProvider } from './context/NotesContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import DashboardInventory from './pages/DashboardInventory'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UploadProvider>
          <SettingsProvider>
            <NotesProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/mobile-pair" element={<MobilePairing />} />
                  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/" element={<Navigate to="/dashboard-overview" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard-overview" element={<DashboardPage />} />
                    <Route path="/dashboard/inventory" element={<DashboardInventory />} />

                    <Route path="/help" element={<HelpSupport />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/query" element={<NaturalQuery />} />

                    <Route path="/upload" element={<Navigate to="/inventory/dashboard" replace />} />
                    <Route path="/invoices" element={<Navigate to="/inventory/dashboard" replace />} />
                    <Route path="/inventory/register/:id?" element={<Navigate to="/inventory/dashboard" replace />} />
                    <Route path="/inventory/search" element={<Navigate to="/inventory/dashboard" replace />} />
                    <Route path="/inventory/dashboard" element={<InventoryDashboard />} />

                    <Route path="/tracking" element={<TrackingDashboard />} />
                    <Route path="/tracking/trace-inv" element={<TraceInventory />} />
                    <Route path="/tracking/workflow" element={<TraceWorkflow />} />
                    <Route path="/tracking/process" element={<TraceProcess />} />
                    <Route path="/tracking/manage" element={<ManageTracking />} />

                    <Route path="/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
                    <Route path="/admin/create-pws" element={<ProtectedRoute requiredRole="admin"><CreatePWS /></ProtectedRoute>} />
                    <Route path="/app-management/create-pws" element={<ProtectedRoute requiredRole="admin"><CreatePWS /></ProtectedRoute>} />
                    <Route path="/app-management/manage-workflow" element={<ProtectedRoute requiredRole="admin"><ManageWorkflow /></ProtectedRoute>} />
                    <Route path="/app-management/integrate-devices" element={<ProtectedRoute requiredRole="admin"><IntegrateDevices /></ProtectedRoute>} />

                    <Route path="/invoices/:id" element={<InvoiceDetail />} />

                    <Route path="/analytics" element={<TrackTracePage />} />
                    <Route path="/analytics/farm-to-fork" element={<FarmToForkPage />} />

                    <Route path="/quality" element={<QualityManagement />} />

                    <Route path="/ai-overview" element={<PlaceholderPage title="AI Overview" />} />

                    <Route path="/monitoring" element={<Navigate to="/monitoring/logs" replace />} />
                    <Route path="/monitoring/logs" element={<MonitoringLogs />} />
                    <Route path="/monitoring/alerts" element={<MonitoringAlerts />} />
                    <Route path="/monitoring/devices" element={<MonitoringDevices />} />
                    <Route path="/monitoring/notifications" element={<MonitoringNotifications />} />

                    <Route path="/preview-bg" element={<BackgroundPreview />} />
                    <Route path="/modify" element={<ProtectedRoute requireUpload={true}><Modify /></ProtectedRoute>} />
                    <Route path="/item-codes" element={<ItemCodes />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NotesProvider>
          </SettingsProvider>
        </UploadProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}