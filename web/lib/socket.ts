'use client';

import { io, type Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { API_URL, tokens } from './api';

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  const token = tokens.access;
  if (!token) return null;
  if (!socket) {
    socket = io(API_URL, { auth: { token }, transports: ['websocket'], autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Subscribe to a realtime event for the lifetime of a component. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const fn = (payload: T) => ref.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}
