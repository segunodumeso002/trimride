import { io } from 'socket.io-client';
import { runtimeConfig } from '../config/runtimeConfig';

const SOCKET_URL = runtimeConfig.socketBaseUrl;

let socket;

export function connectSocket(token) {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
