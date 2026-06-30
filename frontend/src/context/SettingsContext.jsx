import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultSettings = {
  themeColor: 'blue',
  fontStyle: 'sans', // 'sans', 'serif', 'mono'
  borderStyle: 'rounded', // 'sharp', 'rounded', 'pill'
  sidebarLayout: 'left', // 'left', 'right'
  reducedMotion: false
};

const SettingsContext = createContext();

const THEMES = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22'
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
    500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
  }
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (e) {
      console.error("Failed to parse settings from local storage", e);
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));

    // Apply Theme
    const themeColors = THEMES[settings.themeColor] || THEMES.blue;
    Object.entries(themeColors).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, hexToRgb(hex));
    });

    // Apply Font
    document.body.classList.remove('font-sans', 'font-serif', 'font-mono');
    document.body.classList.add(`font-${settings.fontStyle}`);

    // Apply Reduced Motion
    if (settings.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }

    // Apply Border Style
    document.body.classList.remove('radius-sharp', 'radius-rounded', 'radius-pill');
    if (settings.borderStyle !== 'rounded') {
      document.body.classList.add(`radius-${settings.borderStyle}`);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    console.warn("useSettings must be used within a SettingsProvider");
    return { settings: defaultSettings, setSettings: () => {} };
  }
  return context;
};
