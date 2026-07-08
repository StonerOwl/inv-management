with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'r') as f:
    content = f.read()

# 1. Update the line to be black
old_line = """            <div className="absolute top-[1.65rem] h-px bg-gray-300 dark:bg-gray-600 z-0" style={{ left: `${100 / (2 * stageNodes.length)}%`, right: `${100 / (2 * stageNodes.length)}%` }}></div>"""
new_line = """            <div className="absolute top-[1.65rem] h-px bg-black dark:bg-white z-0" style={{ left: `${100 / (2 * stageNodes.length)}%`, right: `${100 / (2 * stageNodes.length)}%` }}></div>"""
content = content.replace(old_line, new_line)

# 2. Update the default nodes outline to be black
old_default_node = "'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 group-hover:border-primary-400'"
new_default_node = "'border-black dark:border-white bg-white dark:bg-gray-800 text-black dark:text-white group-hover:border-primary-400'"
content = content.replace(old_default_node, new_default_node)

with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'w') as f:
    f.write(content)

