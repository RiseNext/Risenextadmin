import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';

/** resource:action grants per role. `*` = everything. */
export const ROLE_MATRIX: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'dashboard:read', 'cms:*', 'blog:*', 'media:*', 'seo:*', 'crm:*', 'hrms:*',
    'ads:*', 'analytics:read', 'tasks:*', 'calendar:*', 'reports:*',
    'messaging:*', 'settings:*', 'users:read', 'audit:read', 'backup:*',
  ],
  EDITOR: ['dashboard:read', 'cms:*', 'blog:*', 'media:*', 'seo:*', 'tasks:read', 'analytics:read'],
  HR: ['dashboard:read', 'hrms:*', 'recruitment:*', 'careers:*', 'tasks:*', 'calendar:*', 'reports:read'],
  MARKETING: ['dashboard:read', 'ads:*', 'analytics:read', 'blog:*', 'seo:*', 'media:*', 'reports:read', 'messaging:*'],
  SALES: ['dashboard:read', 'crm:*', 'tasks:*', 'calendar:*', 'reports:read', 'messaging:send'],
  EMPLOYEE: ['dashboard:read', 'tasks:read', 'tasks:write', 'hrms:self', 'calendar:read'],
  VIEWER: ['dashboard:read', 'cms:read', 'blog:read', 'analytics:read'],
};

function matches(grant: string, needed: string) {
  if (grant === '*') return true;
  if (grant === needed) return true;
  const [gRes, gAct] = grant.split(':');
  const [nRes, nAct] = needed.split(':');
  return gRes === nRes && (gAct === '*' || gAct === nAct);
}

export function can(user: { role: Role; permissions: string[] }, needed: string) {
  const grants = [...(ROLE_MATRIX[user.role] ?? []), ...user.permissions];
  return grants.some((g) => matches(g, needed));
}

export function requirePermission(...needed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const ok = needed.some((n) => can(req.user!, n));
    if (!ok) return res.status(403).json({ error: `Missing permission: ${needed.join(' | ')}` });
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role === 'SUPER_ADMIN' || roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Insufficient role' });
  };
}
