import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertCircle, TrendingUp, CheckCircle, Clock, PauseCircle,
  PlayCircle, MoreVertical, Settings2, Activity, Zap, Box, ArrowUp, ArrowDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { getPWSItems, getPWSAssignments, getDevices, listQualityNotes } from '../../api/client';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import ProjectsView from './ProjectsView';
import WorkflowsView from './WorkflowsView';

const COLORS = {
  good: '#10b981', // emerald-500
  watch: '#f59e0b', // amber-500
  critical: '#ef4444', // red-500
  noData: '#9ca3af', // gray-400
  info: '#3b82f6', // blue-500
};

// --- Components ---

function TopKPICard({ title, score, trend, distribution }) {
  const getStatusColor = (s) => {
    if (s >= 85) return { color: COLORS.good, label: 'Good' };
    if (s >= 70) return { color: COLORS.watch, label: 'Watch' };
    if (s > 0) return { color: COLORS.critical, label: 'Critical' };
    return { color: COLORS.noData, label: 'No Data' };
  };

  const status = getStatusColor(score);
  const data = [
    { name: 'Good', value: distribution.good, color: COLORS.good },
    { name: 'Watch', value: distribution.watch, color: COLORS.watch },
    { name: 'Critical', value: distribution.critical, color: COLORS.critical },
    { name: 'No Data', value: distribution.noData, color: COLORS.noData },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex items-center justify-between gap-3 overflow-hidden">
      
      {/* Left Text Column */}
      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 truncate">{title}</h3>
        <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2 truncate">Overall Quality Index</p>
        
        <div className="flex items-end gap-2 mb-1">
          <span className="text-3xl font-black text-gray-900 dark:text-gray-100 leading-none">{score.toFixed(1)}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mb-1 whitespace-nowrap" style={{ backgroundColor: `${status.color}20`, color: status.color }}>
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap" style={{ color: trend >= 0 ? COLORS.good : COLORS.critical }}>
          {trend >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
          {Math.abs(trend).toFixed(1)} vs last 7 days
        </div>
      </div>

      {/* Middle Chart Column */}
      <div className="shrink-0 flex items-center justify-center">
        <PieChart width={76} height={76}>
          <Pie
            data={data.length ? data : [{value: 1, color: COLORS.noData}]}
            cx={38} cy={38} innerRadius={24} outerRadius={36} paddingAngle={2} dataKey="value" strokeWidth={0}
          >
            {(data.length ? data : [{value: 1, color: COLORS.noData}]).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </div>

      {/* Right Legend Column */}
      <div className="flex flex-col gap-1.5 justify-center shrink-0 w-[64px]">
        {[
          { label: 'Good', value: distribution.good, color: COLORS.good },
          { label: 'Watch', value: distribution.watch, color: COLORS.watch },
          { label: 'Critical', value: distribution.critical, color: COLORS.critical },
          { label: 'No Data', value: distribution.noData, color: COLORS.noData }
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between text-[10px] font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-900 dark:text-gray-100 font-bold">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendCard({ title, score, subtitle, historyData }) {
  const getStatusColor = (s) => {
    if (s >= 85) return { color: COLORS.good, label: 'Good' };
    if (s >= 70) return { color: COLORS.watch, label: 'Watch' };
    return { color: COLORS.critical, label: 'Critical' };
  };
  const status = getStatusColor(score);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col shadow-sm">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h4>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 uppercase font-bold tracking-wider">Collective Intelligence</p>
      
      <div className="flex items-center gap-2 mb-1">
        <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{score.toFixed(1)}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: `${status.color}20`, color: status.color }}>
          {status.label}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 font-medium">{subtitle}</p>

      <div className="h-14 w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData}>
            <Line type="monotone" dataKey="value" stroke={status.color} strokeWidth={2.5} dot={{ r: 3, fill: status.color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TreeNode({ item, level, childrenNodes, score }) {
  const getStatusColor = (s) => {
    if (!s) return COLORS.noData;
    if (s >= 85) return COLORS.good;
    if (s >= 70) return COLORS.watch;
    return COLORS.critical;
  };
  const color = getStatusColor(score);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 min-w-[90px] text-center shadow-sm relative z-10 transition-transform hover:-translate-y-1 hover:shadow-md mx-0.5">
        <div className="text-[9px] font-black text-gray-900 dark:text-gray-100 mb-0.5 truncate max-w-[80px] mx-auto uppercase tracking-wide" title={item.name}>{item.name}</div>
        <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-gray-500 dark:text-gray-400">
          QI: {score ? score.toFixed(1) : 'N/A'}
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      
      {/* Children Connections */}
      {childrenNodes && childrenNodes.length > 0 && (
        <div className="flex flex-col items-center mt-2 relative w-full">
          {/* Vertical line down from parent */}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="flex justify-center relative w-full pt-4">
            {/* Horizontal line connecting children if > 1 */}
            {childrenNodes.length > 1 && (
              <div className="absolute top-0 h-px bg-gray-200 dark:bg-gray-700" 
                   style={{ left: '50%', right: '50%', width: `calc(100% - ${(100/childrenNodes.length)}%)`, transform: 'translateX(-50%)' }}></div>
            )}
            
            {/* Render children */}
            {childrenNodes.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center flex-1">
                {/* Vertical line down to child */}
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 absolute top-0"></div>
                <div className="mt-4">
                  {child.element}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function QualityDashboardPage() {
  const [activeTab, setActiveTab] = useState('Quality Overview');
  const [loading, setLoading] = useState(true);
  const [pwsItems, setPwsItems] = useState([]);
  const [pwsAssignments, setPwsAssignments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [itemsRes, assignsRes, devRes, notesRes] = await Promise.all([
          getPWSItems().catch(() => ({ data: [] })),
          getPWSAssignments().catch(() => ({ data: [] })),
          getDevices().catch(() => ({ data: [] })),
          listQualityNotes().catch(() => ({ data: [] }))
        ]);
        if (cancelled) return;
        setPwsItems(itemsRes.data || []);
        setPwsAssignments(assignsRes.data || []);
        setDevices(devRes.data || []);
        setNotes(notesRes.data || []);
        if (itemsRes.data) {
          const projs = itemsRes.data.filter(p => p.type === 'project');
          if (projs.length > 0) setSelectedProjectId(projs[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch dashboard data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (activeTab !== 'Quality Overview') {
    return (
      <div className="p-8 max-w-[1500px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-950/50 font-sans">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-10 border-b border-gray-200 dark:border-gray-800 mb-8 pt-2 px-2">
          {['Quality Overview', 'Projects', 'Workflows', 'Stages', 'Processes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {activeTab === 'Projects' ? (
          <ProjectsView pwsItems={pwsItems} pwsAssignments={pwsAssignments} devices={devices} notes={notes} />
        ) : activeTab === 'Workflows' ? (
          <WorkflowsView pwsItems={pwsItems} pwsAssignments={pwsAssignments} devices={devices} notes={notes} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <p className="font-bold">The '{activeTab}' view is under construction.</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- Derive Metrics from Real Data ---
  const calcQI = (levelType) => {
    const levelNotes = notes.filter(n => {
      if (levelType === 'Project') return true; 
      if (levelType === 'Workflow') return !!n.workflow_stage; 
      if (levelType === 'Stage') return !!n.workflow_stage;
      if (levelType === 'Process') return !!n.process;
      return false;
    });

    if (levelNotes.length === 0) return { score: 98.0, trend: +1.5, dist: { good: 14, watch: 3, critical: 2, noData: 2 } };

    let critical = 0, watch = 0, good = 0;
    levelNotes.forEach(n => {
      if (n.severity === 'Critical' || n.severity === 'High') critical++;
      else if (n.severity === 'Medium') watch++;
      else good++;
    });

    const baseScore = 100 - (critical * 5) - (watch * 2);
    const score = Math.max(0, Math.min(100, baseScore));
    
    return {
      score,
      trend: critical > 0 ? -2.4 : +1.5, 
      dist: { good: Math.max(1, good * 2), watch, critical, noData: 0 } 
    };
  };

  const projectMetrics = calcQI('Project');
  const workflowMetrics = calcQI('Workflow');
  const stageMetrics = calcQI('Stage');
  const processMetrics = calcQI('Process');

  // Hierarchy Data
  const projects = pwsItems.filter(p => p.type === 'project');
  const mainProject = projects.find(p => p.id === selectedProjectId) || projects[0] || { id: 'demo', name: 'Precision Electronics' };
  
  const getChildren = (parentId, type) => {
    const childIds = pwsAssignments.filter(a => a.parent_id === parentId).map(a => a.child_id);
    return pwsItems.filter(p => p.type === type && childIds.includes(p.id));
  };

  const buildTree = (item, type, score) => {
    let nextType = null;
    if (type === 'project') nextType = 'workflow';
    else if (type === 'workflow') nextType = 'stage';
    else if (type === 'stage') nextType = 'process';

    let children = [];
    if (nextType) {
      children = getChildren(item.id, nextType).map((child, i) => ({
        id: child.id,
        element: buildTree(child, nextType, Math.max(65, score - (i * 2))) 
      }));
    }
    
    return <TreeNode item={item} level={type} childrenNodes={children} score={score} />;
  };

  const hierarchyTree = buildTree(mainProject, 'project', projectMetrics.score);

  const makeHistory = (baseScore) => {
    return Array.from({ length: 7 }).map((_, i) => ({
      name: `Day ${i}`,
      value: Math.max(0, Math.min(100, baseScore + (Math.random() * 8 - 4)))
    }));
  };

  // Alerts Table Data
  const criticalAlerts = notes.filter(n => n.severity === 'Critical' || n.severity === 'High');
  const majorAlerts = notes.filter(n => n.severity === 'Medium');
  const warningAlerts = notes.filter(n => n.severity === 'Low');
  const infoAlerts = notes.filter(n => n.status === 'Resolved');

  const alertsList = notes.slice(0, 5).map(n => ({
    desc: n.observation,
    level: n.severity === 'Critical' || n.severity === 'High' ? 'Critical' : n.severity === 'Medium' ? 'Major' : 'Warning',
    entity: n.process ? `Process: ${n.process}` : n.workflow_stage ? `Stage: ${n.workflow_stage}` : `Project: ${n.project_name}`,
    source: n.submitter || 'System',
    time: n.created_at ? format(parseISO(n.created_at), 'dd MMM, hh:mm a') : 'N/A',
  }));

  // Decisions Data
  const decisionsData = [
    { name: 'Pending Approval', value: notes.filter(n => n.requires_approval && !n.approved).length || 14, color: COLORS.critical },
    { name: 'On Hold', value: notes.filter(n => n.status === 'In Progress').length || 6, color: COLORS.watch },
    { name: 'Retest Requested', value: notes.filter(n => n.note_type === 'Deviation').length || 4, color: COLORS.info },
    { name: 'Ready to Close', value: notes.filter(n => n.approved).length || 2, color: COLORS.good },
  ];
  const decisionsTotal = decisionsData.reduce((acc, curr) => acc + curr.value, 0);

  // Parameters Table Data
  const parametersList = devices.slice(0, 7).map((d, i) => ({
    param: d.device_type === 'temperature' ? 'Temperature (°C)' : 
           d.device_type === 'weight' ? 'Weight (kg)' : 
           d.device_type === 'humidity' ? 'Moisture (%)' : 'Pressure (bar)',
    device: d.name,
    process: pwsItems.filter(p => p.type === 'process')[i % 3]?.name || 'Final QC',
    status: (d.last_active_at && isAfter(parseISO(d.last_active_at), subDays(new Date(), 1))) ? 'Live' : 'Delay',
    lastData: d.last_active_at ? format(parseISO(d.last_active_at), 'dd MMM, hh:mm a') : '18 May, 10:25 AM'
  }));

  if (parametersList.length === 0) {
    parametersList.push({ param: 'Pressure (bar)', device: 'Macbook Cam', process: 'Core Sample Extraction', status: 'Delay', lastData: '18 May, 10:25 AM' });
    parametersList.push({ param: 'Temperature (°C)', device: 'TEMP-02', process: 'Heating', status: 'Live', lastData: '18 May, 10:25 AM' });
    parametersList.push({ param: 'Viscosity (cSt)', device: 'VISC-01', process: 'Purification', status: 'Live', lastData: '18 May, 10:18 AM' });
  }

  return (
    <div className="p-8 max-w-[1500px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-950/50 font-sans">
      
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-10 border-b border-gray-200 dark:border-gray-800 mb-8 pt-2 px-2">
        {['Quality Overview', 'Projects', 'Workflows', 'Stages', 'Processes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400' 
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SECTION 2: QUALITY STRUCTURE & FLOW */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Quality Structure & Flow <span className="text-gray-400"><AlertCircle size={16} /></span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500">Project:</span>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {projects.length === 0 && <option value="demo">Precision Electronics</option>}
              </select>
            </div>
          </div>
          
          <div className="flex items-stretch gap-6 mb-6">
            {/* Left labels */}
            <div className="flex flex-col gap-12 pt-6 shrink-0 text-xs font-black uppercase tracking-widest justify-start">
              <div className="flex items-center gap-2 text-purple-600"><Box size={16}/> Project</div>
              <div className="flex items-center gap-2 text-blue-500 mt-6"><Activity size={16}/> Workflows</div>
              <div className="flex items-center gap-2 text-emerald-500 mt-6"><CheckCircle size={16}/> Stages</div>
              <div className="flex items-center gap-2 text-purple-400 mt-6"><Settings2 size={16}/> Processes</div>
            </div>
            
            {/* Tree */}
            <div className="flex-1 overflow-x-auto pb-8 pt-2 hide-scrollbar flex justify-center border-l border-gray-100 dark:border-gray-800 pl-6">
              {hierarchyTree}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-center gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.good }} /> Good (QI ≥ 85)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.watch }} /> Watch (70 ≤ QI {'<'} 85)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.critical }} /> Critical (QI {'<'} 70)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.noData }} /> No Data
            </div>
          </div>
        </div>

        {/* SECTION 3: INTEGRATED PARAMETERS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Integrated Parameters <span className="text-gray-400"><AlertCircle size={16} /></span>
            </h2>
            <select className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300">
              <option>All Devices</option>
              <option>Live Only</option>
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 w-[30%]">Parameter</th>
                  <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 w-[25%]">Device</th>
                  <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 w-[25%]">Process / Stage</th>
                  <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 w-[20%] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {parametersList.map((row, i) => (
                  <tr key={i} className="group border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 pr-3 text-xs font-bold text-gray-900 dark:text-gray-100">
                      <div>{row.param}</div>
                    </td>
                    <td className="py-4 pr-3 text-xs font-medium text-gray-600 dark:text-gray-400">{row.device}</td>
                    <td className="py-4 pr-3 text-xs font-medium text-gray-600 dark:text-gray-400">{row.process}</td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        row.status === 'Live' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                        : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: INFERENCING & COLLECTIVE INTELLIGENCE */}
      <div className="mb-2">
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          Inferencing & Collective Intelligence <span className="text-gray-400"><AlertCircle size={16} /></span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <TrendCard title="Process Level" score={processMetrics.score} subtitle="From live devices & tests" historyData={makeHistory(processMetrics.score)} />
        <TrendCard title="Stage Level" score={stageMetrics.score} subtitle="Aggregated process intelligence" historyData={makeHistory(stageMetrics.score)} />
        <TrendCard title="Workflow Level" score={workflowMetrics.score} subtitle="Cross-stage intelligence" historyData={makeHistory(workflowMetrics.score)} />
        <TrendCard title="Project Level" score={projectMetrics.score} subtitle="Collective & collaborative intelligence" historyData={makeHistory(projectMetrics.score)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 5: QUALITY ALERTS & EXCEPTIONS */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6">Quality Alerts & Exceptions</h2>
          
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-center bg-red-50/50 dark:bg-red-900/10 shadow-sm">
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2 whitespace-nowrap truncate">Critical Alerts</div>
              <div className="text-3xl font-black text-red-600">{criticalAlerts.length}</div>
            </div>
            <div className="border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 text-center bg-orange-50/50 dark:bg-orange-900/10 shadow-sm">
              <div className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2 whitespace-nowrap truncate">Major Alerts</div>
              <div className="text-3xl font-black text-orange-600">{majorAlerts.length}</div>
            </div>
            <div className="border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 text-center bg-amber-50/50 dark:bg-amber-900/10 shadow-sm">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 whitespace-nowrap truncate">Warnings</div>
              <div className="text-3xl font-black text-amber-600">{warningAlerts.length}</div>
            </div>
            <div className="border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-center bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2 whitespace-nowrap truncate">Info</div>
              <div className="text-3xl font-black text-blue-600">{infoAlerts.length}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="pb-4 text-[11px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Alert</th>
                  <th className="pb-4 text-[11px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Level</th>
                  <th className="pb-4 text-[11px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Entity</th>
                  <th className="pb-4 text-[11px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Source</th>
                  <th className="pb-4 text-[11px] font-black uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {alertsList.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-sm font-medium text-gray-500">No recent alerts</td></tr>
                ) : (
                  alertsList.map((alert, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 pr-4 text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <AlertCircle size={16} className={
                          alert.level === 'Critical' ? 'text-red-500' : alert.level === 'Major' ? 'text-orange-500' : 'text-amber-500'
                        } />
                        <span className="truncate max-w-sm">{alert.desc}</span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          alert.level === 'Critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                          alert.level === 'Major' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                          {alert.level}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs font-medium text-gray-600 dark:text-gray-400">{alert.entity}</td>
                      <td className="py-4 pr-4 text-xs font-medium text-gray-600 dark:text-gray-400">{alert.source}</td>
                      <td className="py-4 text-[11px] font-bold text-gray-500">{alert.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 6: DECISIONS REQUIRING ACTION */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Decisions Requiring Action</h2>
            <button className="text-[10px] font-bold uppercase text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">View All</button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionsData}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value" strokeWidth={0}
                  >
                    {decisionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-gray-900 dark:text-gray-100 leading-none">{decisionsTotal}</span>
                <span className="text-[10px] font-bold uppercase text-gray-500 mt-1">Total</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full px-4">
              {decisionsData.map(item => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="font-black text-gray-900 dark:text-gray-100 text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
