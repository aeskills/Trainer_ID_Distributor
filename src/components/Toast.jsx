import React, { useState, useEffect, useRef, useCallback } from 'react';

const TOAST_ICONS = { success: '✅', warning: '⚠️', info: 'ℹ️' };

let addToastExternal = null;

export function showToast(msg, type = 'info') {
  if (addToastExternal) {
    addToastExternal(msg, type);
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((msg, type) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    addToastExternal = addToast;
    return () => { addToastExternal = null; };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{TOAST_ICONS[t.type] || '📌'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
