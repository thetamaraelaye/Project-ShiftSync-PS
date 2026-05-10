import { io, Socket } from 'socket.io-client'

// Use globalThis to survive Next.js HMR module resets.
// Without this, every hot-reload creates a fresh socket while the old one
// remains alive — resulting in multiple instances, duplicate events and
// "xhr poll error" spam as reconnect storms collide.
declare global {
  // eslint-disable-next-line no-var
  var __shiftsync_socket: Socket | undefined
}

/**
 * Connect to the realtime gateway. The httpOnly auth cookie is sent
 * automatically with the WebSocket handshake (same origin).
 */
export function getSocket(): Socket {
  if (globalThis.__shiftsync_socket) return globalThis.__shiftsync_socket

  const instance = io(
    (process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8030') + '/realtime',
    {
      withCredentials: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      transports: ['websocket'],   // websocket-only — avoids polling fallback storm during dev HMR
      autoConnect: true,
      timeout: 5000,
    }
  )

  if (process.env.NODE_ENV !== 'production') {
    instance.on('connect', () => console.log('[WS] connected'))
    instance.on('disconnect', (reason) => console.log('[WS] disconnected:', reason))
    instance.on('connect_error', (err) => console.warn('[WS] connect_error (will retry):', err.message))
  }

  globalThis.__shiftsync_socket = instance
  return instance
}

export function disconnectSocket() {
  if (globalThis.__shiftsync_socket) {
    globalThis.__shiftsync_socket.disconnect()
    globalThis.__shiftsync_socket = undefined
  }
}

export { }
