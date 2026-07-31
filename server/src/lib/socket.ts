import { Server } from 'socket.io';
import type http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { logger } from './logger';

let io: Server | null = null;

export function initSocket(server: http.Server) {
  io = new Server(server, { cors: { origin: env.webOrigin, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, env.jwt.secret) as { sub: string; role: string };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; role: string };
    socket.join(`user:${user.sub}`);
    socket.join(`role:${user.role}`);
    logger.info('socket connected', user.sub);
    socket.on('presence:ping', () => socket.broadcast.emit('presence:seen', { userId: user.sub }));
    socket.on('disconnect', () => logger.info('socket disconnected', user.sub));
  });

  return io;
}

export function emitAll(event: string, payload: unknown) {
  io?.emit(event, payload);
}

export function emitUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitRole(role: string, event: string, payload: unknown) {
  io?.to(`role:${role}`).emit(event, payload);
}
