import re

with open('frontend/src/pages/CreatePWS.jsx', 'r') as f:
    content = f.read()

# Add useLocation
if 'useLocation' not in content:
    content = content.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';\nimport { useLocation } from 'react-router-dom';")

# Inside CreatePWS component
# export default function CreatePWS() {
#   const [viewMode, setViewMode] = useState('tree'); // 'tree', 'create', 'manage'
old_init = "export default function CreatePWS() {\n  const [viewMode, setViewMode] = useState('tree'); // 'tree', 'create', 'manage'"
new_init = "export default function CreatePWS() {\n  const location = useLocation();\n  const [viewMode, setViewMode] = useState(location.state?.viewMode || 'tree');"
content = content.replace(old_init, new_init)

# The selectedProjectId state initialization
old_proj_state = "const [selectedProjectId, setSelectedProjectId] = useState(null);"
new_proj_state = "const [selectedProjectId, setSelectedProjectId] = useState(location.state?.selectedProjectId || null);"
content = content.replace(old_proj_state, new_proj_state)

with open('frontend/src/pages/CreatePWS.jsx', 'w') as f:
    f.write(content)

