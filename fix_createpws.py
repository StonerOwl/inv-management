import re

with open('frontend/src/pages/CreatePWS.jsx', 'r') as f:
    content = f.read()

# Remove batch_id badge from project in tree view
# Around line 365:
# {p.batch_id && (
#   <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 border border-gray-200 dark:border-gray-700">
#     BATCH: {p.batch_id}
#   </span>
# )}
batch_badge_regex = re.compile(r'\{p\.batch_id && \(\s*<span className="bg-gray-100.*?BATCH: \{p\.batch_id\}.*?</span>\s*\)\}', re.DOTALL)
content = batch_badge_regex.sub('', content)

# Add batch_id badge to workflow in tree view
# Around line 398:
# <ChevronRight size={18} className="group-open/wf:rotate-90 transition-transform text-gray-400" />
# <GitBranch size={18} className="text-gray-500" /> {wf.name}
wf_tree_regex = re.compile(r'(<GitBranch size=\{18\} className="text-gray-500" /> \{wf\.name\})')
wf_tree_new = r'\1 {wf.batch_id && <span className="ml-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 font-mono">BATCH: {wf.batch_id}</span>}'
content = wf_tree_regex.sub(wf_tree_new, content)

# Update Manage View - Project Details panel
# Remove Batch ID row
batch_id_row_regex = re.compile(r'<div className="text-gray-700 dark:text-gray-300">Batch ID</div><div className="font-bold text-primary-600 dark:text-primary-400">\{p\.batch_id\}</div>')
content = batch_id_row_regex.sub('', content)

# Remove the QR code for Batch ID
# <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
#   <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Batch ID</div>
#   <div className="text-xl font-black text-primary-600 dark:text-primary-400 mb-2">{p.batch_id}</div>
#   <QRCode value={p.batch_id} size={64} className="bg-white p-1 rounded" />
# </div>
qr_batch_regex = re.compile(r'<div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">\s*<div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Batch ID</div>\s*<div className="text-xl font-black text-primary-600 dark:text-primary-400 mb-2">\{p\.batch_id\}</div>\s*<QRCode value=\{p\.batch_id\} size=\{64\} className="bg-white p-1 rounded" />\s*</div>', re.DOTALL)
content = qr_batch_regex.sub('', content)

# Rename "Project Batch Details" to "Project Details"
content = content.replace('Project Batch Details', 'Project Details')

# We need to show workflow batch ID in the Manage view where workflows are listed
# Around line 635:
# <div className="p-2 bg-[#222] text-primary-600"><GitBranch size={16} /></div>
# <span className="font-bold text-lg">{wf.name}</span>
wf_manage_regex = re.compile(r'(<span className="font-bold text-lg">\{wf\.name\}</span>)')
wf_manage_new = r'\1 {wf.batch_id && <span className="ml-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-600 font-mono tracking-wider">BATCH: {wf.batch_id}</span>}'
content = wf_manage_regex.sub(wf_manage_new, content)

with open('frontend/src/pages/CreatePWS.jsx', 'w') as f:
    f.write(content)

