import { runtimeConfig } from '../config/runtimeConfig';

const API_BASE_URL = runtimeConfig.apiBaseUrl;

/**
 * Typed error class so callers can distinguish network failures from API errors.
 *
 *   catch (err) {
 *     if (err instanceof ApiError && err.isNetworkError) { showOfflineBanner(); }
 *     else { showToast(err.message); }
 *   }
 */
export class ApiError extends Error {
  /** HTTP status code (0 when there is no response at all, e.g. offline) */
  status;
  /** true when the device had no connectivity / server was unreachable */
  isNetworkError;

  constructor(message, status = 0, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Registered by AppModeContext on mount. Called automatically whenever any
 * request receives a 401 so the user is signed out instead of getting stuck.
 */
let _unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  _unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

async function request(endpoint, options = {}) {
  // Always set Accept and Content-Type for Android fetch compatibility
  const mergedHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If body is an object, sanitize and stringify
  let body = options.body;
  if (body && typeof body === 'object') {
    // Remove undefined/null fields
    const sanitized = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined));
    body = JSON.stringify(sanitized);
  }

  const fetchOptions = {
    ...options,
    headers: mergedHeaders,
    ...(body ? { body } : {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
  } catch (networkErr) {
    throw new ApiError(
      'No internet connection. Please check your network and try again.',
      0,
      true
    );
  }

  const rawBody = await response.text().catch(() => '');
  let data = {};
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (_parseErr) {
      data = { error: rawBody.trim() };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && _unauthorizedHandler) {
      _unauthorizedHandler();
    }

    const fallbackMessage =
      response.status === 429
        ? 'Too many requests right now. Please try again in a moment.'
        : `Request failed (${response.status})`;

    throw new ApiError(
      data.error || data.message || fallbackMessage,
      response.status,
      false
    );
  }

  return data;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiClient = {
  login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe(token) {
    return request('/auth/me', {
      headers: authHeader(token),
    });
  },

  getDispatchBarbers(lat, lng, limit = 5, serviceType = '', customerId = null) {
    const encodedService = encodeURIComponent(serviceType || '');
    const customerPart = customerId ? `&customerId=${customerId}` : '';
    return request(`/barbers/dispatch?lat=${lat}&lng=${lng}&limit=${limit}&serviceType=${encodedService}${customerPart}`);
  },

  createBooking(token, payload) {
    return request('/customers/book', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    });
  },

  getBarberRequests(token) {
    return request('/bookings/my-requests', {
      headers: authHeader(token),
    });
  },

  respondToBooking(token, bookingId, action) {
    return request(`/bookings/${bookingId}/respond`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ action }),
    });
  },

  sendBarberLocation(token, bookingId, latitude, longitude) {
    return request(`/bookings/${bookingId}/location`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  getBarberQueue(barberId) {
    return request(`/bookings/queue/${barberId}`);
  },

  getMyActiveBooking(token) {
    return request('/customers/my-booking', {
      headers: authHeader(token),
    });
  },

  getBarberOnlineStatus(token) {
    return request('/barbers/status', {
      headers: authHeader(token),
    });
  },

  setBarberOnlineStatus(token, isOnline) {
    return request('/barbers/status', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ isOnline }),
    });
  },

  registerPushToken(token, pushToken, platform = 'android', deviceId = null) {
    return request('/notifications/register-token', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ token: pushToken, platform, deviceId }),
    });
  },

  unregisterPushToken(token, pushToken) {
    return request('/notifications/unregister-token', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ token: pushToken }),
    });
  },

  testSelfPush(token, title, body) {
    return request('/notifications/test-self', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ title, body }),
    });
  },
};
