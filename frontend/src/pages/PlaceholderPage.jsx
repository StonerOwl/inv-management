import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function PlaceholderPage({ title }) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <LayoutDashboard size={64} className="text-primary-600 opacity-50 mb-8" />
      <h1 className="text-4xl font-black tracking-tighter  text-primary-600 mb-4">
        {title || 'Coming Soon'}
      </h1>
      <p className="text-gray-400 font-bold font-semibold tracking-normal text-sm">
        This page is currently under construction.
      </p>
    </div>
  );
}
