import type { Request } from 'express';
import { prisma } from '../lib/prisma';
import { emitRole } from '../lib/socket';

export async function audit(
  req: Request,
  action: string,
  resource: string,
  entityId?: string,
  before?: unknown,
  after?: unknown
) {
  const log = await prisma.auditLog.create({
    data: {
      userId: req.user?.id ?? null,
      action,
      resource,
      entityId,
      before: (before ?? null) as never,
      after: (after ?? null) as never,
      ip: req.ip,
    },
  });
  emitRole('SUPER_ADMIN', 'audit:new', { ...log, userName: req.user?.name });
  return log;
}
