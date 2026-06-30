import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getNotes } from '../api/client';

const NotesContext = createContext();

export const useNotes = () => useContext(NotesContext);

export const NotesProvider = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotes();
      setNotes(res.data);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all notes when drawer is opened
  useEffect(() => {
    if (isDrawerOpen) {
      fetchNotes();
    }
  }, [isDrawerOpen, fetchNotes]);

  return (
    <NotesContext.Provider value={{
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      notes,
      loading,
      refreshNotes: fetchNotes
    }}>
      {children}
    </NotesContext.Provider>
  );
};
