with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'r') as f:
    content = f.read()

# 1. Remove the old individual connectors
old_connector = """                  {!isLast && (
                    <div className="flex items-center self-start mt-7 z-[-1]">
                      <div className="w-16 h-[2px] bg-black dark:bg-white relative"></div>
                    </div>
                  )}"""
content = content.replace(old_connector, "")

# 2. Add the absolute line
old_wrapper = """          <div className="relative flex items-start min-w-max">
            {stageNodes.map((stage, idx) => {"""

new_wrapper = """          <div className="relative flex items-start min-w-max">
            {/* Connecting line that goes through all nodes */}
            <div className="absolute top-[1.65rem] left-20 right-20 h-[2px] bg-gray-800 dark:bg-gray-200 z-0"></div>
            {stageNodes.map((stage, idx) => {"""
content = content.replace(old_wrapper, new_wrapper)

# 3. Ensure the node circles have z-10 so they sit on top of the line
old_circle = """                        w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-sm
                        transition-all duration-200 group-hover:scale-105"""

new_circle = """                        relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-sm
                        transition-all duration-200 group-hover:scale-105"""
content = content.replace(old_circle, new_circle)

with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'w') as f:
    f.write(content)

