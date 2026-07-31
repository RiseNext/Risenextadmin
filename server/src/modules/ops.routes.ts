import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import argon2 from 'argon2';
import { crudRouter } from './crud.factory';
import { prisma } from '../lib/prisma';
import { wrap, validate, HttpError } from '../middleware/error';
import { requirePermission, requireRole, ROLE_MATRIX } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { emitAll, emitUser } from '../lib/socket';
import { sendMail, sendTemplate } from '../lib/mailer';
import { sendWhatsApp } from '../lib/whatsapp';
import { createBackup, restoreBackup } from '../lib/backup';

export const taskRouter = crudRouter({
  model: 'task',
  permission: 'tasks',
  include: { owner: { select: { id: true, name: true, avatarUrl: true } }, employee: { select: { firstName: true, lastName: true } } },
  searchFields: ['title', 'detail'],
  socketEvent: 'task:changed',
  schema: z.object({
    title: z.string().min(2),
    detail: z.string().optional().nullable(),
    status: z.enum(['TODO', 'DOING', 'REVIEW', 'DONE']).default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    dueAt: z.coerce.date().optional().nullable(),
    ownerId: z.string().optional().nullable(),
    employeeId: z.string().optional().nullable(),
    tags: z.array(z.string()).default([]),
  }),
});

export const eventRouter = crudRouter({
  model: 'calendarEvent',
  permission: 'calendar',
  searchFields: ['title', 'detail'],
  orderBy: [{ start: 'asc' }],
  schema: z.object({
    title: z.string().min(2),
    detail: z.string().optional().nullable(),
    start: z.coerce.date(),
    end: z.coerce.date(),
    allDay: z.boolean().default(false),
    kind: z.string().default('meeting'),
    attendees: z.array(z.string()).default([]),
  }),
});

export const notificationRouter = Router();

notificationRouter.get(
  '/',
  wrap(async (req, res) => {
    res.json(
      await prisma.notification.findMany({
        where: { OR: [{ userId: req.user!.id }, { userId: null }] },
        orderBy: { createdAt: 'desc' },
        take: 60,
      })
    );
  })
);

notificationRouter.post(
  '/',
  requirePermission('messaging:*', 'settings:*'),
  validate(
    z.object({
      title: z.string().min(2),
      body: z.string().optional(),
      kind: z.string().default('info'),
      href: z.string().optional(),
      userId: z.string().optional().nullable(),
    })
  ),
  wrap(async (req, res) => {
    const row = await prisma.notification.create({ data: req.body });
    if (row.userId) emitUser(row.userId, 'notification:new', row);
    else emitAll('notification:new', row);
    res.status(201).json(row);
  })
);

notificationRouter.patch(
  '/:id/read',
  wrap(async (req, res) => {
    res.json(await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } }));
  })
);

notificationRouter.post(
  '/read-all',
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  })
);

export const messagingRouter = Router();

export const emailTemplateRouter = crudRouter({
  model: 'emailTemplate',
  permission: 'messaging',
  searchFields: ['name', 'subject'],
  orderBy: [{ name: 'asc' }],
  schema: z.object({
    name: z.string().min(2),
    subject: z.string().min(2),
    html: z.string().min(2),
    variables: z.array(z.string()).default([]),
  }),
});

messagingRouter.post(
  '/email',
  requirePermission('messaging:send', 'messaging:*'),
  validate(
    z.object({
      to: z.string(),
      subject: z.string().optional(),
      html: z.string().optional(),
      template: z.string().optional(),
      vars: z.record(z.union([z.string(), z.number()])).default({}),
    })
  ),
  wrap(async (req, res) => {
    const { to, subject, html, template, vars } = req.body;
    const result = template
      ? await sendTemplate(template, to, vars)
      : await sendMail({ to, subject: subject ?? 'Rise Next', html: html ?? '' });
    await audit(req, 'email.send', 'messageLog', result.id);
    res.json(result);
  })
);

messagingRouter.post(
  '/whatsapp',
  requirePermission('messaging:send', 'messaging:*'),
  validate(z.object({ to: z.string().min(8), body: z.string().min(1), template: z.string().optional() })),
  wrap(async (req, res) => {
    const result = await sendWhatsApp(req.body.to, req.body.body, req.body.template);
    await audit(req, 'whatsapp.send', 'messageLog', result.id);
    res.json(result);
  })
);

