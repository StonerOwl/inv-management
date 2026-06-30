import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { createNote } from '../api/client';
import { X, Paperclip, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function NotesDrawer() {
  const { isDrawerOpen, closeDrawer, notes, refreshNotes, loading } = useNotes();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isDrawerOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    
    try {
      setSubmitting(true);
      // For global notes created from the drawer directly, we'll assign target_type 'global'
      await createNote('global', 'general', content, files);
      setContent('');
      setFiles([]);
      await refreshNotes();
    } catch (err) {
      console.error(err);
      alert('Failed to post note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity" onClick={closeDrawer} />
      
      <div className="absolute inset-y-0 right-0 max-w-md w-full flex pointer-events-auto">
        <div className="w-full h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col transform transition-transform border-l border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Discussions
            </h2>
            <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
            {loading && notes.length === 0 && <div className="text-center text-slate-500">Loading notes...</div>}
            {notes.length === 0 && !loading && (
              <div className="text-center text-slate-500 mt-10">No notes yet. Be the first to start a discussion!</div>
            )}
            
            {notes.map(note => (
              <div key={note.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {note.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{note.username}</span>
                      {note.target_type !== 'global' && (
                        <span className="text-xs text-slate-500 ml-2">
                          on {note.target_type} #{note.target_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {note.created_at ? format(new Date(note.created_at), 'MMM d, h:mm a') : ''}
                  </span>
                </div>
                
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 whitespace-pre-wrap">
                  {note.content}
                </p>

                {note.attachments && note.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.attachments.map(att => (
                      <a 
                        key={att.id} 
                        href={`/api/uploads/notes/${att.file_path.split('/').pop().split('\\').pop()}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Paperclip className="w-3 h-3" />
                        {att.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit}>
              <textarea
                rows="3"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Add a global note..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3">
                <label className="cursor-pointer text-slate-500 hover:text-indigo-500 flex items-center gap-1 text-sm p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Paperclip className="w-4 h-4" />
                  <span>{files.length > 0 ? `${files.length} file(s)` : 'Attach'}</span>
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
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post Note'}
                </button>
              </div>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
