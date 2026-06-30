import React from 'react';
import { Settings2, Palette, Type, Maximize, PanelLeft, Zap, Info, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
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

  return (
    <div className="min-h-screen bg-surface-900 text-surface-50 font-sans flex flex-col p-8">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-12 border-b border-surface-200 pb-6 flex items-center gap-4">
          <Settings2 size={40} className="text-primary-600" />
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-surface-50">Preferences</h1>
            <div className="text-sm font-bold tracking-normal text-surface-400 mt-1">
              Customize your interface experience
            </div>
          </div>
        </div>

        <div className="space-y-8 pb-20">

          {/* Theme Color */}
          <div className="glass-card p-8 border border-surface-200 bg-surface-800">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-primary-600" />
              <h2 className="text-xl font-bold">Theme Color</h2>
            </div>
            <p className="text-surface-400 text-sm mb-6">Select a primary color scheme for the application.</p>
            <div className="flex flex-wrap gap-4">
              {THEME_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate('themeColor', color.id)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    settings.themeColor === color.id ? "border-primary-500 bg-surface-700" : "border-surface-200 bg-surface-800 hover:border-surface-400"
                  )}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: color.hex }}
                  >
                    {settings.themeColor === color.id && <Check size={20} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-surface-300">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div className="glass-card p-8 border border-surface-200 bg-surface-800">
            <div className="flex items-center gap-3 mb-6">
              <Type className="text-primary-600" />
              <h2 className="text-xl font-bold">Typography</h2>
            </div>
            <p className="text-surface-400 text-sm mb-6">Choose a font style that suits your reading preference.</p>
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
                    settings.fontStyle === font.id ? "border-primary-500 bg-primary-500/10" : "border-surface-200 hover:border-surface-400"
                  )}
                >
                  <span className={clsx("text-4xl text-surface-50", font.fontClass)}>{font.sample}</span>
                  <span className="text-sm font-bold text-surface-300">{font.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Border Style */}
          <div className="glass-card p-8 border border-surface-200 bg-surface-800">
            <div className="flex items-center gap-3 mb-6">
              <Maximize className="text-primary-600" />
              <h2 className="text-xl font-bold">Component Style</h2>
            </div>
            <p className="text-surface-400 text-sm mb-6">Adjust the corner radius of cards and buttons.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{id: 'sharp', label: 'Sharp (Brutalist)'}, {id: 'rounded', label: 'Rounded (Modern)'}, {id: 'pill', label: 'Pill (Soft)'}].map(style => (
                <button
                  key={style.id}
                  onClick={() => handleUpdate('borderStyle', style.id)}
                  className={clsx(
                    "p-6 border-2 transition-all text-center",
                    style.id === 'sharp' ? 'rounded-none' : style.id === 'rounded' ? 'rounded-xl' : 'rounded-full',
                    settings.borderStyle === style.id ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-surface-200 text-surface-300 hover:border-surface-400"
                  )}
                >
                  <span className="text-sm font-bold">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Layout */}
          <div className="glass-card p-8 border border-surface-200 bg-surface-800">
            <div className="flex items-center gap-3 mb-6">
              <PanelLeft className="text-primary-600" />
              <h2 className="text-xl font-bold">Navigation Layout</h2>
            </div>
            <p className="text-surface-400 text-sm mb-6">Choose which side the sidebar should appear on.</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleUpdate('sidebarLayout', 'left')}
                className={clsx(
                  "flex-1 p-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3",
                  settings.sidebarLayout === 'left' ? "border-primary-500 bg-primary-500/10" : "border-surface-200 hover:border-surface-400"
                )}
              >
                <div className="w-16 h-12 bg-surface-700 flex rounded overflow-hidden">
                  <div className="w-4 h-full bg-primary-500"></div>
                  <div className="flex-1 bg-surface-600"></div>
                </div>
                <span className="text-sm font-bold text-surface-300">Left Sidebar</span>
              </button>
              <button
                onClick={() => handleUpdate('sidebarLayout', 'right')}
                className={clsx(
                  "flex-1 p-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3",
                  settings.sidebarLayout === 'right' ? "border-primary-500 bg-primary-500/10" : "border-surface-200 hover:border-surface-400"
                )}
              >
                <div className="w-16 h-12 bg-surface-700 flex rounded overflow-hidden">
                  <div className="flex-1 bg-surface-600"></div>
                  <div className="w-4 h-full bg-primary-500"></div>
                </div>
                <span className="text-sm font-bold text-surface-300">Right Sidebar</span>
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="glass-card p-8 border border-surface-200 bg-surface-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-primary-600" />
                <h2 className="text-xl font-bold">Reduced Motion</h2>
              </div>
              <p className="text-surface-400 text-sm">Disable animations and transitions for a snappier experience.</p>
            </div>
            <button
              onClick={() => handleUpdate('reducedMotion', !settings.reducedMotion)}
              className={clsx(
                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                settings.reducedMotion ? 'bg-primary-500' : 'bg-surface-600'
              )}
            >
              <span
                className={clsx(
                  "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
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
