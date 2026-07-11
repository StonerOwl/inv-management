import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Settings, CheckCircle,
  Wifi, Bluetooth, Usb, Cpu, Database, Activity, ArrowRight,
  MonitorSmartphone, Radio, ChevronDown, Plus, Link as LinkIcon,
  Camera, Zap, Share2, Server, Globe, FileText, Check, MoreHorizontal,
  X, Video, Smartphone, Key, Copy
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import { getDevices, getDeviceStats, createDevice, updateDevice, deleteDevice, addDeviceNote } from '../api/client';
import clsx from 'clsx';

export default function IntegrateDevices() {
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal & Camera State
  const [showModal, setShowModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', category: 'Sensor Arrays', subtype: '', interface: 'Wi-Fi', linked_process: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairingMode, setPairingMode] = useState('manual'); // 'manual', 'camera', 'qr'
  const [qrSessionId, setQrSessionId] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterInterface, setFilterInterface] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProcess, setFilterProcess] = useState('All');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchData = async () => {
    try {
      const [devicesRes, statsRes] = await Promise.all([
        getDevices(),
        getDeviceStats()
      ]);
      setDevices(devicesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load device data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera error", err);
          setPairingMode('manual');
        });
    } else {
      stopCamera();
    }
  }, [pairingMode]);

  // Polling for QR Code Pairing
  useEffect(() => {
    let interval;
    if (showModal && pairingMode === 'qr' && qrSessionId) {
      const shortId = qrSessionId.substring(0, 6).toUpperCase();
      interval = setInterval(async () => {
        try {
          const res = await getDevices();
          const found = res.data.find(d => d.name.includes(`Mobile Cam ${shortId}`));
          if (found) {
            // Found it! Mobile device paired successfully.
            await fetchData();
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
      await createDevice(newDevice);
      await fetchData();
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
      await updateDevice(editingDevice.id, editingDevice);
      await fetchData();
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 font-sans">

      {/* Header - Simplified */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a2b4b]">Integrate Devices</h1>
        <p className="text-sm text-slate-500 mt-1">Connect, configure, calibrate, monitor and govern sensing, imaging, spectral, X-ray and analytical instruments across AIQ workflows.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={<MonitorSmartphone size={24} className="text-white" />}
          iconBg="bg-blue-600"
          title="Total Devices"
          value={stats.top_cards.total_devices}
          sub={<span className="text-green-600 font-bold">{stats.top_cards.total_devices_trend}</span>}
        />
        <StatCard
          icon={<Wifi size={24} className="text-white" />}
          iconBg="bg-emerald-500"
          title="Online"
          value={stats.top_cards.online}
          sub={`${stats.top_cards.online_percentage}% of total`}
        />
        <StatCard
          icon={<Settings size={24} className="text-white" />}
          iconBg="bg-orange-400"
          title="Pending Setup"
          value={stats.top_cards.pending_setup}
          sub={`${stats.top_cards.pending_percentage}% of total`}
          chartData={null} stroke="#f97316"
        />
        <StatCard
          icon={<AlertTriangle size={24} className="text-white" />}
          iconBg="bg-purple-600"
          title="Calibration Due"
          value={stats.top_cards.calibration_due}
          sub={`${stats.top_cards.calibration_percentage}% of total`}
          chartData={null} stroke="#9333ea"
        />
        <StatCard
          icon={<AlertTriangle size={24} className="text-white" />}
          iconBg="bg-red-500"
          title="Data Sync Alerts"
          value={stats.top_cards.data_sync_alerts}
          sub={<span className="text-blue-600 hover:underline cursor-pointer">View all alerts →</span>}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 md:gap-3 border-b border-slate-200 mb-6 text-[10px] lg:text-xs font-semibold text-slate-600 pb-2 w-full justify-between overflow-hidden">
        {['All', 'Sensor Arrays', 'Cameras / Camera Arrays', 'Spectral', 'Ultrasonic / Acoustics', 'X-Ray', 'Analytical Instruments', 'Gateways & APIs'].map(cat => (
          <span
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`cursor-pointer px-2 py-1 md:py-1.5 rounded-md transition-colors whitespace-nowrap ${filterCategory === cat ? 'bg-blue-600 text-white' : 'hover:text-blue-600'}`}
          >
            {cat === 'All' ? 'All Devices' : cat}
          </span>
        ))}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <CategoryCard title="Sensor Arrays" count={stats.categories["Sensor Arrays"].count} desc={stats.categories["Sensor Arrays"].desc} icon={<Database className="text-blue-600" />} />
        <CategoryCard title="Cameras / Camera Arrays" count={stats.categories["Cameras / Camera Arrays"].count} desc={stats.categories["Cameras / Camera Arrays"].desc} icon={<Camera className="text-[#1a2b4b]" />} />
        <CategoryCard title="Spectral" count={stats.categories["Spectral"].count} desc={stats.categories["Spectral"].desc} icon={<Activity className="text-purple-600" />} />
        <CategoryCard title="Ultrasonic / Acoustics" count={stats.categories["Ultrasonic / Acoustics"].count} desc={stats.categories["Ultrasonic / Acoustics"].desc} icon={<Radio className="text-indigo-800" />} />
        <CategoryCard title="X-Ray" count={stats.categories["X-Ray"].count} desc={stats.categories["X-Ray"].desc} icon={<Zap className="text-slate-800" />} />
        <CategoryCard title="Analytical Instruments" count={stats.categories["Analytical Instruments"].count} desc={stats.categories["Analytical Instruments"].desc} icon={<FileText className="text-[#1a2b4b]" />} />
        <CategoryCard title="Gateways & APIs" count={stats.categories["Gateways & APIs"].count} desc={stats.categories["Gateways & APIs"].desc} icon={<Globe className="text-blue-500" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {/* Onboarding Flow */}
        <div className="xl:col-span-3 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1a2b4b] mb-4">Onboarding & Integration Flow</h2>
          <div className="flex items-start justify-between relative w-full pt-2">
            <div className="absolute top-3 left-4 right-4 h-0.5 bg-blue-200/50 -z-10"></div>
            <FlowStep num={1} title="Register" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={2} title="Category" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={3} title="Interface" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={4} title="Configure" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={5} title="Process" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={6} title="Validate" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={7} title="Calibrate" active />
            <ArrowRight className="text-blue-200 mt-1.5 shrink-0 hidden sm:block" size={16} />
            <FlowStep num={8} title="Activate" active />
          </div>
        </div>

        {/* Interfaces */}
        <div className="xl:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1a2b4b] mb-4">Interfaces & Connectivity</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.interfaces).map(([name, status]) => {
              const iconMap = { 'Wi-Fi': <Wifi className="text-blue-500" />, 'Ethernet': <Cpu className="text-blue-500" />, 'BLE': <Bluetooth className="text-blue-500" />, 'USB': <Usb className="text-slate-600" />, 'REST API': <Globe className="text-blue-400" /> };
              return <InterfaceCard key={name} icon={iconMap[name] || <Radio className="text-orange-500" />} name={name} status={status} color="text-green-600" />;
            })}
            {Object.keys(stats.interfaces).length === 0 && <p className="text-xs text-slate-400 col-span-2 text-center py-4">No interfaces connected yet</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {/* Main Table */}
        <div className="xl:col-span-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-bold text-[#1a2b4b]">Connected Devices at Process Level</h2>
            <div className="flex gap-2 text-[10px] md:text-xs text-blue-600 overflow-x-auto whitespace-nowrap">
              <span>Project <ArrowRight size={10} className="inline mx-1" /> Workflow <ArrowRight size={10} className="inline mx-1" /> Stage <ArrowRight size={10} className="inline mx-1" /> Process <ArrowRight size={10} className="inline mx-1" /> Quality Notes + Devices Integrated</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex flex-wrap md:flex-nowrap gap-2 md:gap-4 mb-4">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white truncate">
              <option value="All">All Categories</option>
              <option value="Sensor Arrays">Sensor Arrays</option>
              <option value="Cameras / Camera Arrays">Cameras</option>
              <option value="Spectral">Spectral</option>
              <option value="Ultrasonic / Acoustics">Ultrasonic</option>
              <option value="X-Ray">X-Ray</option>
              <option value="Analytical Instruments">Analytical Instruments</option>
            </select>
            <select value={filterInterface} onChange={(e) => setFilterInterface(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white truncate">
              <option value="All">All Interfaces</option>
              <option value="Wi-Fi">Wi-Fi</option>
              <option value="Ethernet">Ethernet</option>
              <option value="BLE">BLE</option>
              <option value="USB">USB</option>
              <option value="REST API">REST API</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white truncate">
              <option value="All">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            <select value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs md:text-sm flex-1 bg-white truncate">
              {uniqueProcesses.map(p => <option key={p} value={p}>{p === 'All' ? 'All Processes' : p}</option>)}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs md:text-sm font-semibold flex items-center justify-center gap-1 hover:bg-blue-700 w-full md:w-auto shadow-sm transition-colors col-span-2 md:col-span-1"
            >
              <Plus size={14} /> Add Device
            </button>
          </div>

          <div className="overflow-x-visible border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[10px] xl:text-[11px] text-slate-600 table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] xl:text-xs leading-tight">
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
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-1 py-2 lg:px-2 font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div> <span className="truncate">{d.name}</span>
                    </td>
                    <td className="px-1 py-2 lg:px-2 truncate">{d.category}</td>
                    <td className="px-1 py-2 lg:px-2 flex items-center gap-1 truncate">
                      {d.interface === 'Wi-Fi' && <Wifi size={12} />}
                      {d.interface === 'Ethernet' && <Cpu size={12} />}
                      {d.interface === 'USB' && <Usb size={12} />}
                      {d.interface}
                    </td>
                    <td className="px-1 py-2 lg:px-2">
                      <span className="flex items-center gap-1 text-green-600 font-semibold"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div> {d.status}</span>
                    </td>
                    <td className="px-1 py-2 lg:px-2 text-slate-800 truncate">{d.linked_process}</td>
                    <td className="px-1 py-2 lg:px-2 text-blue-600 font-medium truncate">{d.quality_notes_count > 0 ? `${d.quality_notes_count} notes` : 'N/A'}</td>
                    <td className="px-1 py-2 lg:px-2 text-slate-500 truncate">{d.last_sync_mins_ago} min ago</td>
                    <td className="px-1 py-2 lg:px-2 text-green-600 truncate">{d.calibration_due_days ? `Due in ${d.calibration_due_days} days` : 'N/A'}</td>
                    <td className="px-1 py-2 lg:px-2 text-slate-400 text-center relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === i ? null : i)}
                        className="hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal size={16} className="mx-auto" />
                      </button>

                      {openMenuId === i && (
                        <div className="absolute right-8 top-8 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 text-left overflow-hidden">
                          <button onClick={() => { setEditingDevice(d); setOpenMenuId(null); }} className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-medium transition-colors">Edit Device</button>
                          <button onClick={() => handleAddNote(d.id)} className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-medium transition-colors">Add Note</button>
                          <button onClick={() => handleDeleteDevice(d.id)} className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left font-medium transition-colors">Delete Device</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-2 py-8 text-center text-slate-400 text-sm">No devices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {/* Monitoring & Health */}
        <div className="xl:col-span-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1a2b4b] mb-4">Monitoring & Instrument Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 border border-slate-100 rounded-lg p-4 bg-slate-50/30">
            <MetricBlock title="Signal Quality" value={`${stats.monitoring.signal_quality.value}%`} label={stats.monitoring.signal_quality.label} labelColor="text-green-600" />
            <MetricBlock title="Device Health" value={`${stats.monitoring.device_health.value}%`} label={stats.monitoring.device_health.label} labelColor="text-green-600" />
            <MetricBlock title="Temperature" value={`${stats.monitoring.temperature.value}°C`} label={stats.monitoring.temperature.label} labelColor="text-blue-500" />
            <MetricBlock title="Humidity" value={`${stats.monitoring.humidity.value}%`} label={stats.monitoring.humidity.label} labelColor="text-blue-500" />
            <MetricBlock title="Power/Battery" value={`${stats.monitoring.power_battery.value}%`} label={stats.monitoring.power_battery.label} labelColor="text-green-600" />
            <MetricBlock title="Uptime" value={`${stats.monitoring.uptime.value}%`} label={stats.monitoring.uptime.label} labelColor="text-slate-500" />

            <div className="flex flex-col items-center justify-center border border-slate-100 rounded bg-white p-2 text-center w-full min-w-0">
              <span className="text-xs font-semibold text-slate-500">Calibration Status</span>
              <span className="text-lg font-bold text-slate-800">{stats.monitoring.calibration_status.due} / {stats.monitoring.calibration_status.total}</span>
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

            <div className="flex flex-col items-center justify-center border border-slate-100 rounded bg-white p-2 text-center w-full min-w-0">
              <span className="text-xs font-semibold text-slate-500">Data Throughput</span>
              <span className="text-lg font-bold text-slate-800">{stats.monitoring.data_throughput.value} {stats.monitoring.data_throughput.unit}</span>
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

        {/* Alerts & Events */}
        <div className="xl:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1a2b4b]">Alerts & Events</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{stats.alerts.reduce((acc, a) => acc + a.count, 0)} alerts</span>
          </div>
          <div className="space-y-3">
            {stats.alerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={a.severity === 'High' ? 'text-red-500' : 'text-amber-500'} />
                  <span className="font-semibold text-slate-700 text-xs">{a.type}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-slate-500 text-[10px]">{a.count} dev</span>
                  <span className="text-slate-400 text-[9px]">{a.time_ago}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-blue-600 text-xs font-semibold hover:underline bg-blue-50 px-3 py-1.5 rounded-full w-full">View all alerts</button>
          </div>
        </div>
      </div>

      {/* Bottom Flow - Layout Fixed */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-[#1a2b4b] mb-4">Process-Aware Data Flow</h2>
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 overflow-x-auto scrollbar-hide">
          <div className="flex flex-nowrap items-center min-w-[800px] gap-2 md:gap-4 justify-between">
            <FlowBlock icon={<MonitorSmartphone className="text-[#1a2b4b]" size={24} />} title="Devices" desc="Sensing, Imaging" />
            <ArrowRight className="text-blue-300 shrink-0" size={20} />
            <FlowBlock icon={<Server className="text-blue-600" size={24} />} title="Edge Gateway" desc="Collect, Transmit" />
            <ArrowRight className="text-blue-300 shrink-0" size={20} />
            <FlowBlock icon={<Globe className="text-blue-400" size={24} />} title="AIQ Cloud" desc="Store, Orchestrate" />
            <ArrowRight className="text-blue-300 shrink-0" size={20} />
            <FlowBlock icon={<Cpu className="text-purple-600" size={24} />} title="AI Analytics" desc="Predict, Classify" />
            <ArrowRight className="text-blue-300 shrink-0" size={20} />
            <FlowBlock icon={<FileText className="text-emerald-600" size={24} />} title="Quality Report" desc="Insights, Alerts" />
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
            <button onClick={handleModalClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 bg-slate-100 p-1 rounded-full">
              <X size={20} />
            </button>
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#1a2b4b] mb-1 flex items-center gap-2"><Plus size={20} className="text-blue-600" /> Add Device to Process</h2>
              <p className="text-xs text-slate-500 mb-6">Register a new instrument or connect via live stream.</p>

              <form onSubmit={handleAddDevice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name</label>
                  <input type="text" required value={newDevice.name} onChange={e => setNewDevice({ ...newDevice, name: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. VisionCam Array-03" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select value={newDevice.category} onChange={e => setNewDevice({ ...newDevice, category: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                      <option>Sensor Arrays</option>
                      <option>Cameras / Camera Arrays</option>
                      <option>Spectral</option>
                      <option>Ultrasonic / Acoustics</option>
                      <option>X-Ray</option>
                      <option>Analytical Instruments</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subtype</label>
                    <input type="text" value={newDevice.subtype} onChange={e => setNewDevice({ ...newDevice, subtype: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Visual, Thermal..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Interface</label>
                    <select value={newDevice.interface} onChange={e => setNewDevice({ ...newDevice, interface: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                      <option>Wi-Fi</option>
                      <option>Ethernet</option>
                      <option>BLE</option>
                      <option>USB</option>
                      <option>REST API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Process</label>
                    <input type="text" value={newDevice.linked_process} onChange={e => setNewDevice({ ...newDevice, linked_process: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Visual Inspection" />
                  </div>
                </div>

                {/* Connection Integration */}
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                    <label className="block text-xs font-semibold text-slate-700">Live Device Pairing (Optional)</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setPairingMode(pairingMode === 'camera' ? 'manual' : 'camera')} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                        <Video size={14} /> {pairingMode === 'camera' ? 'Stop Camera' : 'Use Webcam'}
                      </button>
                      <button type="button" onClick={() => pairingMode === 'qr' ? setPairingMode('manual') : openQrMode()} className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:underline">
                        <Smartphone size={14} /> {pairingMode === 'qr' ? 'Cancel QR' : 'Pair via QR'}
                      </button>
                      <button type="button" onClick={() => setPairingMode(pairingMode === 'api' ? 'manual' : 'api')} className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline">
                        <Key size={14} /> {pairingMode === 'api' ? 'Cancel API' : 'Generate API Key'}
                      </button>
                    </div>
                  </div>

                  {pairingMode === 'camera' && (
                    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-300">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                      </div>
                      <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 rounded pointer-events-none"></div>
                    </div>
                  )}

                  {pairingMode === 'qr' && (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm mb-4 border border-slate-200">
                        <QRCode
                          value={`${window.location.origin}/mobile-pair?session=${qrSessionId}`}
                          size={160}
                          level="M"
                        />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Scan with your mobile phone</h3>
                      <p className="text-xs text-slate-500 max-w-[250px] mb-4">Point your phone's camera at this QR code to instantly pair it as an edge vision device.</p>

                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 animate-pulse mb-6">
                        <Activity size={14} /> Waiting for connection...
                      </div>

                      <div className="border-t border-slate-200 pt-4 w-full text-center">
                        <p className="text-[10px] text-slate-400 mb-2">Local Development Mode</p>
                        <a
                          href={`/mobile-pair?session=${qrSessionId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          <MonitorSmartphone size={14} /> Simulate on this computer
                        </a>
                      </div>
                    </div>
                  )}

                  {pairingMode === 'api' && (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><Key size={16} className="text-green-600" /> Headless API Integration</h3>
                      <p className="text-xs text-slate-500 mb-4">Use these credentials to push data from PLCs, X-Ray machines, or analytical instruments directly into the AIQ pipeline.</p>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Endpoint URL</label>
                          <div className="flex">
                            <input readOnly value="https://api.aiq.app/v1/devices/ingest" className="w-full bg-slate-200 border-y border-l border-slate-300 rounded-l px-3 py-1.5 text-xs text-slate-600 font-mono outline-none" />
                            <button type="button" className="bg-slate-300 hover:bg-slate-400 px-3 border border-slate-300 rounded-r transition-colors"><Copy size={12} className="text-slate-600" /></button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Authorization Token</label>
                          <div className="flex">
                            <input readOnly value={`sk_test_${Math.random().toString(36).substring(2, 15)}`} className="w-full bg-slate-200 border-y border-l border-slate-300 rounded-l px-3 py-1.5 text-xs text-slate-600 font-mono outline-none" />
                            <button type="button" className="bg-slate-300 hover:bg-slate-400 px-3 border border-slate-300 rounded-r transition-colors"><Copy size={12} className="text-slate-600" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {pairingMode === 'manual' && (
                    <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-xs flex-col gap-1 cursor-pointer hover:bg-slate-100 hover:border-blue-300 transition-colors" onClick={openQrMode}>
                      <Settings size={24} />
                      <span>Select an integration method above to pair</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={handleModalClose} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <Activity size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                    {isSubmitting ? 'Connecting...' : 'Connect Device'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
            <button onClick={() => setEditingDevice(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 bg-slate-100 p-1 rounded-full">
              <X size={20} />
            </button>
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#1a2b4b] mb-1 flex items-center gap-2"><Settings size={20} className="text-blue-600" /> Edit Device</h2>
              <p className="text-xs text-slate-500 mb-6">Update configuration for {editingDevice.name}.</p>

              <form onSubmit={handleEditDeviceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name</label>
                  <input type="text" required value={editingDevice.name} onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. VisionCam Array-03" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select value={editingDevice.category} onChange={e => setEditingDevice({ ...editingDevice, category: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                      <option>Sensor Arrays</option>
                      <option>Cameras / Camera Arrays</option>
                      <option>Spectral</option>
                      <option>Ultrasonic / Acoustics</option>
                      <option>X-Ray</option>
                      <option>Analytical Instruments</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subtype</label>
                    <input type="text" value={editingDevice.subtype} onChange={e => setEditingDevice({ ...editingDevice, subtype: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Visual, Thermal..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Interface</label>
                    <select value={editingDevice.interface} onChange={e => setEditingDevice({ ...editingDevice, interface: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                      <option>Wi-Fi</option>
                      <option>Ethernet</option>
                      <option>BLE</option>
                      <option>USB</option>
                      <option>REST API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Process</label>
                    <input type="text" value={editingDevice.linked_process} onChange={e => setEditingDevice({ ...editingDevice, linked_process: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Visual Inspection" />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setEditingDevice(null)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <Activity size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents

function StatCard({ icon, iconBg, title, value, sub, chartData, stroke }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 lg:p-4 shadow-sm flex flex-row lg:flex-col xl:flex-row items-center lg:items-start xl:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-xl lg:text-2xl font-extrabold text-slate-800 leading-none lg:leading-tight">{value}</p>
          <div className="text-[10px] lg:text-xs text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
            {sub}
          </div>
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
    <div className="border border-slate-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors shadow-sm text-left flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <div className="p-1.5 bg-slate-50 rounded shrink-0">{icon}</div>
        <p className="text-xl font-bold text-blue-600">{count}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold text-[#1a2b4b] leading-tight mb-1">{title}</p>
        <p className="text-[9px] text-slate-500 leading-snug line-clamp-2">{desc}</p>
      </div>
    </div>
  )
}

function FlowStep({ num, title, active }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[60px] md:max-w-[80px] relative z-10 bg-slate-50 px-1">
      <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1.5", active ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-200 text-slate-500")}>
        {num}
      </div>
      <p className={clsx("text-[9px] md:text-[10px] font-bold mb-0.5 leading-tight", active ? "text-[#1a2b4b]" : "text-slate-500")}>{title}</p>
    </div>
  )
}

function InterfaceCard({ icon, name, status, color }) {
  return (
    <div className="border border-slate-100 rounded p-2 flex items-center gap-2 bg-slate-50">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-slate-700">{name}</p>
        <p className={clsx("text-[9px] font-semibold", color)}>{status}</p>
      </div>
    </div>
  )
}

function MetricBlock({ title, value, label, labelColor }) {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-white p-2 rounded border border-slate-100 w-full min-w-0">
      <span className="text-[10px] font-semibold text-slate-500 mb-1 line-clamp-1">{title}</span>
      <span className="text-lg font-bold text-slate-800">{value}</span>
      <span className={clsx("text-[10px] font-bold", labelColor)}>{label}</span>
      <div className="w-full mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: title === 'Temperature' ? '50%' : '80%' }}></div>
      </div>
    </div>
  )
}

function FlowBlock({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-blue-100 shadow-sm flex-1 min-w-[150px]">
      <div className="p-1.5 bg-blue-50 rounded-lg shrink-0 border border-blue-100">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-[#1a2b4b]">{title}</p>
        <p className="text-[9px] text-slate-500 leading-tight line-clamp-1">{desc}</p>
      </div>
    </div>
  )
}
