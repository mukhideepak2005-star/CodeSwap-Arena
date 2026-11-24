import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('codeswap_token');
    socket = io('/', {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to CodeSwap Arena server');
      socket.emit('join_personal');
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server');
    });
  }
  return socket;
}

export function reconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
}

export function joinContestRoom(eventId) {
  const s = getSocket();
  if (s && eventId) {
    s.emit('join_contest', { eventId });
  }
}

export function leaveContestRoom(eventId) {
  const s = getSocket();
  if (s && eventId) {
    s.emit('leave_contest', { eventId });
  }
}
