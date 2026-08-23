import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }
  return socket;
}

export function subscribeToProject(projectId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('subscribe:project', projectId);
  } else {
    s.once('connect', () => {
      s.emit('subscribe:project', projectId);
    });
  }
}

export function subscribeToQueue(queueId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('subscribe:queue', queueId);
  } else {
    s.once('connect', () => {
      s.emit('subscribe:queue', queueId);
    });
  }
}
