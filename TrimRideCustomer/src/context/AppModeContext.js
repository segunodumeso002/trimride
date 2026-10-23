import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, disconnectSocket } from '../services/socketClient';
import { useNotifications } from './NotificationContext';
import { apiClient, setUnauthorizedHandler } from '../services/apiClient';
import { fcmService } from '../services/fcmService';

const SESSION_KEY = 'trimride.customer.session';
const ENABLE_FCM = true;

const AppModeContext = createContext(null);

export function AppModeProvider({ children, defaultRole }) {
  const [role, setRole] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isFirstLoginSession, setIsFirstLoginSession] = useState(false);
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

          const mergedUser = {
            ...parsed.user,
            ...nextUser,
            country: nextUser.country || parsed.user?.country || '',
            phone: nextUser.phone || parsed.user?.phone || '',
          };

          setToken(parsed.token);
          setUser(mergedUser);
          setRole(mergedUser.userType);
          setIsSignedIn(true);
          setIsFirstLoginSession(false);
          attachSocketListeners(parsed.token, mergedUser.userType);

          // Persist refreshed user details back to session storage
          await AsyncStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ token: parsed.token, user: mergedUser })
          );

          if (ENABLE_FCM) {
            // Re-register FCM token on session restore
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
        setIsFirstLoginSession(false);
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
      setIsFirstLoginSession(false);
      AsyncStorage.removeItem(SESSION_KEY);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Initialize FCM and set up foreground message listener
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

  const establishSession = useCallback(async ({ token: nextToken, user: nextUser, isFirstLogin = false }) => {
    const normalizedUser = {
      ...nextUser,
      userType: nextUser.userType || nextUser.user_type,
      country: nextUser.country || '',
      phone: nextUser.phone || '',
    };

    setToken(nextToken);
    setUser(normalizedUser);
    setRole(normalizedUser.userType);
    setIsSignedIn(true);
    setIsFirstLoginSession(Boolean(isFirstLogin));

    attachSocketListeners(nextToken, normalizedUser.userType);

    if (ENABLE_FCM) {
      // Register FCM token with backend after establishing session
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
      isFirstLoginSession,
      consumeFirstLoginSession: () => setIsFirstLoginSession(false),
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
          // Unregister FCM token if we have a current token
          if (token) {
            await fcmService.unregisterTokenFromBackend(token).catch(() => {});
          }
        }
        
        setToken(null);
        setUser(null);
        setRole(null);
        setIsSignedIn(false);
        setIsFirstLoginSession(false);
        AsyncStorage.removeItem(SESSION_KEY);
      },
    }),
    [role, isSignedIn, token, user, isRestoring, isFirstLoginSession, establishSession]
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
