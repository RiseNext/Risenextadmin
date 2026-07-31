import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { prisma } from '../lib/prisma';
import type { Role } from '@prisma/client';

export type AuthUser = { id: string; email: string; role: Role; permissions: string[]; name: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccess(user: { id: string; role: Role }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expires as jwt.SignOptions['expiresIn'],
  });
}

export function signRefresh(user: { id: string }) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
  });
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, env.jwt.secret) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'Account inactive' });
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      name: user.name,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

/** Optional auth — used by public endpoints that personalise when signed in. */
export async function maybeAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header && !req.cookies?.access_token) return next();
  return authenticate(req, _res, next);
}
