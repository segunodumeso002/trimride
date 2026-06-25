import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

let initAttempted = false;
let currentToken = null;

async function requestUserPermission() {
  try {
    const messagingInstance = messaging();
    if (!messagingInstance || typeof messagingInstance.requestPermission !== 'function') {
      return true;
    }
    return await messagingInstance.requestPermission();
  } catch (_err) {
    // Android < 13 doesn't need explicit permission; ignore errors
    return true;
  }
}

async function getFCMToken() {
  try {
    const messagingInstance = messaging();
    if (!messagingInstance || typeof messagingInstance.getToken !== 'function') {
      return null;
    }
    return await messagingInstance.getToken();
  } catch (err) {
    console.error('FCM: Failed to get token', err);
    return null;
  }
}

async function initializeFCM(onMessageCallback) {
  if (initAttempted) {
    return null;
  }
  initAttempted = true;

  try {
    const messagingInstance = messaging();
    if (!messagingInstance) {
      console.error('FCM: Initialization failed - messaging instance unavailable');
      return null;
    }

    // Request permission
    await requestUserPermission();

    // Handle incoming messages in foreground
    const unsubscribeForeground =
      typeof messagingInstance.onMessage === 'function'
        ? messagingInstance.onMessage(async remoteMessage => {
            if (onMessageCallback) {
              onMessageCallback(remoteMessage);
            }
          })
        : null;

    // Handle notification tap when app is backgrounded
    if (typeof messagingInstance.onNotificationOpenedApp === 'function') {
      messagingInstance.onNotificationOpenedApp(remoteMessage => {
        if (remoteMessage && onMessageCallback) {
          onMessageCallback(remoteMessage);
        }
      });
    }

    // Get initial notification if app was launched from notification
    if (typeof messagingInstance.getInitialNotification === 'function') {
      messagingInstance.getInitialNotification().then(remoteMessage => {
        if (remoteMessage && onMessageCallback) {
          onMessageCallback(remoteMessage);
        }
      });
    }

    return unsubscribeForeground;
  } catch (err) {
    console.error('FCM: Initialization failed', err);
    return null;
  }
}

async function registerTokenWithBackend(token, authToken) {
  if (!token || !authToken) {
    return false;
  }

  try {
    const deviceId = `rn-${Platform.OS}`;
    await apiClient.registerPushToken(authToken, token, Platform.OS, deviceId);
    currentToken = token;
    return true;
  } catch (err) {
    console.error('FCM: Failed to register token with backend', err);
    return false;
  }
}

async function unregisterTokenFromBackend(authToken) {
  if (!currentToken || !authToken) {
    return false;
  }

  try {
    await apiClient.unregisterPushToken(authToken, currentToken);
    currentToken = null;
    return true;
  } catch (err) {
    console.error('FCM: Failed to unregister token', err);
    return false;
  }
}

export const fcmService = {
  initializeFCM,
  getFCMToken,
  registerTokenWithBackend,
  unregisterTokenFromBackend,
};
