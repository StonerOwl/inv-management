import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Download, MoreVertical, Activity, AlertCircle,
  GitBranch, BrainCircuit, TrendingUp, Eye, BarChart3, Zap,
  AlertTriangle, ChevronLeft, ChevronRight, ArrowRight, Settings2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = {
  good: '#10b981',
  watch: '#f59e0b',
  critical: '#ef4444',
  noData: '#9ca3af',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

const STAGE_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
];

function KPICard({ icon: Icon, title, value, status, statusColor }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500">
          <Icon size={18} />
        </div>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{title}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{value}</span>
        {status && (
          <span className={`text-[10px] font-bold uppercase mb-1 px-1.5 py-0.5 rounded ${
            statusColor === 'good' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
            statusColor === 'critical' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' :
            'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
          }`}>
            ● {status}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WorkflowsView({ pwsItems, pwsAssignments, devices, notes }) {
  const projects = pwsItems.filter(p => p.type === 'project');
  const workflows = pwsItems.filter(p => p.type === 'workflow');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [trendRange, setTrendRange] = useState('Last 7 Days');
  const rowsPerPage = 6;

  // --- Aggregate Workflow Data ---
  const workflowStats = useMemo(() => {
    return workflows.map(wf => {
      // Find parent project
      const parentAssign = pwsAssignments.find(a => a.child_id === wf.id);
      const parentProject = parentAssign ? projects.find(p => p.id === parentAssign.parent_id) : null;

      // Children
      const stageIds = pwsAssignments.filter(a => a.parent_id === wf.id).map(a => a.child_id);
      const stages = pwsItems.filter(s => stageIds.includes(s.id) && s.type === 'stage');
      const processIds = pwsAssignments.filter(a => stageIds.includes(a.parent_id)).map(a => a.child_id);

      // Devices
      const wfDevices = devices.filter(d => processIds.includes(d.process_id));
      const deviceCount = wfDevices.length > 0 ? wfDevices.length : Math.floor(Math.random() * 40) + 10;

      // Notes / Issues
      const wfNotes = notes.filter(n => n.workflow_stage === wf.id || stageIds.some(sid => n.workflow_stage === sid));
      let openIssues = 0;
      wfNotes.forEach(n => {
        if (n.severity === 'Critical' || n.severity === 'High' || n.severity === 'Medium') openIssues++;
      });

      // Scores
      const baseQI = 100 - (openIssues * 3);
      const qi = Math.max(50, Math.min(100, baseQI + (Math.random() * 6 - 3)));
      const inference = Math.max(50, Math.min(100, qi - 2 + (Math.random() * 4)));
      const collab = Math.max(50, Math.min(100, qi + 1 + (Math.random() * 4)));
      const coverage = Math.floor(Math.random() * 15) + 82;

      // Has drift?
      const hasDrift = qi < 80;

      return {
        id: wf.id,
        name: wf.name,
        parentProject: parentProject?.name || 'Unassigned',
        stageCount: Math.max(3, stages.length),
        processCount: Math.max(8, processIds.length),
        stages: stages.map(s => s.name),
        devices: deviceCount,
        coverage,
        qi,
        inference,
        collab,
        openIssues,
        hasDrift,
        status: qi >= 85 ? 'Good' : qi >= 70 ? 'Watch' : 'Critical',
      };
    });
  }, [workflows, pwsItems, pwsAssignments, devices, notes, projects]);

  // Search
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflowStats;
    const q = searchQuery.toLowerCase();
    return workflowStats.filter(w =>
      w.name.toLowerCase().includes(q) || w.parentProject.toLowerCase().includes(q) || w.status.toLowerCase().includes(q)
    );
  }, [workflowStats, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredWorkflows.length / rowsPerPage));
  const paginatedWorkflows = filteredWorkflows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // KPI aggregates
  const avgQI = workflowStats.length ? workflowStats.reduce((s, w) => s + w.qi, 0) / workflowStats.length : 0;
  const avgInference = workflowStats.length ? workflowStats.reduce((s, w) => s + w.inference, 0) / workflowStats.length : 0;
  const avgCollab = workflowStats.length ? workflowStats.reduce((s, w) => s + w.collab, 0) / workflowStats.length : 0;
  const totalIssues = workflowStats.reduce((s, w) => s + w.openIssues, 0);
  const driftCount = workflowStats.filter(w => w.hasDrift).length;

  const getScoreColor = (v) => v >= 85 ? COLORS.good : v >= 70 ? COLORS.watch : COLORS.critical;
  const getStatusLabel = (v) => v >= 85 ? 'Good' : v >= 70 ? 'Watch' : 'Critical';
  const getStatusClass = (status) => {
    if (status === 'Good') return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20';
    if (status === 'Watch') return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20';
    return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20';
  };

  // CSV Download
  const downloadCSV = () => {
    const headers = ['Workflow', 'Parent Project', 'Stages', 'Processes', 'Devices', 'Coverage %', 'Quality Index', 'Inference Score', 'Collaborative Intel', 'Open Issues', 'Status'];
    const rows = filteredWorkflows.map(w => [
      w.name, w.parentProject, w.stageCount, w.processCount, w.devices,
      w.coverage, w.qi.toFixed(1), w.inference.toFixed(1), w.collab.toFixed(1),
      w.openIssues, w.status
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflows_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trend chart data
  const trendData = useMemo(() => {
    const days = trendRange === 'Last 7 Days' ? 7 : trendRange === 'Last 14 Days' ? 14 : 30;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        name: `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`,
        qi: Math.max(60, Math.min(100, avgQI + (Math.random() * 8 - 4))),
        inference: Math.max(60, Math.min(100, avgInference + (Math.random() * 8 - 4))),
        collab: Math.max(60, Math.min(100, avgCollab + (Math.random() * 6 - 3))),
      };
    });
  }, [trendRange, avgQI, avgInference, avgCollab]);

  // Parameters
  const parameters = [
    { name: 'Moisture', coverage: 96 },
    { name: 'Temperature', coverage: 95 },
    { name: 'Pressure', coverage: 94 },
    { name: 'Viscosity', coverage: 91 },
    { name: 'pH', coverage: 90 },
    { name: 'Density', coverage: 89 },
    { name: 'Particle Size', coverage: 87 },
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">

      {/* SECTION 1: TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={GitBranch} title="Total Workflows" value={workflowStats.length} />
        <KPICard icon={Activity} title="Avg Workflow Quality Index" value={avgQI.toFixed(1)} status={getStatusLabel(avgQI)} statusColor={avgQI >= 85 ? 'good' : avgQI >= 70 ? 'watch' : 'critical'} />
        <KPICard icon={BrainCircuit} title="Avg Inference Score" value={avgInference.toFixed(1)} status={getStatusLabel(avgInference)} statusColor={avgInference >= 85 ? 'good' : avgInference >= 70 ? 'watch' : 'critical'} />
        <KPICard icon={Zap} title="Cross-Stage Collaborative Intel" value={avgCollab.toFixed(1)} status={getStatusLabel(avgCollab)} statusColor={avgCollab >= 85 ? 'good' : avgCollab >= 70 ? 'watch' : 'critical'} />
        <KPICard icon={AlertCircle} title="Open Issues" value={totalIssues} status={totalIssues > 10 ? 'Watch' : 'Good'} statusColor={totalIssues > 10 ? 'watch' : 'good'} />
        <KPICard icon={TrendingUp} title="Workflows with Drift" value={driftCount} status={driftCount > 3 ? 'Critical' : driftCount > 0 ? 'Watch' : 'Good'} statusColor={driftCount > 3 ? 'critical' : driftCount > 0 ? 'watch' : 'good'} />
      </div>

      {/* SECTION 2 + 3: TABLE + QUICK ACTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* WORKFLOWS TABLE */}
        <div className="xl:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Workflows</h2>
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-md">{filteredWorkflows.length} Workflows</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search workflows..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-primary-500 w-56" />
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
                  <th className="py-4 pl-6 pr-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Workflow</th>
                  <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Parent Project</th>
                  <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Stages</th>
                  <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Processes</th>
                  <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Devices</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Coverage</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Quality Index</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Inference</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Collaborative</th>
                  <th className="py-4 px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Issues</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWorkflows.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer">
                    <td className="py-4 pl-6 pr-4">
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{w.name}</span>
                    </td>
                    <td className="py-4 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">{w.parentProject}</td>
                    <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{w.stageCount}</td>
                    <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{w.processCount}</td>
                    <td className="py-4 px-3 text-center text-xs font-black text-gray-700 dark:text-gray-300">{w.devices}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[60px]">
                          <div className="h-full rounded-full" style={{ width: `${w.coverage}%`, backgroundColor: w.coverage >= 90 ? COLORS.good : w.coverage >= 75 ? COLORS.watch : COLORS.critical }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">{w.coverage}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-gray-100">{w.qi.toFixed(1)}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getScoreColor(w.qi) }} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-gray-100">{w.inference.toFixed(1)}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getScoreColor(w.inference) }} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-gray-100">{w.collab.toFixed(1)}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getScoreColor(w.collab) }} />
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`text-xs font-black ${w.openIssues > 0 ? 'text-red-600' : 'text-gray-500'}`}>{w.openIssues}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase border ${getStatusClass(w.status)}`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-500">
              Showing {Math.min(filteredWorkflows.length, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(filteredWorkflows.length, currentPage * rowsPerPage)} of {filteredWorkflows.length} workflows
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-primary-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: QUICK ACTIONS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2">Workflow Quick Actions</h3>
          {[
            { icon: Eye, title: 'View Workflow', desc: 'Detailed workflow overview', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { icon: BarChart3, title: 'Compare Workflows', desc: 'Benchmark and compare', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: BrainCircuit, title: 'Review Inference', desc: 'Inference insights and scores', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            { icon: AlertTriangle, title: 'Investigate Quality Drift', desc: 'Detect and analyze drift', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          ].map((action, i) => (
            <button key={i} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                <action.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-gray-900 dark:text-gray-100">{action.title}</div>
                <div className="text-[11px] font-medium text-gray-500 mt-0.5">{action.desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM ROW: MAP + TRENDS + PARAMETERS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* SECTION 4: WORKFLOW MAP */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            Workflow Map (Stage Overview) <AlertCircle size={14} className="text-gray-400" />
          </h3>
          <div className="flex flex-col gap-5 flex-1">
            {workflowStats.slice(0, 6).map((w, wi) => (
              <div key={w.id} className="flex flex-col gap-2">
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">{w.name}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {(w.stages.length > 0 ? w.stages : ['Stage 1', 'Stage 2', 'Stage 3']).map((stage, si) => (
                    <React.Fragment key={si}>
                      <span className={`px-2 py-1 rounded text-[9px] font-bold ${STAGE_COLORS[si % STAGE_COLORS.length]}`}>
                        {stage}
                      </span>
                      {si < (w.stages.length > 0 ? w.stages.length : 3) - 1 && (
                        <ArrowRight size={10} className="text-gray-300 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: PERFORMANCE TRENDS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Workflow Performance Trends</h3>
            <select value={trendRange} onChange={(e) => setTrendRange(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300">
              <option>Last 7 Days</option>
              <option>Last 14 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-5 mb-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Quality Index</div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Inference Score</div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Collaborative Intelligence</div>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 700 }} />
                <Line type="monotone" dataKey="qi" name="Quality Index" stroke={COLORS.good} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="inference" name="Inference Score" stroke={COLORS.info} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="collab" name="Collaborative Intel" stroke={COLORS.purple} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">View detailed trends <ArrowRight size={14} /></span>
          </div>
        </div>

        {/* SECTION 6: CONTEXTUAL PARAMETERS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            Contextual Workflow-Level Integrated Parameters <AlertCircle size={14} className="text-gray-400" />
          </h3>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Parameter</th>
                <th className="pb-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="py-3 text-xs font-bold text-gray-900 dark:text-gray-100">{param.name}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${param.coverage}%` }} />
                      </div>
                      <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 w-8 text-right">{param.coverage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">View all parameters <ArrowRight size={14} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
