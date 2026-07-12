import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AlertTriangle, Settings, CheckCircle,
  Wifi, Bluetooth, Usb, Cpu, Database, Activity, ArrowRight,
  MonitorSmartphone, Radio, ChevronDown, Plus, Link as LinkIcon,
  Camera, Zap, Share2, Server, Globe, FileText, Check, MoreHorizontal,
  X, Video, Smartphone, Key, Copy, Info, Loader2, RefreshCw, ScrollText,
  ChevronRight, Layers, GitBranch, GitCommit, Tag
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import { getDevices, getDeviceStats, createDevice, updateDevice, deleteDevice, addDeviceNote, getLogs, getPWSItems, getPWSAssignments } from '../api/client';
import clsx from 'clsx';

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function IntegrateDevices() {
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', category: 'Sensor Arrays', subtype: '', interface: 'Wi-Fi', linked_process: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairingMode, setPairingMode] = useState('manual');
  const [qrSessionId, setQrSessionId] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterInterface, setFilterInterface] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProcess, setFilterProcess] = useState('All');

  // PWS data for process linking
  const [pwsItems, setPwsItems] = useState({ projects: [], workflows: [], stages: [], processes: [] });
  const [pwsAssignments, setPwsAssignments] = useState([]);
  const [linkedProcesses, setLinkedProcesses] = useState([]); // [{projectId, workflowId, stageId, processId, label}]
  const [editLinkedProcesses, setEditLinkedProcesses] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [deviceLogs, setDeviceLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const DEVICE_LOGS_LIMIT = 8;

  const fetchDeviceLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await getLogs({ category: 'device', limit: DEVICE_LOGS_LIMIT });
      setDeviceLogs(data.items || []);
    } catch (err) {
      console.error("Failed to load device logs", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, statsRes, pwsItemsRes, pwsAssignRes] = await Promise.all([
        getDevices(),
        getDeviceStats(),
        getPWSItems(),
        getPWSAssignments(),
      ]);
      setDevices(devicesRes.data);
      setStats(statsRes.data);
      const items = pwsItemsRes.data || [];
      setPwsItems({
        projects: items.filter(i => i.type === 'project'),
        workflows: items.filter(i => i.type === 'workflow'),
        stages: items.filter(i => i.type === 'stage'),
        processes: items.filter(i => i.type === 'process'),
      });
      setPwsAssignments(pwsAssignRes.data || []);
    } catch (err) {
      console.error("Failed to load device data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    fetchDeviceLogs();
    const interval = setInterval(fetchDeviceLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchDeviceLogs]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (pairingMode === 'camera' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          console.error("Camera error", err);
          setPairingMode('manual');
        });
    } else {
      stopCamera();
    }
  }, [pairingMode]);

  useEffect(() => {
    let interval;
    if (showModal && pairingMode === 'qr' && qrSessionId) {
      const shortId = qrSessionId.substring(0, 6).toUpperCase();
      interval = setInterval(async () => {
        try {
          const res = await getDevices();
          const found = res.data.find(d => d.name.includes(`Mobile Cam ${shortId}`));
          if (found) {
            await fetchData();
            fetchDeviceLogs();
            handleModalClose();
            alert('Mobile device paired successfully!');
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showModal, pairingMode, qrSessionId]);

  const handleModalClose = () => {
    setShowModal(false);
    setPairingMode('manual');
    setQrSessionId('');
    stopCamera();
    setLinkedProcesses([]);
    setNewDevice({ name: '', category: 'Sensor Arrays', subtype: '', interface: 'Wi-Fi', linked_process: '' });
  };

  const openQrMode = () => {
    const session = Math.random().toString(36).substring(2, 10);
    setQrSessionId(session);
    setPairingMode('qr');
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.name) return alert("Please enter a device name.");
    setIsSubmitting(true);
    try {
      const linkedLabel = linkedProcesses.map(p => p.label).join('; ');
      await createDevice({ ...newDevice, linked_process: linkedLabel || newDevice.linked_process });
      await fetchData();
      fetchDeviceLogs();
      handleModalClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create device.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDeviceSubmit = async (e) => {
    e.preventDefault();
    if (!editingDevice.name) return alert("Please enter a device name.");
    setIsSubmitting(true);
    try {
      const linkedLabel = editLinkedProcesses.map(p => p.label).join('; ');
      await updateDevice(editingDevice.id, { ...editingDevice, linked_process: linkedLabel || editingDevice.linked_process });
      await fetchData();
      fetchDeviceLogs();
      setEditingDevice(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update device.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      try {
        await deleteDevice(id);
        await fetchData();
        fetchDeviceLogs();
      } catch (err) {
        console.error(err);
        alert("Failed to delete device.");
      }
    }
    setOpenMenuId(null);
  };

  const handleAddNote = async (id) => {
    try {
      await addDeviceNote(id);
      await fetchData();
      fetchDeviceLogs();
      alert("Note added successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to add note.");
    }
    setOpenMenuId(null);
  };

  if (loading || !stats) {
    return <div className="p-8 flex items-center justify-center h-full"><Activity className="animate-spin text-blue-600" size={32} /></div>;
  }

  const uniqueProcesses = ['All', ...new Set(devices.map(d => d.linked_process).filter(Boolean))];
  const filteredDevices = devices.filter(d => {
    if (filterCategory !== 'All' && d.category !== filterCategory) return false;
    if (filterInterface !== 'All' && d.interface !== filterInterface) return false;
    if (filterStatus !== 'All' && d.status !== filterStatus) return false;
    if (filterProcess !== 'All' && d.linked_process !== filterProcess) return false;
    return true;
  });

  const ModalForm = ({ title, subtitle, icon, onSubmit, onClose, children, submitLabel }) => (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg relative border border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
          <div className="p-6">
            <h2 className="text-xl font-bold text-[#1a2b4b] mb-1 flex items-center gap-2 pr-8">
              {icon} {title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{subtitle}</p>
            <form onSubmit={onSubmit} className="space-y-4">
              {children}
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans -m-8 p-8">

      {/* Header */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Integrate Devices</h1>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-2">Connect, configure, calibrate, monitor and govern sensing, imaging, spectral, X-ray and analytical instruments across AIQ workflows.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 dark:[&_*]:text-inherit">
        <StatCard icon={<MonitorSmartphone size={24} className="text-white" />} iconBg="bg-blue-600" title="Total Devices" value={stats.top_cards.total_devices} sub={<span className="text-green-600 font-bold">{stats.top_cards.total_devices_trend}</span>} />
        <StatCard icon={<Wifi size={24} className="text-white" />} iconBg="bg-emerald-500" title="Online" value={stats.top_cards.online} sub={`${stats.top_cards.online_percentage}% of total`} />
        <StatCard icon={<Settings size={24} className="text-white" />} iconBg="bg-orange-400" title="Pending Setup" value={stats.top_cards.pending_setup} sub={`${stats.top_cards.pending_percentage}% of total`} stroke="#f97316" />
        <StatCard icon={<AlertTriangle size={24} className="text-white" />} iconBg="bg-purple-600" title="Calibration Due" value={stats.top_cards.calibration_due} sub={`${stats.top_cards.calibration_percentage}% of total`} stroke="#9333ea" />
        <StatCard icon={<AlertTriangle size={24} className="text-white" />} iconBg="bg-red-500" title="Data Sync Alerts" value={stats.top_cards.data_sync_alerts} sub={<span className="text-blue-600 hover:underline cursor-pointer">View all alerts →</span>} />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 md:gap-3 border-b border-gray-200 dark:border-gray-700 mb-6 text-[10px] lg:text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2 w-full justify-between overflow-hidden">
        {['All', 'Sensor Arrays', 'Cameras / Camera Arrays', 'Spectral', 'Ultrasonic / Acoustics', 'X-Ray', 'Analytical Instruments', 'Gateways & APIs'].map(cat => (
          <span
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`cursor-pointer px-2 py-1 md:py-1.5 rounded-md transition-colors whitespace-nowrap ${filterCategory === cat ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {cat === 'All' ? 'All Devices' : cat}
          </span>
        ))}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <CategoryCard title="Sensor Arrays" count={stats.categories["Sensor Arrays"].count} desc={stats.categories["Sensor Arrays"].desc} icon={<Database className="text-blue-600" />} />
        <CategoryCard title="Cameras / Camera Arrays" count={stats.categories["Cameras / Camera Arrays"].count} desc={stats.categories["Cameras / Camera Arrays"].desc} icon={<Camera className="text-[#1a2b4b]" />} />
        <CategoryCard title="Spectral" count={stats.categories["Spectral"].count} desc={stats.categories["Spectral"].desc} icon={<Activity className="text-purple-600" />} />
        <CategoryCard title="Ultrasonic / Acoustics" count={stats.categories["Ultrasonic / Acoustics"].count} desc={stats.categories["Ultrasonic / Acoustics"].desc} icon={<Radio className="text-indigo-800" />} />
        <CategoryCard title="X-Ray" count={stats.categories["X-Ray"].count} desc={stats.categories["X-Ray"].desc} icon={<Zap className="text-gray-800 dark:text-gray-200" />} />
        <CategoryCard title="Analytical Instruments" count={stats.categories["Analytical Instruments"].count} desc={stats.categories["Analytical Instruments"].desc} icon={<FileText className="text-[#1a2b4b]" />} />
        <CategoryCard title="Gateways & APIs" count={stats.categories["Gateways & APIs"].count} desc={stats.categories["Gateways & APIs"].desc} icon={<Globe className="text-blue-500" />} />
      </div>

      {/* Process-Aware Data Flow */}
      <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Process-Aware Data Flow</h2>
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 w-full">
            <FlowBlock icon={<MonitorSmartphone className="text-blue-700 dark:text-blue-400" size={22} />} title="Devices" desc="Sensing, Imaging" />
            <ArrowRight className="text-blue-300 dark:text-blue-700 shrink-0" size={18} />
            <FlowBlock icon={<Server className="text-blue-600 dark:text-blue-400" size={22} />} title="Edge Gateway" desc="Collect, Transmit" />
            <ArrowRight className="text-blue-300 dark:text-blue-700 shrink-0" size={18} />
            <FlowBlock icon={<Globe className="text-blue-400" size={22} />} title="AIQ Cloud" desc="Store, Orchestrate" />
            <ArrowRight className="text-blue-300 dark:text-blue-700 shrink-0" size={18} />
            <FlowBlock icon={<Cpu className="text-purple-600 dark:text-purple-400" size={22} />} title="AI Analytics" desc="Predict, Classify" />
            <ArrowRight className="text-blue-300 dark:text-blue-700 shrink-0" size={18} />
            <FlowBlock icon={<FileText className="text-emerald-600 dark:text-emerald-400" size={22} />} title="Quality Report" desc="Insights, Alerts" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 min-h-[400px] flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Connected Devices at Process Level</h2>
            <div className="flex gap-2 text-[10px] md:text-xs text-blue-600 overflow-x-auto whitespace-nowrap">
              <span className="text-blue-600 dark:text-blue-400">Project <ArrowRight size={10} className="inline mx-1" /> Workflow <ArrowRight size={10} className="inline mx-1" /> Stage <ArrowRight size={10} className="inline mx-1" /> Process <ArrowRight size={10} className="inline mx-1" /> Quality Notes + Devices Integrated</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex flex-wrap md:flex-nowrap gap-2 md:gap-4 mb-4">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 truncate">
              <option value="All">All Categories</option>
              <option value="Sensor Arrays">Sensor Arrays</option>
              <option value="Cameras / Camera Arrays">Cameras</option>
              <option value="Spectral">Spectral</option>
              <option value="Ultrasonic / Acoustics">Ultrasonic</option>
              <option value="X-Ray">X-Ray</option>
              <option value="Analytical Instruments">Analytical Instruments</option>
            </select>
            <select value={filterInterface} onChange={(e) => setFilterInterface(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 truncate">
              <option value="All">All Interfaces</option>
              <option value="Wi-Fi">Wi-Fi</option>
              <option value="Ethernet">Ethernet</option>
              <option value="BLE">BLE</option>
              <option value="USB">USB</option>
              <option value="REST API">REST API</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 truncate">
              <option value="All">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            <select value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 truncate">
              {uniqueProcesses.map(p => <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>)}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs md:text-sm font-semibold flex items-center justify-center gap-1 hover:bg-blue-700 w-full md:w-auto shadow-sm transition-colors col-span-2 md:col-span-1"
            >
              <Plus size={14} /> Add Device
            </button>
          </div>

          <div className="overflow-x-visible border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-left text-[10px] xl:text-[11px] text-gray-600 dark:text-gray-400 table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-[10px] xl:text-xs leading-tight">
                <tr>
                  <th className="px-1 py-2 lg:px-2 w-[15%]">Device Name</th>
                  <th className="px-1 py-2 lg:px-2 w-[12%]">Category</th>
                  <th className="px-1 py-2 lg:px-2 w-[10%]">Interface</th>
                  <th className="px-1 py-2 lg:px-2 w-[8%]">Status</th>
                  <th className="px-1 py-2 lg:px-2 w-[15%]">Linked Process</th>
                  <th className="px-1 py-2 lg:px-2 w-[10%]">Quality Notes</th>
                  <th className="px-1 py-2 lg:px-2 w-[10%]">Last Sync</th>
                  <th className="px-1 py-2 lg:px-2 w-[12%]">Calibration</th>
                  <th className="px-1 py-2 lg:px-2 w-[8%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredDevices.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <td className="px-1 py-2 lg:px-2 font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 truncate">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                      <span className="truncate">{d.name}</span>
                    </td>
                    <td className="px-1 py-2 lg:px-2 truncate">{d.category}</td>
                    <td className="px-1 py-2 lg:px-2 flex items-center gap-1 truncate">
                      {d.interface === 'Wi-Fi' && <Wifi size={12} />}
                      {d.interface === 'Ethernet' && <Cpu size={12} />}
                      {d.interface === 'USB' && <Usb size={12} />}
                      {d.interface}
                    </td>
                    <td className="px-1 py-2 lg:px-2">
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div> {d.status}
                      </span>
                    </td>
                    <td className="px-1 py-2 lg:px-2 text-gray-800 dark:text-gray-200 truncate">{d.linked_process}</td>
                    <td className="px-1 py-2 lg:px-2 text-blue-600 dark:text-blue-400 font-medium truncate">{d.quality_notes_count > 0 ? `${d.quality_notes_count} notes` : 'N/A'}</td>
                    <td className="px-1 py-2 lg:px-2 text-gray-500 dark:text-gray-400 truncate">{d.last_sync_mins_ago} min ago</td>
                    <td className="px-1 py-2 lg:px-2 text-green-600 truncate">{d.calibration_due_days ? `Due in ${d.calibration_due_days} days` : 'N/A'}</td>
                    <td className="px-1 py-2 lg:px-2 text-gray-400 dark:text-gray-500 text-center relative">
                      <button onClick={() => setOpenMenuId(openMenuId === i ? null : i)} className="hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <MoreHorizontal size={16} className="mx-auto" />
                      </button>
                      {openMenuId === i && (
                        <div className="absolute right-8 top-8 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 text-left overflow-hidden">
                          <button onClick={() => { setEditingDevice(d); setEditLinkedProcesses(d.linked_process ? d.linked_process.split('; ').filter(Boolean).map((l, i) => ({ id: `existing-${i}`, label: l })) : []); setOpenMenuId(null); }} className="w-full px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left font-medium transition-colors">Edit Device</button>
                          <button onClick={() => handleAddNote(d.id)} className="w-full px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left font-medium transition-colors">Add Note</button>
                          <button onClick={() => handleDeleteDevice(d.id)} className="w-full px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left font-medium transition-colors">Delete Device</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredDevices.length === 0 && (
                  <tr><td colSpan="9" className="px-2 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No devices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monitoring & Health + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-3 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Monitoring & Instrument Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50/30 dark:bg-gray-800/30">
            <MetricBlock title="Signal Quality" value={`${stats.monitoring.signal_quality.value}%`} label={stats.monitoring.signal_quality.label} labelColor="text-green-600" />
            <MetricBlock title="Device Health" value={`${stats.monitoring.device_health.value}%`} label={stats.monitoring.device_health.label} labelColor="text-green-600" />
            <MetricBlock title="Temperature" value={`${stats.monitoring.temperature.value}°C`} label={stats.monitoring.temperature.label} labelColor="text-blue-500" />
            <MetricBlock title="Humidity" value={`${stats.monitoring.humidity.value}%`} label={stats.monitoring.humidity.label} labelColor="text-blue-500" />
            <MetricBlock title="Power/Battery" value={`${stats.monitoring.power_battery.value}%`} label={stats.monitoring.power_battery.label} labelColor="text-green-600" />
            <MetricBlock title="Uptime" value={`${stats.monitoring.uptime.value}%`} label={stats.monitoring.uptime.label} labelColor="text-gray-500 dark:text-gray-400" />
            <div className="flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 rounded bg-white dark:bg-gray-800 p-2 text-center w-full min-w-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Calibration Status</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.monitoring.calibration_status.due} / {stats.monitoring.calibration_status.total}</span>
              <div className="h-10 w-10 mt-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: stats.monitoring.calibration_status.due }, { value: Math.max(stats.monitoring.calibration_status.total - stats.monitoring.calibration_status.due, 0) }]} innerRadius={12} outerRadius={18} dataKey="value" stroke="none">
                      <Cell fill="#ef4444" />
                      <Cell fill="#6366f1" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 rounded bg-white dark:bg-gray-800 p-2 text-center w-full min-w-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Data Throughput</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.monitoring.data_throughput.value} {stats.monitoring.data_throughput.unit}</span>
              <span className="text-[10px] text-blue-600 font-bold mb-1">{stats.monitoring.data_throughput.label}</span>
              <div className="h-6 w-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ v: stats.monitoring.data_throughput.value }]}>
                    <Bar dataKey="v" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ScrollText size={18} className="text-blue-600" /> Device Logs
            </h2>
            <button onClick={fetchDeviceLogs} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Refresh">
              <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="space-y-3 flex-1">
            {logsLoading && deviceLogs.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-blue-600" size={22} />
              </div>
            ) : deviceLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs font-semibold">
                <ScrollText size={28} className="mx-auto mb-2 opacity-30" />
                No device activity logged yet.
              </div>
            ) : (
              deviceLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-800">
                  <div className="mt-0.5 shrink-0">
                    {log.severity === 'error' ? <AlertTriangle size={14} className="text-red-500" />
                      : log.severity === 'warning' ? <AlertTriangle size={14} className="text-amber-500" />
                        : log.severity === 'success' ? <CheckCircle size={14} className="text-emerald-500" />
                          : <Info size={14} className="text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs truncate">{log.entity_name || log.action}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] truncate">{log.description || log.action}</p>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 text-[9px] whitespace-nowrap mt-0.5 shrink-0">{formatRelativeTime(log.timestamp)}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 text-center">
            <RouterLink to="/monitoring/logs?category=device" className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full w-full block">
              View all device logs
            </RouterLink>
          </div>
        </div>
      </div>


      {/* ── Add Device Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) handleModalClose(); }}
        >
          <div className="min-h-full flex items-center justify-center p-4 py-10">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg relative border border-gray-200 dark:border-gray-700">
              <button onClick={handleModalClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors">
                <X size={18} />
              </button>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2 pr-8">
                  <Plus size={20} className="text-blue-600" /> Add Device to Process
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Register a new instrument or connect via live stream.</p>

                <form onSubmit={handleAddDevice} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Device Name</label>
                    <input type="text" value={newDevice.name} onChange={e => setNewDevice({ ...newDevice, name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" placeholder="e.g. VisionCam Array-03" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select value={newDevice.category} onChange={e => setNewDevice({ ...newDevice, category: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <option>Sensor Arrays</option>
                        <option>Cameras / Camera Arrays</option>
                        <option>Spectral</option>
                        <option>Ultrasonic / Acoustics</option>
                        <option>X-Ray</option>
                        <option>Analytical Instruments</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subtype</label>
                      <input type="text" value={newDevice.subtype} onChange={e => setNewDevice({ ...newDevice, subtype: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" placeholder="e.g. Visual, Thermal..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Interface</label>
                    <select value={newDevice.interface} onChange={e => setNewDevice({ ...newDevice, interface: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option>Wi-Fi</option>
                      <option>Ethernet</option>
                      <option>BLE</option>
                      <option>USB</option>
                      <option>REST API</option>
                    </select>
                  </div>

                  <ProcessLinkerPicker
                    pwsItems={pwsItems}
                    pwsAssignments={pwsAssignments}
                    selected={linkedProcesses}
                    onChange={setLinkedProcesses}
                  />

                  {/* Live Device Pairing */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Live Device Pairing (Optional)</label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setPairingMode(pairingMode === 'camera' ? 'manual' : 'camera')} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                          <Video size={14} /> {pairingMode === 'camera' ? 'Stop Camera' : 'Use Webcam'}
                        </button>
                        <button type="button" onClick={() => setPairingMode(pairingMode === 'api' ? 'manual' : 'api')} className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline">
                          <Key size={14} /> {pairingMode === 'api' ? 'Cancel API' : 'Generate API Key'}
                        </button>
                      </div>
                    </div>

                    {pairingMode === 'camera' && (
                      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                        </div>
                        <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 rounded pointer-events-none"></div>
                      </div>
                    )}

                    {pairingMode === 'api' && (
                      <div className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1 flex items-center gap-2"><Key size={16} className="text-green-600" /> Headless API Integration</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Use these credentials to push data from PLCs, X-Ray machines, or analytical instruments directly into the AIQ pipeline.</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Endpoint URL</label>
                            <div className="flex">
                              <input readOnly value="https://api.aiq.app/v1/devices/ingest" className="w-full bg-gray-200 dark:bg-gray-700 border-y border-l border-gray-300 dark:border-gray-600 rounded-l px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-mono outline-none" />
                              <button type="button" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 border border-gray-300 dark:border-gray-600 rounded-r transition-colors"><Copy size={12} className="text-gray-600 dark:text-gray-400" /></button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Authorization Token</label>
                            <div className="flex">
                              <input readOnly value={`sk_test_${Math.random().toString(36).substring(2, 15)}`} className="w-full bg-gray-200 dark:bg-gray-700 border-y border-l border-gray-300 dark:border-gray-600 rounded-l px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-mono outline-none" />
                              <button type="button" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 border border-gray-300 dark:border-gray-600 rounded-r transition-colors"><Copy size={12} className="text-gray-600 dark:text-gray-400" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {pairingMode === 'manual' && (
                      <div className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs flex-col gap-1">
                        <Settings size={24} />
                        <span>Select an integration method above to pair</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleModalClose} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? <Activity size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                      {isSubmitting ? 'Connecting...' : 'Connect Device'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Device Modal ── */}
      {editingDevice && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingDevice(null); }}
        >
          <div className="min-h-full flex items-center justify-center p-4 py-10">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg relative border border-gray-200 dark:border-gray-700">
              <button onClick={() => setEditingDevice(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors">
                <X size={18} />
              </button>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2 pr-8">
                  <Settings size={20} className="text-blue-600" /> Edit Device
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Update configuration for {editingDevice.name}.</p>

                <form onSubmit={handleEditDeviceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Device Name</label>
                    <input type="text" required value={editingDevice.name} onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" placeholder="e.g. VisionCam Array-03" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select value={editingDevice.category} onChange={e => setEditingDevice({ ...editingDevice, category: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <option>Sensor Arrays</option>
                        <option>Cameras / Camera Arrays</option>
                        <option>Spectral</option>
                        <option>Ultrasonic / Acoustics</option>
                        <option>X-Ray</option>
                        <option>Analytical Instruments</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subtype</label>
                      <input type="text" value={editingDevice.subtype} onChange={e => setEditingDevice({ ...editingDevice, subtype: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" placeholder="e.g. Visual, Thermal..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Interface</label>
                    <select value={editingDevice.interface} onChange={e => setEditingDevice({ ...editingDevice, interface: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option>Wi-Fi</option>
                      <option>Ethernet</option>
                      <option>BLE</option>
                      <option>USB</option>
                      <option>REST API</option>
                    </select>
                  </div>

                  <ProcessLinkerPicker
                    pwsItems={pwsItems}
                    pwsAssignments={pwsAssignments}
                    selected={editLinkedProcesses}
                    onChange={setEditLinkedProcesses}
                  />

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditingDevice(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? <Activity size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ProcessLinkerPicker ───────────────────────────────────────────────────────

function ProcessLinkerPicker({ pwsItems, pwsAssignments, selected, onChange }) {
  const [step, setStep] = useState(null);
  const [pickedProject, setPickedProject] = useState(null);
  const [pickedWorkflow, setPickedWorkflow] = useState(null);
  const [pickedStage, setPickedStage] = useState(null);
  const [open, setOpen] = useState(false);

  // Flatten ALL items into one list for type-aware lookups (same pattern as CreatePWS)
  const allItems = React.useMemo(() => [
    ...(pwsItems.projects || []),
    ...(pwsItems.workflows || []),
    ...(pwsItems.stages || []),
    ...(pwsItems.processes || []),
  ], [pwsItems]);

  // Resolve children of a parent node by type — filters by both assignment AND item.type
  const getChildren = React.useCallback((parentId, childType) => {
    const childIds = (pwsAssignments || [])
      .filter(a => a.parent_id === parentId)
      .map(a => a.child_id);
    return allItems.filter(i => i.type === childType && childIds.includes(i.id));
  }, [allItems, pwsAssignments]);

  const projects = pwsItems.projects || [];
  const workflows = React.useMemo(() => pickedProject ? getChildren(pickedProject.id, 'workflow') : [], [pickedProject, getChildren]);
  const stages = React.useMemo(() => pickedWorkflow ? getChildren(pickedWorkflow.id, 'stage') : [], [pickedWorkflow, getChildren]);
  const processes = React.useMemo(() => pickedStage ? getChildren(pickedStage.id, 'process') : [], [pickedStage, getChildren]);

  const toggleProcess = (proc) => {
    const label = `${pickedProject?.name} → ${pickedWorkflow?.name} → ${pickedStage?.name} → ${proc.name}`;
    const id = `${pickedProject?.id}-${pickedWorkflow?.id}-${pickedStage?.id}-${proc.id}`;
    const already = selected.find(s => s.id === id);
    if (already) {
      onChange(selected.filter(s => s.id !== id));
    } else {
      onChange([...selected, { id, label, processId: proc.id, stageId: pickedStage?.id, workflowId: pickedWorkflow?.id, projectId: pickedProject?.id }]);
    }
  };

  const removeSelected = (id) => onChange(selected.filter(s => s.id !== id));

  const reset = () => {
    setPickedProject(null);
    setPickedWorkflow(null);
    setPickedStage(null);
    setStep('project');
  };

  const STEPS = ['project', 'workflow', 'stage', 'process'];
  const stepIndex = STEPS.indexOf(step);

  const StepIcon = ({ s }) => {
    const icons = { project: Layers, workflow: GitBranch, stage: GitCommit, process: Tag };
    const Icon = icons[s];
    return <Icon size={12} />;
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Linked Processes
      </label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-1 rounded-full max-w-full">
              <Tag size={9} className="shrink-0" />
              <span className="truncate max-w-[200px]" title={s.label}>{s.label}</span>
              <button type="button" onClick={() => removeSelected(s.id)} className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors shrink-0">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Picker trigger */}
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); reset(); }}
          className="w-full flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all font-medium"
        >
          <Plus size={13} />
          {selected.length === 0 ? 'Link a process...' : 'Link another process...'}
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">

          {/* Breadcrumb stepper */}
          <div className="flex items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 gap-1 text-[10px] font-bold overflow-x-auto">
            {['Project', 'Workflow', 'Stage', 'Process'].map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <ChevronRight size={10} className="text-gray-300 dark:text-gray-600 shrink-0" />}
                <span className={clsx(
                  'px-2 py-0.5 rounded whitespace-nowrap transition-colors',
                  stepIndex === i
                    ? 'bg-blue-600 text-white'
                    : stepIndex > i
                      ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline'
                      : 'text-gray-400 dark:text-gray-500'
                )}
                  onClick={() => {
                    if (stepIndex > i) {
                      if (i === 0) { setPickedProject(null); setPickedWorkflow(null); setPickedStage(null); setStep('project'); }
                      if (i === 1) { setPickedWorkflow(null); setPickedStage(null); setStep('workflow'); }
                      if (i === 2) { setPickedStage(null); setStep('stage'); }
                    }
                  }}
                >
                  {stepIndex > i
                    ? (i === 0 ? pickedProject?.name : i === 1 ? pickedWorkflow?.name : i === 2 ? pickedStage?.name : label)
                    : label}
                </span>
              </React.Fragment>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <X size={12} />
            </button>
          </div>

          {/* Step content */}
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {step === 'project' && (
              projects.length === 0
                ? <EmptyStep label="No projects found. Create one in the Projects tab first." />
                : projects.map(p => (
                  <PickerRow key={p.id} label={p.name} icon={<Layers size={13} className="text-blue-500" />}
                    onClick={() => { setPickedProject(p); setStep('workflow'); }} hasChildren />
                ))
            )}

            {step === 'workflow' && (
              workflows.length === 0
                ? <EmptyStep label="No workflows linked to this project." />
                : workflows.map(w => (
                  <PickerRow key={w.id} label={w.name} icon={<GitBranch size={13} className="text-indigo-500" />}
                    onClick={() => { setPickedWorkflow(w); setStep('stage'); }} hasChildren />
                ))
            )}

            {step === 'stage' && (
              stages.length === 0
                ? <EmptyStep label="No stages linked to this workflow." />
                : stages.map(s => (
                  <PickerRow key={s.id} label={s.name} icon={<GitCommit size={13} className="text-emerald-500" />}
                    onClick={() => { setPickedStage(s); setStep('process'); }} hasChildren />
                ))
            )}

            {step === 'process' && (
              processes.length === 0
                ? <EmptyStep label="No processes linked to this stage." />
                : processes.map(proc => {
                  const id = `${pickedProject?.id}-${pickedWorkflow?.id}-${pickedStage?.id}-${proc.id}`;
                  const isSelected = selected.some(s => s.id === id);
                  return (
                    <PickerRow key={proc.id} label={proc.name} icon={<Tag size={13} className="text-violet-500" />}
                      onClick={() => toggleProcess(proc)}
                      isCheckable
                      isChecked={isSelected}
                    />
                  );
                })
            )}
          </div>

          {/* Footer */}
          {step === 'process' && processes.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Select one or more processes</span>
              <div className="flex gap-2">
                <button type="button" onClick={reset} className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  ← Back to projects
                </button>
                <button type="button" onClick={() => setOpen(false)} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickerRow({ label, icon, onClick, hasChildren, isCheckable, isChecked }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20",
        isChecked && "bg-blue-50 dark:bg-blue-900/20"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{label}</span>
      {isCheckable && (
        <span className={clsx(
          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
          isChecked
            ? "bg-blue-600 border-blue-600"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        )}>
          {isChecked && <Check size={10} className="text-white" />}
        </span>
      )}
      {hasChildren && <ChevronRight size={13} className="text-gray-400 shrink-0" />}
    </button>
  );
}

function EmptyStep({ label }) {
  return (
    <div className="px-4 py-6 text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
      {label}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, title, value, sub, chartData, stroke }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 lg:p-4 shadow-sm flex flex-row lg:flex-col xl:flex-row items-center lg:items-start xl:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] lg:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-xl lg:text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-none lg:leading-tight">{value}</p>
          <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">{sub}</div>
        </div>
      </div>
      {chartData && (
        <div className="h-8 w-12 lg:h-10 lg:w-16 opacity-70 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function CategoryCard({ icon, title, count, desc }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm text-left flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded shrink-0">{icon}</div>
        <p className="text-xl font-bold text-blue-600">{count}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{title}</p>
        <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">{desc}</p>
      </div>
    </div>
  )
}

function FlowStep({ num, title, active }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[60px] md:max-w-[80px] relative z-10 bg-gray-50 dark:bg-gray-900 px-1">
      <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1.5", active ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>
        {num}
      </div>
      <p className={clsx("text-[9px] md:text-[10px] font-bold mb-0.5 leading-tight", active ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400")}>{title}</p>
    </div>
  )
}

function InterfaceCard({ icon, name, status, color }) {
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded p-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{name}</p>
        <p className={clsx("text-[9px] font-semibold", color)}>{status}</p>
      </div>
    </div>
  )
}

function MetricBlock({ title, value, label, labelColor }) {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700 w-full min-w-0">
      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">{title}</span>
      <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</span>
      <span className={clsx("text-[10px] font-bold", labelColor)}>{label}</span>
      <div className="w-full mt-1.5 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: title === 'Temperature' ? '50%' : '80%' }}></div>
      </div>
    </div>
  )
}

function FlowBlock({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-100 dark:border-blue-900/40 shadow-sm flex-1">
      <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0 border border-blue-100 dark:border-blue-900/40">{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight line-clamp-1">{desc}</p>
      </div>
    </div>
  )
}