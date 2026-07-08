import re

with open('frontend/src/pages/CreatePWS.jsx', 'r') as f:
    content = f.read()

# Replace the layout wrapper for the Manage Project header
# From:
# <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex justify-between items-start">
# To:
# <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex flex-col xl:flex-row justify-between items-start gap-8">
old_wrapper = '<div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex justify-between items-start">'
new_wrapper = '<div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex flex-col xl:flex-row justify-between items-start gap-8">'
content = content.replace(old_wrapper, new_wrapper)

# Make the title wrap
old_title_div = """                    <div>
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-center gap-3">
                        <FolderPlus size={28} />
                        {projects.find(p => p.id === selectedProjectId)?.name}
                      </h2>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>"""

new_title_div = """                    <div className="flex-1 min-w-0 w-full break-words">
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-start gap-3 flex-wrap">
                        <FolderPlus size={28} className="shrink-0 mt-1" />
                        <span className="break-words" style={{ wordBreak: 'break-word' }}>{projects.find(p => p.id === selectedProjectId)?.name}</span>
                      </h2>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>"""
content = content.replace(old_title_div, new_title_div)

# Change the gap/wrap for the cards area
old_cards_wrapper = '<div className="flex items-center gap-4">'
new_cards_wrapper = '<div className="flex flex-wrap items-start gap-4 w-full xl:w-auto overflow-x-auto pb-4">'
content = content.replace(old_cards_wrapper, new_cards_wrapper)

# Add the batch IDs to the right side
# The layout is currently:
# <div className="flex gap-6">
#   <div className="bg-gray-50 ... min-w-[300px]">...Project Details...</div>
#   <div className="flex flex-col gap-4">
#     <div className="...">...Project ID QR...</div>
#     <button>...Delete...</button>
#   </div>
# </div>

# Let's change it so we have a horizontal flex for all QRs
old_right_col = """                            <div className="flex flex-col gap-4">
                              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Project ID</div>
                                <div className="text-xl font-black text-primary-600 dark:text-primary-400 mb-2">{p.project_code}</div>
                                <QRCode value={p.project_code} size={64} className="bg-white p-1 rounded" />
                              </div>
                              
                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                className="mt-auto px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 font-bold text-sm transition-colors flex items-center justify-center gap-2 rounded-lg"
                              >
                                <Trash2 size={16} /> Delete Project
                              </button>
                            </div>"""

new_right_col = """                            <div className="flex flex-wrap gap-4">
                              <div className="flex flex-col gap-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-[180px] w-[160px] shrink-0">
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Project ID</div>
                                  <div className="text-sm font-black text-primary-600 dark:text-primary-400 mb-2 truncate" title={p.project_code}>{p.project_code}</div>
                                  <QRCode value={p.project_code} size={80} className="bg-white p-1 rounded" />
                                </div>
                                <button
                                  onClick={() => handleDeleteProject(p.id)}
                                  className="mt-auto px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 font-bold text-sm transition-colors flex items-center justify-center gap-2 rounded-lg"
                                >
                                  <Trash2 size={16} /> Delete Project
                                </button>
                              </div>
                              
                              <div className="flex gap-4 overflow-x-auto pb-2">
                                {(projectWorkflows[p.id] || []).map(wId => {
                                  const wf = workflows.find(w => w.id === wId);
                                  if (!wf || !wf.batch_id) return null;
                                  return (
                                    <div key={wf.id} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-[180px] w-[160px] shrink-0">
                                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-1 truncate" title={`Batch ID (${wf.name})`}>Batch ID ({wf.name})</div>
                                      <div className="text-sm font-black text-primary-600 dark:text-primary-400 mb-2 truncate" title={wf.batch_id}>{wf.batch_id}</div>
                                      <QRCode value={wf.batch_id} size={80} className="bg-white p-1 rounded" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>"""
content = content.replace(old_right_col, new_right_col)

# Also fix the outer flex for the details section
# <div className="flex gap-6"> -> <div className="flex flex-col xl:flex-row gap-6 w-full">
content = content.replace('<div className="flex gap-6">', '<div className="flex flex-col xl:flex-row gap-6 w-full">')

with open('frontend/src/pages/CreatePWS.jsx', 'w') as f:
    f.write(content)

