// src/hooks/useSession.js
import { useState, useEffect } from 'react';

export const useSession = () => {
  const [sessionId, setSessionId] = useState(() => {
    // Initialize state directly from sessionStorage if it exists
    return sessionStorage.getItem('activeSessionId') || null;
  });

  const saveSession = (id) => {
    sessionStorage.setItem('activeSessionId', id);
    setSessionId(id);
  };

  const clearSession = () => {
    sessionStorage.removeItem('activeSessionId');
    setSessionId(null);
  };

  return { sessionId, saveSession, clearSession };
};