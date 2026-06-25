import { Platform } from 'react-native';

const DEV_SOCKET_BASE_BY_PLATFORM = {
  android: 'http://10.0.2.2:3001',
  ios: 'http://localhost:3001',
  default: 'http://localhost:3001',
};

const ENV_PRESETS = {
  development: {
    socketBaseUrl:
      DEV_SOCKET_BASE_BY_PLATFORM[Platform.OS] || DEV_SOCKET_BASE_BY_PLATFORM.default,
  },
  staging: {
    socketBaseUrl: 'https://staging-api.trimride.app',
  },
  production: {
    socketBaseUrl: 'https://api.trimride.app',
  },
};

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getGlobalString(key) {
  const value = global?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

const requestedEnv = getGlobalString('TRIMRIDE_ENV').toLowerCase();
const activeEnv = ENV_PRESETS[requestedEnv]
  ? requestedEnv
  : (__DEV__ ? 'development' : 'production');

const envPreset = ENV_PRESETS[activeEnv];

const overriddenSocketBaseUrl = getGlobalString('TRIMRIDE_SOCKET_URL');
const overriddenApiBaseUrl = getGlobalString('TRIMRIDE_API_BASE_URL');

const socketBaseUrl = normalizeBaseUrl(overriddenSocketBaseUrl || envPreset.socketBaseUrl);
const apiBaseUrl = normalizeBaseUrl(overriddenApiBaseUrl || `${socketBaseUrl}/api`);

export const runtimeConfig = {
  env: activeEnv,
  socketBaseUrl,
  apiBaseUrl,
  healthUrl: `${apiBaseUrl}/health`,
};
