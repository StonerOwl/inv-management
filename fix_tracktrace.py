with open('frontend/src/pages/analytics/TrackTracePage.jsx', 'r') as f:
    content = f.read()

# Add useNavigate
if 'useNavigate' not in content:
    content = content.replace("import React, { useState, useEffect, useRef } from 'react'", "import React, { useState, useEffect, useRef } from 'react'\nimport { useNavigate } from 'react-router-dom'")

# Inside ProjectsOverview, we need navigate
# Currently it's defined as: function ProjectsOverview({ projects }) {
# I'll inject `const navigate = useNavigate();` inside it.
if 'const navigate = useNavigate();' not in content:
    content = content.replace('function ProjectsOverview({ projects }) {', 'function ProjectsOverview({ projects }) {\n  const navigate = useNavigate();')

# Update the View button to trigger navigate
old_button = '<button className="text-primary-600 hover:text-primary-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1 justify-end w-full">'
new_button = '<button onClick={() => navigate("/app-management/create-pws", { state: { selectedProjectId: p.id, viewMode: "manage" } })} className="text-primary-600 hover:text-primary-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1 justify-end w-full">'
content = content.replace(old_button, new_button)

# Remove min-h-[300px]
content = content.replace('className="aiq-card overflow-hidden relative min-h-[300px]"', 'className="aiq-card overflow-hidden relative"')

with open('frontend/src/pages/analytics/TrackTracePage.jsx', 'w') as f:
    f.write(content)
