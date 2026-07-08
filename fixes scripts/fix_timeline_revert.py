with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'r') as f:
    content = f.read()

# 1. Revert process dots to simple text
old_process = """                                  <div className="pt-1 min-w-0 flex-1 pr-6 relative group/dropdown">
                                    <p className={`text-[11px] font-semibold leading-tight ${proc.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {proc.name}
                                    </p>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/dropdown:opacity-100 transition-opacity">
                                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                      </button>
                                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-20">
                                        <div className="py-1">
                                          <button className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">Thermal Image</button>
                                          <button className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">Quality Notes</button>
                                          <button className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">Process Logs</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>"""

new_process = """                                  <div className="pt-1 min-w-0 flex-1">
                                    <p className={`text-[11px] font-semibold leading-tight ${proc.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {proc.name}
                                    </p>
                                  </div>"""
content = content.replace(old_process, new_process)

# 2. Change arrow to black line
old_arrow = """                  {!isLast && (
                    <div className="flex items-center mx-0 self-start mt-6 -ml-2">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 relative rounded-full">
                        <div className="h-full bg-primary-400 transition-all duration-700 rounded-full" style={{ width: `${stage.progress}%` }} />
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 -ml-2 z-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}"""

new_arrow = """                  {!isLast && (
                    <div className="flex items-center self-start mt-7 z-[-1]">
                      <div className="w-16 h-[2px] bg-black dark:bg-white relative"></div>
                    </div>
                  )}"""
content = content.replace(old_arrow, new_arrow)

# 3. Add dropdown to bottom legend
old_legend = """          <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-5 text-xs text-gray-700 dark:text-gray-300">
            <LegendItem color="bg-primary-600" label="Active stage" />
            <LegendItem color="bg-emerald-500" label="Completed" />
            <LegendItem color="bg-gray-300 dark:bg-gray-600" label="Not started" />
            <LegendItem color="bg-violet-200 dark:bg-violet-900" label="Process" />
          </div>"""

new_legend = """          <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center flex-wrap gap-5 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap gap-5">
              <LegendItem color="bg-primary-600" label="Active stage" />
              <LegendItem color="bg-emerald-500" label="Completed" />
              <LegendItem color="bg-gray-300 dark:bg-gray-600" label="Not started" />
              <LegendItem color="bg-violet-200 dark:bg-violet-900" label="Process" />
            </div>
            <div>
              <select className="aiq-input text-xs py-2 px-3 min-w-[160px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm font-semibold cursor-pointer">
                <option value="none">Default View</option>
                <option value="quality">Quality Notes</option>
                <option value="thermal">Thermal Image</option>
                <option value="logs">Process Logs</option>
              </select>
            </div>
          </div>"""
content = content.replace(old_legend, new_legend)

with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'w') as f:
    f.write(content)

