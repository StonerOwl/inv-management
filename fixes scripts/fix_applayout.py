with open('frontend/src/components/AppLayout.jsx', 'r') as f:
    content = f.read()

old_theme_button = """            <button onClick={toggleTheme} className="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>"""

new_theme_button = """            <button onClick={toggleTheme} className="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link to="/database" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" title="Database">
              <Database size={20} />
            </Link>"""

content = content.replace(old_theme_button, new_theme_button)

with open('frontend/src/components/AppLayout.jsx', 'w') as f:
    f.write(content)