messagingRouter.get(
  '/logs',
  requirePermission('messaging:*', 'reports:read'),
  wrap(async (req, res) => {
    const channel = req.query.channel as string | undefined;
    res.json(
      await prisma.messageLog.findMany({
        where: channel ? { channel } : {},
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    );
  })
);

export const userRouter = Router();

userRouter.get(
  '/',
  requirePermission('users:read', 'users:*'),
  wrap(async (req, res) => {
    const q = (req.query.q as string) ?? '';
    res.json(
      await prisma.user.findMany({
        where: q
          ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
          : {},
        select: {
          id: true, name: true, email: true, role: true, active: true, avatarUrl: true,
          phone: true, permissions: true, lastLoginAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

userRouter.post(
  '/',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'HR', 'MARKETING', 'SALES', 'EMPLOYEE', 'VIEWER']),
      permissions: z.array(z.string()).default([]),
      phone: z.string().optional(),
    })
  ),
  wrap(async (req, res) => {
    const { password, ...rest } = req.body;
    const user = await prisma.user.create({
      data: { ...rest, email: String(rest.email).toLowerCase(), passwordHash: await argon2.hash(password) },
      select: { id: true, name: true, email: true, role: true },
    });
    await audit(req, 'create', 'user', user.id, null, user);
    await sendMail({
      to: rest.email,
      subject: 'Your Rise Next admin access',
      html: `<p>Hi ${rest.name}, an admin account was created for you. Sign in at the Rise Next admin console.</p>`,
    }).catch(() => null);
    res.status(201).json(user);
  })
);

userRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(
    z.object({
      name: z.string().min(2).optional(),
      role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'HR', 'MARKETING', 'SALES', 'EMPLOYEE', 'VIEWER']).optional(),
      permissions: z.array(z.string()).optional(),
      active: z.boolean().optional(),
      phone: z.string().optional(),
      password: z.string().min(8).optional(),
    })
  ),
  wrap(async (req, res) => {
    const { password, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await argon2.hash(password);
    const before = await prisma.user.findUnique({ where: { id: req.params.id } });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, permissions: true },
    });
    await audit(req, 'update', 'user', user.id, before, user);
    res.json(user);
  })
);

userRouter.delete(
  '/:id',
  requireRole('SUPER_ADMIN'),
  wrap(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, 'You cannot delete your own account');
    const before = await prisma.user.findUnique({ where: { id: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    await audit(req, 'delete', 'user', req.params.id, before, null);
    res.json({ ok: true });
  })
);

userRouter.get('/roles', requirePermission('users:read', 'users:*'), (_req, res) => res.json(ROLE_MATRIX));

export const auditRouter = Router();

auditRouter.get(
  '/',
  requirePermission('audit:read', 'audit:*'),
  wrap(async (req, res) => {
    const q = z
      .object({
        resource: z.string().optional(),
        action: z.string().optional(),
        userId: z.string().optional(),
        page: z.coerce.number().default(1),
        perPage: z.coerce.number().max(200).default(50),
      })
      .parse(req.query);
    const where: Record<string, unknown> = {};
    if (q.resource) where.resource = q.resource;
    if (q.action) where.action = q.action;
    if (q.userId) where.userId = q.userId;
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data, meta: { ...q, total, pages: Math.ceil(total / q.perPage) } });
  })
);

export const backupRouter = Router();

backupRouter.get(
  '/',
  requirePermission('backup:read', 'backup:*'),
  wrap(async (_req, res) => {
    res.json(await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } }));
  })
);

backupRouter.post(
  '/',
  requirePermission('backup:write', 'backup:*'),
  wrap(async (req, res) => {
    const backup = await createBackup(req.body?.note, req.user!.id);
    await audit(req, 'backup.create', 'backup', backup.id);
    res.status(201).json(backup);
  })
);

backupRouter.post(
  '/:id/restore',
  requireRole('SUPER_ADMIN'),
  wrap(async (req, res) => {
    const result = await restoreBackup(req.params.id);
    await audit(req, 'backup.restore', 'backup', req.params.id);
    res.json(result);
  })
);

export const reportRouter = Router();

reportRouter.get(
  '/summary',
  requirePermission('reports:read', 'reports:*'),
  wrap(async (_req, res) => {
    const monthStart = dayjs().startOf('month').toDate();
    const [leads, won, revenue, spend, posts, employees, attendance, applications] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.lead.count({ where: { status: 'WON', updatedAt: { gte: monthStart } } }),
      prisma.deal.aggregate({ where: { stage: 'won' }, _sum: { value: true } }),
      prisma.adCampaign.aggregate({ _sum: { spend: true } }),
      prisma.post.count({ where: { state: 'PUBLISHED' } }),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendance.count({ where: { date: { gte: monthStart }, status: 'PRESENT' } }),
      prisma.application.count({ where: { createdAt: { gte: monthStart } } }),
    ]);
    res.json({
      leadsThisMonth: leads,
      wonThisMonth: won,
      conversionRate: leads ? +((won / leads) * 100).toFixed(1) : 0,
      revenue: revenue._sum.value ?? 0,
      adSpend: spend._sum.spend ?? 0,
      publishedPosts: posts,
      activeEmployees: employees,
      presentDays: attendance,
      applications,
    });
  })
);

reportRouter.get(
  '/export/:entity',
  requirePermission('reports:read', 'reports:*'),
  wrap(async (req, res) => {
    const entity = req.params.entity;
    const map: Record<string, () => Promise<Record<string, unknown>[]>> = {
      leads: () => prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }) as never,
      deals: () => prisma.deal.findMany({ orderBy: { createdAt: 'desc' } }) as never,
      employees: () => prisma.employee.findMany({ orderBy: { createdAt: 'desc' } }) as never,
      payslips: () => prisma.payslip.findMany({ orderBy: { createdAt: 'desc' } }) as never,
      applications: () => prisma.application.findMany({ orderBy: { createdAt: 'desc' } }) as never,
      contacts: () => prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' } }) as never,
    };
    if (!map[entity]) throw new HttpError(400, 'Unknown export entity');
    const rows = await map[entity]();
    if (!rows.length) return res.type('text/csv').send('');
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) =>
      v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}-${dayjs().format('YYYYMMDD')}.csv"`);
    res.send(csv);
  })
);
