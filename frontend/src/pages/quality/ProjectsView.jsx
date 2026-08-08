import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, MoreVertical, ShieldCheck, Box, Activity, 
  CheckCircle, Settings2, Smartphone, AlertCircle, ArrowUp, ArrowDown,
  ExternalLink, Maximize, BrainCircuit
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';

const COLORS = {
  good: '#10b981', // emerald-500
  watch: '#f59e0b', // amber-500
  critical: '#ef4444', // red-500
  noData: '#9ca3af', // gray-400
  info: '#3b82f6', // blue-500
};

// Subcomponent: Circular Progress / Donut for Table
const MiniScoreDonut = ({ score }) => {
  const color = score >= 85 ? COLORS.good : score >= 70 ? COLORS.watch : COLORS.critical;
  const data = [{ value: score }, { value: 100 - score }];
  return (
    <div className="w-8 h-8 relative flex shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={10} outerRadius={14} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="#f3f4f6" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Subcomponent: Hierarchy Node
function ProjectNode({ name, score, selected, onClick }) {
  const color = score >= 85 ? COLORS.good : score >= 70 ? COLORS.watch : COLORS.critical;
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 border ${selected ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg p-3 min-w-[130px] text-center shadow-sm cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md mx-2`}
    >
      <div className="text-[11px] font-black text-gray-900 dark:text-gray-100 mb-1 truncate max-w-[110px] mx-auto" title={name}>{name}</div>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
        <div className="w-1.5 h-1.5 rounded-full outline outline-1 outline-offset-2" style={{ backgroundColor: color, outlineColor: color }} />
        <span className="text-gray-900 dark:text-gray-100 ml-1">{score.toFixed(1)}</span>
        <span style={{ color }}>{score >= 85 ? 'Good' : score >= 70 ? 'Watch' : 'Critical'}</span>
      </div>
    </div>
  );
}

export default function ProjectsView({ pwsItems, pwsAssignments, devices, notes }) {
  const projects = pwsItems.filter(p => p.type === 'project');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Aggregate Data ---
  const projectStats = useMemo(() => {
    return projects.map(proj => {
      // 1. Get children
      const workflowIds = pwsAssignments.filter(a => a.parent_id === proj.id).map(a => a.child_id);
      const stageIds = pwsAssignments.filter(a => workflowIds.includes(a.parent_id)).map(a => a.child_id);
      const processIds = pwsAssignments.filter(a => stageIds.includes(a.parent_id)).map(a => a.child_id);

      // 2. Devices inside these processes
      const projDevices = devices.filter(d => processIds.includes(d.process_id) || processIds.length > 0); 
      // Fallback: If device has no process_id mapped, just mock some distribution for demo
      const deviceCount = projDevices.length > 0 ? projDevices.length : Math.floor(Math.random() * 15) + 5;

      // 3. Notes / Alerts
      const projNotes = notes.filter(n => n.project_name === proj.name || workflowIds.includes(n.workflow_stage));
      let critical = 0, watch = 0, good = 0;
      projNotes.forEach(n => {
        if (n.severity === 'Critical' || n.severity === 'High') critical++;
        else if (n.severity === 'Medium') watch++;
        else good++;
      });

      // 4. Calculate Scores
      const baseScore = 100 - (critical * 5) - (watch * 2);
      const qiScore = Math.max(0, Math.min(100, baseScore));
      
      const inferenceScore = Math.max(0, qiScore - (Math.random() * 5));
      const collectiveScore = Math.min(100, qiScore + (Math.random() * 5));
      
      return {
        id: proj.id,
        name: proj.name,
        workflows: Math.max(2, workflowIds.length),
        stages: Math.max(4, stageIds.length),
        processes: Math.max(9, processIds.length),
        devices: deviceCount,
        coverage: Math.floor(Math.random() * 40) + 55, // 55% - 95%
        qi: qiScore,
        inference: inferenceScore,
        collective: collectiveScore,
        collabLevel: qiScore >= 80 ? 'High' : qiScore >= 65 ? 'Medium' : 'Low',
        alerts: critical + watch,
        status: qiScore >= 80 ? 'Live' : qiScore >= 65 ? 'Delay' : 'At Risk'
      };
    });
  }, [projects, pwsAssignments, devices, notes]);

  // Search filtering
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projectStats;
    const q = searchQuery.toLowerCase();
    return projectStats.filter(p => 
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)
    );
  }, [projectStats, searchQuery]);

  const selectedStats = projectStats.find(p => p.id === selectedProjectId) || projectStats[0];

  // CSV Download
  const downloadCSV = () => {
    const headers = ['Project', 'ID', 'Workflows', 'Stages', 'Processes', 'Devices', 'Coverage %', 'Quality Index', 'Inference Score', 'Collective Score', 'Collaborative Intel', 'Active Alerts', 'Status'];
    const rows = filteredProjects.map(p => [
      p.name, p.id, p.workflows, p.stages, p.processes, p.devices,
      p.coverage, p.qi.toFixed(1), p.inference.toFixed(1), p.collective.toFixed(1),
      p.collabLevel, p.alerts, p.status
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    if (status === 'Live' || status === 'Good') return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400";
    if (status === 'Delay' || status === 'Watch') return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400";
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400";
  };

  const getDots = (level) => {
    const colors = level === 'High' ? [COLORS.good, COLORS.good, COLORS.good] : level === 'Medium' ? [COLORS.watch, COLORS.watch, COLORS.noData] : [COLORS.critical, COLORS.noData, COLORS.noData];
    return (
      <div className="flex gap-0.5">
        {colors.map((c, i) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />)}
      </div>
    );
  };

  // Mock trend data
  const makeHistory = (baseScore) => Array.from({ length: 5 }).map((_, i) => ({ name: `T${i}`, value: Math.max(0, Math.min(100, baseScore + (Math.random() * 8 - 4))) }));

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* SECTION 1: PROJECTS SUMMARY TABLE */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Projects Summary</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-md">{filteredProjects.length} Projects</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-primary-500 w-64" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Filter size={16} /> Filters
            </button>
            <button onClick={downloadCSV} className="flex items-center justify-center w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-4 pl-6 pr-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Project</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Workflows</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Stages</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Processes</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Devices</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 w-32">Coverage</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Overall QI</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Inference</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Collective</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Collaborative</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Alerts</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Status</th>
                <th className="py-4 pr-6 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr 
                  key={p.id} 
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${selectedProjectId === p.id ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                >
                  <td className="py-4 pl-6 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.status === 'Live' ? 'bg-blue-600 text-white' : p.status === 'Delay' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                        <Box size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 truncate w-40">{p.name}</span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{p.workflows}</td>
                  <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{p.stages}</td>
                  <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{p.processes}</td>
                  <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{p.devices}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.coverage}%`, backgroundColor: p.coverage >= 80 ? COLORS.good : p.coverage >= 60 ? COLORS.watch : COLORS.critical }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{p.coverage}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <MiniScoreDonut score={p.qi} />
                      <span className="text-xs font-black text-gray-900 dark:text-gray-100">{p.qi.toFixed(1)}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.qi >= 80 ? 'text-emerald-600 bg-emerald-50' : p.qi >= 65 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                        {p.qi >= 80 ? 'Good' : p.qi >= 65 ? 'Watch' : 'Crit'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900 dark:text-gray-100">{p.inference.toFixed(1)}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.inference >= 80 ? 'text-emerald-600 bg-emerald-50' : p.inference >= 65 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                        {p.inference >= 80 ? 'Good' : p.inference >= 65 ? 'Watch' : 'Crit'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900 dark:text-gray-100">{p.collective.toFixed(1)}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.collective >= 80 ? 'text-emerald-600 bg-emerald-50' : p.collective >= 65 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                        {p.collective >= 80 ? 'Good' : p.collective >= 65 ? 'Watch' : 'Crit'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                      {getDots(p.collabLevel)} {p.collabLevel}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-xs font-black ${p.alerts > 0 ? 'text-red-600' : 'text-gray-500'}`}>{p.alerts}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase border ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-right">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* SECTION 2: HIERARCHY ROLL-UP */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center overflow-x-auto hide-scrollbar">
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 self-start mb-6 flex items-center gap-2">
            Project Hierarchy & Quality Roll-up <AlertCircle size={14} className="text-gray-400"/>
          </h3>
          
          {/* Top Node */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 min-w-[160px] text-center shadow-sm relative z-10 mx-auto">
            <div className="text-xs font-black text-gray-900 dark:text-gray-100 mb-1">All Projects</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Overall Quality Index</div>
            <div className="flex items-center justify-center gap-2">
              <MiniScoreDonut score={76.8} />
              <span className="text-xl font-black text-gray-900 dark:text-gray-100">76.8</span>
              <span className="text-[10px] font-bold uppercase text-amber-500">Watch</span>
            </div>
          </div>

          {/* Tree Connections */}
          <div className="flex flex-col items-center w-full relative -mt-1">
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
            <div className="w-[85%] h-px bg-gray-200 dark:bg-gray-700"></div>
            
            <div className="flex justify-between w-[85%] pt-6">
              {projectStats.slice(0, 5).map((p, i) => (
                <div key={p.id} className="relative flex flex-col items-center">
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 absolute -top-6"></div>
                  <ProjectNode name={p.name} score={p.qi} selected={selectedProjectId === p.id} onClick={() => setSelectedProjectId(p.id)} />
                </div>
              ))}
              {projectStats.length > 5 && (
                <div className="relative flex flex-col items-center">
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 absolute -top-6"></div>
                  <div className="text-xs font-bold text-blue-600 hover:underline cursor-pointer mt-4">+ {projectStats.length - 5} More<br/>View all</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-6 text-[10px] font-bold text-gray-500 self-start">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Good (≥ 80)</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> Watch (60 - 79)</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/> Critical ({'<'} 60)</div>
          </div>
        </div>

        {/* SECTION 4: PROJECT QUALITY SNAPSHOT */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-6">Project Quality Snapshot</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">Inference (Project)</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black">{selectedStats?.inference.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Good</span>
              </div>
              <div className="h-10 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={makeHistory(selectedStats?.inference)}><Line type="monotone" dataKey="value" stroke={COLORS.good} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">Collective Intel</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black">{selectedStats?.collective.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Good</span>
              </div>
              <div className="h-10 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={makeHistory(selectedStats?.collective)}><Line type="monotone" dataKey="value" stroke={COLORS.good} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 truncate">Collab Intelligence</div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase">
                {getDots(selectedStats?.collabLevel)} {selectedStats?.collabLevel}
              </div>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 flex flex-col">
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 truncate">Active Alerts</div>
              <div className="flex items-center gap-2 text-red-600 mb-3">
                <AlertCircle size={20}/> <span className="text-2xl font-black">{selectedStats?.alerts}</span>
              </div>
              <div className="text-xs font-bold text-blue-600 hover:underline cursor-pointer mt-auto">View alerts ></div>
            </div>

          </div>
        </div>

        {/* PROJECT DETAILS (Now full width) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Project Details</h3>
            <div className="flex items-center gap-3">
              <select 
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300"
              >
                {projectStats.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${getStatusBadge(selectedStats?.status)}`}>
                {selectedStats?.status}
              </span>
            </div>
          </div>
          
          <div className="p-6 pb-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Workflows</span>
                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedStats?.workflows}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Stages</span>
                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedStats?.stages}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Processes</span>
                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedStats?.processes}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Devices</span>
                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedStats?.devices}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Contextual Coverage</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedStats?.coverage}%</span>
                  <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedStats?.coverage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 mb-2">
              <span className="text-xs font-black text-gray-900 dark:text-gray-100">Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                <Box size={14}/> Open Project <ExternalLink size={12}/>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                <Activity size={14}/> Review Project Quality <Maximize size={12}/>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Smartphone size={14}/> View Devices
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <BrainCircuit size={14}/> View Inference
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              Contextual Device Parameters <AlertCircle size={14} className="text-gray-400"/>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Parameter</th>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Source Workflow</th>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Source Process / Stage</th>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Devices</th>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Coverage</th>
                    <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p: 'Moisture (%)', w: 'Moisture Check', s: 'Moisture Check / Raw Material QC', d: 'NIR-01, NIR-02', c: 100 },
                    { p: 'Temperature (°C)', w: 'Heating', s: 'Heating / Reaction', d: 'TEMP-01, TEMP-02', c: 100 },
                    { p: 'Pressure (bar)', w: 'Reaction', s: 'Reaction / Biodiesel Production', d: 'PRES-01, PRES-02', c: 98 },
                    { p: 'Methanol (%)', w: 'Reaction', s: 'Reaction / Biodiesel Production', d: 'GC-01', c: 95 },
                    { p: 'Viscosity (cSt)', w: 'Purification', s: 'Purification / Final QC', d: 'VISC-01', c: 90 },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 pr-3 text-xs font-bold text-gray-900 dark:text-gray-100">{row.p}</td>
                      <td className="py-3 pr-3 text-[11px] font-medium text-gray-600">{row.w}</td>
                      <td className="py-3 pr-3 text-[11px] font-medium text-gray-600">{row.s}</td>
                      <td className="py-3 pr-3 text-[11px] font-medium text-gray-600">{row.d}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500 w-6">{row.c}%</span>
                          <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.c}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Live
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
              View all 22 parameters &gt;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
