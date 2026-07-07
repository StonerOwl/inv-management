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
      

    </Component>
  );
}
