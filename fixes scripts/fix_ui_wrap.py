with open('frontend/src/pages/CreatePWS.jsx', 'r') as f:
    content = f.read()

# Fix the main wrapper for the header section
old_wrapper = '<div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex flex-col xl:flex-row justify-between items-start gap-8">'
new_wrapper = '<div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6 flex flex-col gap-6">'
content = content.replace(old_wrapper, new_wrapper)

# Fix the title container
old_title_container = """                    <div className="flex-1 min-w-0 w-full break-words">
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-start gap-3 flex-wrap">
                        <FolderPlus size={28} className="shrink-0 mt-1" />
                        <span className="break-words" style={{ wordBreak: 'break-word' }}>{projects.find(p => p.id === selectedProjectId)?.name}</span>
                      </h2>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>"""

new_title_container = """                    <div>
                      <h2 className="text-3xl font-black tracking-tighter text-primary-600 flex items-center gap-3">
                        <FolderPlus size={28} className="shrink-0" />
                        <span>{projects.find(p => p.id === selectedProjectId)?.name}</span>
                      </h2>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-normal mt-2">
                        Hierarchy Management
                      </div>
                    </div>"""
content = content.replace(old_title_container, new_title_container)

# Fix the right side container
old_right_container = '<div className="flex flex-wrap items-start gap-4 w-full xl:w-auto overflow-x-auto pb-4">'
new_right_container = '<div className="w-full overflow-x-auto pb-4">'
content = content.replace(old_right_container, new_right_container)

with open('frontend/src/pages/CreatePWS.jsx', 'w') as f:
    f.write(content)
