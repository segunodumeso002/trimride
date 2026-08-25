import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, disconnectSocket } from '../services/socketClient';
import { useNotifications } from './NotificationContext';
import { apiClient, setUnauthorizedHandler } from '../services/apiClient';
import { fcmService } from '../services/fcmService';

const SESSION_KEY = 'trimride.barber.session';
const ENABLE_FCM = true;

const AppModeContext = createContext(null);

export function AppModeProvider({ children, defaultRole }) {
  const [role, setRole] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const { addNotification } = useNotifications();

  const attachSocketListeners = useCallback((sessionToken, userType) => {
    const socket = connectSocket(sessionToken);

    // Only barbers receive "new booking request" notifications
    if (userType === 'barber') {
      socket.on('booking-requested', () => {
        addNotification('New booking request just arrived.');
      });
    }

    // Only customers receive booking status change notifications
    if (userType === 'customer') {
      socket.on('booking-status-updated', data => {
        addNotification(`Booking status changed to ${data.status}.`);
      });
    }
  }, [addNotification]);

  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw) {
          setIsRestoring(false);
          return;
        }

        const parsed = JSON.parse(raw);
        if (parsed?.token) {
          const mePayload = await apiClient.getMe(parsed.token);
          const nextUser = mePayload?.user;

          if (!nextUser?.userType) {
            throw new Error('Invalid session payload');
          }

          setToken(parsed.token);
          setUser(nextUser);
          setRole(nextUser.userType);
          setIsSignedIn(true);
          attachSocketListeners(parsed.token, nextUser.userType);
          if (ENABLE_FCM) {
            const fcmToken = await fcmService.getFCMToken();
            if (fcmToken) {
              fcmService.registerTokenWithBackend(fcmToken, parsed.token).catch(() => {});
            }
          }
        }
      } catch (_error) {
        await AsyncStorage.removeItem(SESSION_KEY);
        disconnectSocket();
        setToken(null);
        setUser(null);
        setRole(null);
        setIsSignedIn(false);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [attachSocketListeners]);

  // Register the 401 auto-sign-out interceptor once on mount.
  // Any API call that gets a 401 (expired/invalid token) will call signOut()
  // automatically, returning the user to the landing screen.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      disconnectSocket();
      setToken(null);
      setUser(null);
      setRole(null);
      setIsSignedIn(false);
      AsyncStorage.removeItem(SESSION_KEY);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  React.useEffect(() => {
    if (!ENABLE_FCM) {
      return;
    }

    const initFCM = async () => {
      await fcmService.initializeFCM(remoteMessage => {
        if (remoteMessage?.notification) {
          addNotification(remoteMessage.notification.body || remoteMessage.notification.title || 'New notification');
        }
      });
    };

    initFCM().catch(() => {});
  }, [addNotification]);

  const establishSession = useCallback(async ({ token: nextToken, user: nextUser }) => {
    const normalizedUser = {
      ...nextUser,
      userType: nextUser.userType || nextUser.user_type,
    };

    setToken(nextToken);
    setUser(normalizedUser);
    setRole(normalizedUser.userType);
    setIsSignedIn(true);

    attachSocketListeners(nextToken, normalizedUser.userType);

    if (ENABLE_FCM) {
      const fcmToken = await fcmService.getFCMToken();
      if (fcmToken) {
        fcmService.registerTokenWithBackend(fcmToken, nextToken).catch(() => {});
      }
    }

    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: nextToken, user: normalizedUser })
    );
  }, [attachSocketListeners]);

  const value = useMemo(
    () => ({
      role,
      isSignedIn,
      token,
      user,
      isRestoring,
      establishSession,
      signInAsCustomer: () => {
        setRole('customer');
        setIsSignedIn(true);
      },
      signInAsBarber: () => {
        setRole('barber');
        setIsSignedIn(true);
      },
      signOut: async () => {
        disconnectSocket();

        if (ENABLE_FCM) {
          if (token) {
            await fcmService.unregisterTokenFromBackend(token).catch(() => {});
          }
        }

        setToken(null);
        setUser(null);
        setRole(null);
        setIsSignedIn(false);
        AsyncStorage.removeItem(SESSION_KEY);
      },
    }),
    [role, isSignedIn, token, user, isRestoring, establishSession]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used inside AppModeProvider');
  }
  return context;
}
