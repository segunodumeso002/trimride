import React, { createContext, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);

  const addNotification = message => {
    const next = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
    };

    setItems(prev => [next, ...prev].slice(0, 3));

    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== next.id));
    }, 5000);
  };

  const value = useMemo(
    () => ({ items, addNotification }),
    [items]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}
