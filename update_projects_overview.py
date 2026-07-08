import re

with open('frontend/src/pages/analytics/TrackTracePage.jsx', 'r') as f:
    content = f.read()

# Add lucide-react imports if missing
if 'lucide-react' not in content:
    content = content.replace("import React, { useState, useEffect, useRef } from 'react'", 
                              "import React, { useState, useEffect, useRef } from 'react'\nimport { FolderPlus, Search, Filter, RefreshCw, Activity, ChevronRight } from 'lucide-react'")

old_projects_overview = """function ProjectsOverview({ projects }) {
  const liveProjects = projects.filter(p => {
    if (!p.start_date || !p.target_date) return false;
    const now = new Date();
    const start = new Date(p.start_date);
    const target = new Date(p.target_date);
    return now >= start && now <= target;
  });

  return (
    <div className="px-6 pt-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Live Projects Overview</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="aiq-card p-6 flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Total Live Projects</p>
          <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{liveProjects.length}</p>
        </div>
        <div className="aiq-card p-6 flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Total Projects</p>
          <p className="text-4xl font-black text-primary-600 dark:text-primary-400">{projects.length}</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Live Projects List</h3>
      {liveProjects.length === 0 ? (
        <div className="p-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50">
          No live projects currently.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveProjects.map(p => (
            <div key={p.id} className="aiq-card p-5">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900 dark:text-gray-100">{p.name}</h4>
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black tracking-wider rounded-md border border-emerald-200 dark:border-emerald-800">LIVE</span>
              </div>
              <div className="flex gap-4 text-xs mt-3">
                {p.project_code && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[9px] mb-0.5">Project ID</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{p.project_code}</p>
                  </div>
                )}
                {p.batch_id && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[9px] mb-0.5">Batch ID</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{p.batch_id}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}"""

new_projects_overview = """function ProjectsOverview({ projects }) {
  const liveProjects = projects.filter(p => {
    if (!p.start_date || !p.target_date) return false;
    const now = new Date();
    const start = new Date(p.start_date);
    const target = new Date(p.target_date);
    return now >= start && now <= target;
  });

  return (
    <div className="px-6 pt-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="aiq-card p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <FolderPlus size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Projects</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{projects.length}</p>
        </div>
        <div className="aiq-card p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Projects in progress</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{liveProjects.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Live Projects</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="aiq-input pl-9 pr-4 py-2 min-w-[250px]"
            />
          </div>
          <button className="aiq-btn-ghost flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] px-4">
            <Filter size={16} /> Filters
          </button>
          <button className="aiq-btn-ghost flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[42px] w-[42px] p-0">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="aiq-card overflow-hidden relative min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold tracking-wider uppercase">
            <tr>
              <th className="py-4 px-6">Project Name</th>
              <th className="py-4 px-6">Project ID</th>
              <th className="py-4 px-6">Start Date</th>
              <th className="py-4 px-6">Target Date</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200">
            {liveProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-700 dark:text-gray-300 font-semibold">
                  No live projects found.
                </td>
              </tr>
            ) : (
              liveProjects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="py-4 px-6 font-semibold" title={p.name}>{p.name}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.project_code || p.id}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.start_date || '—'}</td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{p.target_date || '—'}</td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black tracking-wider rounded-md border border-emerald-200 dark:border-emerald-800">IN PROGRESS</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-primary-600 hover:text-primary-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1 justify-end w-full">
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}"""

content = content.replace(old_projects_overview, new_projects_overview)

with open('frontend/src/pages/analytics/TrackTracePage.jsx', 'w') as f:
    f.write(content)
