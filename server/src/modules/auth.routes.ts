import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dayjs from 'dayjs';
import { env } from '../env';
import { prisma } from '../lib/prisma';
import { incrWithTtl, ttl, reset } from '../lib/redis';
import { signAccess, signRefresh, authenticate } from '../middleware/auth';
import { validate, wrap, HttpError } from '../middleware/error';
import { authLimiter } from '../middleware/rateLimit';
import { audit } from '../middleware/audit';
import { ROLE_MATRIX } from '../middleware/rbac';

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

const attemptKey = (email: string, ip: string) => `login:attempts:${email}:${ip}`;

authRouter.post(
  '/login',
  authLimiter,
  validate(credentials),
  wrap(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentials>;
    const key = attemptKey(email.toLowerCase(), req.ip ?? 'unknown');

    const remaining = await ttl(key);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user?.lockedUntil && dayjs(user.lockedUntil).isAfter(dayjs())) {
      const secs = dayjs(user.lockedUntil).diff(dayjs(), 'second');
      return res.status(429).json({ error: 'Login temporarily disabled', retryAfter: secs });
    }

    const ok = user ? await argon2.verify(user.passwordHash, password).catch(() => false) : false;

    if (!ok) {
      const count = await incrWithTtl(key, env.login.lockSeconds * 4);
      const failed = (user?.failedLogins ?? 0) + 1;
      let lockedUntil: Date | null = null;
      if (Math.max(count, failed) >= env.login.maxAttempts) {
        lockedUntil = dayjs().add(env.login.lockSeconds, 'second').toDate();
      }
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: lockedUntil ? 0 : failed, lockedUntil },
        });
      }
      return res.status(401).json({
        error: 'Invalid credentials',
        attempts: Math.max(count, failed),
        maxAttempts: env.login.maxAttempts,
        lockedFor: lockedUntil ? env.login.lockSeconds : 0,
        retryAfter: lockedUntil ? env.login.lockSeconds : Math.max(remaining, 0),
      });
    }

    await reset(key);
    const refreshToken = signRefresh(user!);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user!.id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: user!.id,
          refreshToken,
          userAgent: req.headers['user-agent'] ?? null,
          ip: req.ip ?? null,
          expiresAt: dayjs().add(7, 'day').toDate(),
        },
      }),
    ]);

    const accessToken = signAccess(user!);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: 7 * 24 * 3600 * 1000,
    });

    await audit(req, 'login', 'auth', user!.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role,
        avatarUrl: user!.avatarUrl,
        permissions: [...ROLE_MATRIX[user!.role], ...user!.permissions],
      },
    });
  })
);

authRouter.post(
  '/refresh',
  wrap(async (req, res) => {
    const token = (req.body?.refreshToken as string) ?? req.cookies?.refresh_token;
    if (!token) throw new HttpError(401, 'Missing refresh token');
    const session = await prisma.session.findUnique({ where: { refreshToken: token }, include: { user: true } });
    if (!session || dayjs(session.expiresAt).isBefore(dayjs())) throw new HttpError(401, 'Session expired');
    try {
      jwt.verify(token, env.jwt.refreshSecret);
    } catch {
      throw new HttpError(401, 'Invalid refresh token');
    }
    const accessToken = signAccess(session.user);
    res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', secure: env.isProd });
    res.json({ accessToken });
  })
);

authRouter.post(
  '/logout',
  wrap(async (req, res) => {
    const token = (req.body?.refreshToken as string) ?? req.cookies?.refresh_token;
    if (token) await prisma.session.deleteMany({ where: { refreshToken: token } });
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  })
);

authRouter.get(
  '/me',
  authenticate,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, role: true, avatarUrl: true, phone: true,
        permissions: true, lastLoginAt: true, twoFactor: true,
      },
    });
    res.json({ ...user, permissions: [...ROLE_MATRIX[user!.role], ...user!.permissions] });
  })
);

authRouter.patch(
  '/me',
  authenticate,
  validate(z.object({ name: z.string().min(2).optional(), phone: z.string().optional(), avatarUrl: z.string().optional() })),
  wrap(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, phone: user.phone });
  })
);

authRouter.post(
  '/change-password',
  authenticate,
  validate(z.object({ current: z.string(), next: z.string().min(8) })),
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const ok = await argon2.verify(user!.passwordHash, req.body.current).catch(() => false);
    if (!ok) throw new HttpError(400, 'Current password is incorrect');
    await prisma.user.update({
      where: { id: user!.id },
      data: { passwordHash: await argon2.hash(req.body.next) },
    });
    await prisma.session.deleteMany({ where: { userId: user!.id } });
    await audit(req, 'password.change', 'auth', user!.id);
    res.json({ ok: true });
  })
);

authRouter.get(
  '/sessions',
  authenticate,
  wrap(async (req, res) => {
    res.json(
      await prisma.session.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      })
    );
  })
);
