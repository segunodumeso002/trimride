import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState(() => [
    { id: 'hist_1', title: '💈 TrimRide Customer Ready', message: 'Your booking radar is calibrated to detect nearby professional barbers.', type: 'system', icon: '💈', time: 'Just now' },
    { id: 'hist_2', title: '💳 Fast Payout Checkout', message: 'Tipping & payment transactions flow directly to participating barbers.', type: 'system', icon: '💳', time: '5m ago' }
  ]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const addNotification = useCallback((input) => {
    const payload = typeof input === 'string' ? { title: 'TrimRide Alert', message: input, type: 'general', icon: '🔔' } : input;
    const next = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: payload.title || 'TrimRide Notice',
      message: payload.message || '',
      type: payload.type || 'general',
      icon: payload.icon || '🔔',
      time: 'Just now',
    };

    if (vibrationEnabled) {
      try {
        Vibration.vibrate([0, 250, 100, 250]);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      } catch (e) {}
    }

    setItems(prev => [next, ...prev].slice(0, 3));
    setHistory(prev => [next, ...prev].slice(0, 30));

    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== next.id));
    }, 6000);
  }, [vibrationEnabled]);

  const removeNotification = useCallback((id) => {
    try { ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); } catch (e) {}
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    try { ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true }); } catch (e) {}
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({ items, history, addNotification, removeNotification, clearHistory, soundEnabled, setSoundEnabled, vibrationEnabled, setVibrationEnabled }),
    [items, history, addNotification, removeNotification, clearHistory, soundEnabled, vibrationEnabled]
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
