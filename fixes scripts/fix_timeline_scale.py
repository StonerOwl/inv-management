with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'r') as f:
    content = f.read()

# 1. Update the wrapper and connecting line
old_wrapper = """          <div className="relative flex items-start min-w-max">
            {/* Connecting line that goes through all nodes */}
            <div className="absolute top-[1.65rem] left-20 right-20 h-[2px] bg-gray-800 dark:bg-gray-200 z-0"></div>"""

new_wrapper = """          <div className="relative flex items-start w-full min-w-max">
            {/* Connecting line that goes through all nodes */}
            <div className="absolute top-[1.65rem] h-px bg-gray-300 dark:bg-gray-600 z-0" style={{ left: `${100 / (2 * stageNodes.length)}%`, right: `${100 / (2 * stageNodes.length)}%` }}></div>"""
content = content.replace(old_wrapper, new_wrapper)

# 2. Update the node container to flex-1 and center
old_node = """                <div key={stage.id} className="relative flex items-start">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="group relative flex flex-col items-center focus:outline-none w-40"
                    >"""

new_node = """                <div key={stage.id} className="relative flex items-start flex-1">
                  <div className="flex flex-col items-center w-full">
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="group relative flex flex-col items-center focus:outline-none w-full max-w-[160px]"
                    >"""
content = content.replace(old_node, new_node)

with open('frontend/src/pages/analytics/WorkflowTimeline.jsx', 'w') as f:
    f.write(content)

