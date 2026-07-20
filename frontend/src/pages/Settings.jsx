import React, { useState, useEffect } from 'react';
import { Settings2, Palette, Type, Maximize, PanelLeft, Zap, Info, Check, Layers, Plus, Trash2, Edit2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { listGroups, createGroup, updateGroup, deleteGroup } from '../api/client';
import clsx from 'clsx';

export default function Settings() {
  const { settings, setSettings } = useSettings();

  const handleUpdate = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const THEME_COLORS = [
    { id: 'blue', label: 'Tech Blue', hex: '#2563eb' },
    { id: 'emerald', label: 'Success Emerald', hex: '#059669' },
    { id: 'purple', label: 'Deep Purple', hex: '#9333ea' },
    { id: 'amber', label: 'Warning Amber', hex: '#d97706' },
    { id: 'rose', label: 'Danger Rose', hex: '#e11d48' },
  ];

  const GROUP_COLORS = ['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'];

  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: '', color: 'gray', description: '' });
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await listGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name) return;
    try {
      await createGroup(newGroup);
      setNewGroup({ name: '', color: 'gray', description: '' });
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create group");
    }
  };

  const handleUpdateGroup = async (id, e) => {
    e.preventDefault();
    if (!editingGroup.name) return;
    try {
      await updateGroup(id, editingGroup);
      setEditingGroup(null);
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update group");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm("Are you sure you want to delete this group? Linked invoices will have their group removed.")) {
      try {
        await deleteGroup(id);
        fetchGroups();
      } catch (err) {
        alert("Failed to delete group");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col p-8">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-center gap-4">
          <Settings2 size={40} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Preferences</h1>
            <div className="text-sm font-semibold tracking-normal text-gray-700 dark:text-gray-300 mt-1">
              Customize your interface experience
            </div>
          </div>
        </div>

        <div className="space-y-8 pb-20">

          {/* Invoice Groups */}
          <div className="aiq-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold">Invoice Groups</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">Create groups to categorize invoices when registering them to projects.</p>
            
            <form onSubmit={handleCreateGroup} className="flex gap-4 mb-6 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="aiq-input w-full"
                  required
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="aiq-input w-full"
                />
              </div>
              <div className="w-32">
                <select
                  value={newGroup.color}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
                  className="aiq-input w-full"
                >
                  {GROUP_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="aiq-btn-primary px-4 py-2 flex items-center gap-2 whitespace-nowrap h-[42px]">
                <Plus size={16} /> Add Group
              </button>
            </form>

            <div className="space-y-3">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No groups created yet.</p>
              ) : (
                groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {editingGroup?.id === group.id ? (
                      <form onSubmit={(e) => handleUpdateGroup(group.id, e)} className="flex flex-1 gap-4 items-center">
                        <input
                          type="text"
                          value={editingGroup.name}
                          onChange={(e) => setEditingGroup(prev => ({ ...prev, name: e.target.value }))}
                          className="aiq-input flex-1"
                          required
                        />
                        <input
                          type="text"
                          value={editingGroup.description || ''}
                          onChange={(e) => setEditingGroup(prev => ({ ...prev, description: e.target.value }))}
                          className="aiq-input flex-1"
                          placeholder="Description"
                        />
                        <select
                          value={editingGroup.color}
                          onChange={(e) => setEditingGroup(prev => ({ ...prev, color: e.target.value }))}
                          className="aiq-input w-32"
                        >
                          {GROUP_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button type="submit" className="text-emerald-600 hover:text-emerald-700 font-bold text-sm">Save</button>
                          <button type="button" onClick={() => setEditingGroup(null)} className="text-gray-500 hover:text-gray-700 font-bold text-sm">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={clsx("w-3 h-3 rounded-full", `bg-${group.color}-500`)} />
                            <span className="font-bold text-gray-900 dark:text-gray-100">{group.name}</span>
                          </div>
                          {group.description && <p className="text-xs text-gray-500 mt-1">{group.description}</p>}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setEditingGroup(group)} className="text-gray-400 hover:text-primary-600 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Theme Color */}
          <div className="aiq-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold">Theme Color</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">Select a primary color scheme for the application.</p>
            <div className="flex flex-wrap gap-4">
              {THEME_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate('themeColor', color.id)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    settings.themeColor === color.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  >
                    {settings.themeColor === color.id && <Check size={20} className="text-white" />}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div className="aiq-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Type className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold">Typography</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">Choose a font style that suits your reading preference.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{id: 'sans', label: 'Modern (Sans-serif)', sample: 'Aa', fontClass: 'font-sans'}, 
                {id: 'serif', label: 'Classic (Serif)', sample: 'Aa', fontClass: 'font-serif'}, 
                {id: 'mono', label: 'Technical (Monospace)', sample: 'Aa', fontClass: 'font-mono'}]
                .map(font => (
                <button
                  key={font.id}
                  onClick={() => handleUpdate('fontStyle', font.id)}
                  className={clsx(
                    "p-6 rounded-xl border-2 transition-all text-left flex flex-col gap-4",
                    settings.fontStyle === font.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <span className={clsx("text-4xl text-gray-900 dark:text-gray-100", font.fontClass)}>{font.sample}</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{font.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Border Style */}
          <div className="aiq-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Maximize className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold">Component Style</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">Adjust the corner radius of cards and buttons.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{id: 'sharp', label: 'Sharp (Brutalist)'}, {id: 'rounded', label: 'Rounded (Modern)'}, {id: 'pill', label: 'Pill (Soft)'}].map(style => (
                <button
                  key={style.id}
                  onClick={() => handleUpdate('borderStyle', style.id)}
                  className={clsx(
                    "p-6 border-2 transition-all text-center",
                    style.id === 'sharp' ? 'rounded-none' : style.id === 'rounded' ? 'rounded-xl' : 'rounded-full',
                    settings.borderStyle === style.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <span className="text-sm font-semibold">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Layout */}
          <div className="aiq-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <PanelLeft className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold">Navigation Layout</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">Choose which side the sidebar should appear on.</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleUpdate('sidebarLayout', 'left')}
                className={clsx(
                  "flex-1 p-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3",
                  settings.sidebarLayout === 'left' ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 flex rounded overflow-hidden">
                  <div className="w-4 h-full bg-primary-500"></div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800"></div>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Left Sidebar</span>
              </button>
              <button
                onClick={() => handleUpdate('sidebarLayout', 'right')}
                className={clsx(
                  "flex-1 p-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3",
                  settings.sidebarLayout === 'right' ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 flex rounded overflow-hidden">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800"></div>
                  <div className="w-4 h-full bg-primary-500"></div>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Right Sidebar</span>
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="aiq-card p-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-bold">Reduced Motion</h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Disable animations and transitions for a snappier experience.</p>
            </div>
            <button
              onClick={() => handleUpdate('reducedMotion', !settings.reducedMotion)}
              className={clsx(
                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                settings.reducedMotion ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={clsx(
                  "inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm",
                  settings.reducedMotion ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
