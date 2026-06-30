import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Plus, Paperclip, X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { createNote } from '../api/client';

export default function NoteTarget({ targetType, targetId, as = 'div', className = '', children, ...props }) {
  const { notes, refreshNotes, openDrawer } = useNotes();
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Check if any notes exist for this target
  const targetNotes = notes.filter(n => n.target_type === targetType && n.target_id === String(targetId));
  const hasNotes = targetNotes.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    
    try {
      setSubmitting(true);
      await createNote(targetType, String(targetId), content, files);
      setContent('');
      setFiles([]);
      setShowModal(false);
      await refreshNotes();
    } catch (err) {
      console.error(err);
      alert('Failed to post note');
    } finally {
      setSubmitting(false);
    }
  };

  const Component = as;

  return (
    <Component className={`relative group ${showModal ? 'z-50' : 'z-10'} ${className.replace(/\bz-\d+\b/g, '')}`} {...props}>
      {children}
      
      {/* Visual Marker if notes exist */}
      {hasNotes && (
        <button 
          onClick={(e) => { e.stopPropagation(); openDrawer(); }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-md cursor-pointer z-10 hover:bg-indigo-600 transition-colors"
          title={`${targetNotes.length} notes (Click to open discussions)`}
        >
          <MessageCircle className="w-3.5 h-3.5 text-white" />
        </button>
      )}

      {/* Hover 'Add Note' Icon */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        className={`absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 z-10 transition-all duration-200 ${
          showModal ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Add Note"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Add Note Modal (Inline Popover style) */}
      {showModal && (
        <div 
          className="absolute top-10 right-0 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 z-50 cursor-auto"
          onClick={e => e.stopPropagation()} // prevent clicking inside modal from triggering parent elements
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-sm">Add Note to {targetType}</h4>
            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <textarea
              autoFocus
              rows="3"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-3"
              placeholder="Write a note..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            
            <div className="flex justify-between items-center">
              <label className="cursor-pointer text-slate-500 hover:text-indigo-500 flex items-center gap-1 text-xs">
                <Paperclip className="w-4 h-4" />
                <span>{files.length > 0 ? `${files.length} files` : 'Attach'}</span>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={e => setFiles(Array.from(e.target.files))} 
                />
              </label>
              <button 
                type="submit" 
                disabled={submitting || (!content.trim() && files.length === 0)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Component>
  );
}
