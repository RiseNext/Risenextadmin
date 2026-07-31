import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { crudRouter } from './crud.factory';
import { prisma } from '../lib/prisma';
import { wrap, validate, HttpError } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { emitUser } from '../lib/socket';

export const employeeRouter = crudRouter({
  model: 'employee',
  permission: 'hrms',
  include: { department: true, user: { select: { id: true, email: true, role: true } } },
  searchFields: ['firstName', 'lastName', 'email', 'designation', 'code'],
  orderBy: [{ createdAt: 'desc' }],
  schema: z.object({
    code: z.string().min(2),
    userId: z.string().optional().nullable(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    designation: z.string().min(2),
    departmentId: z.string().optional().nullable(),
    employment: z.string().default('FULL_TIME'),
    joinedAt: z.coerce.date().default(() => new Date()),
    exitedAt: z.coerce.date().optional().nullable(),
    ctc: z.number().default(0),
    bankAccount: z.string().optional().nullable(),
    pan: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    photoUrl: z.string().optional().nullable(),
    status: z.string().default('ACTIVE'),
  }),
});

export const departmentRouter = crudRouter({
  model: 'department',
  permission: 'hrms',
  searchFields: ['name', 'head'],
  orderBy: [{ name: 'asc' }],
  include: { _count: { select: { employees: true } } } as never,
  schema: z.object({ name: z.string().min(2), head: z.string().optional().nullable() }),
});

export const leaveTypeRouter = crudRouter({
  model: 'leaveType',
  permission: 'hrms',
  searchFields: ['name'],
  orderBy: [{ name: 'asc' }],
  schema: z.object({ name: z.string().min(2), quotaDays: z.number().default(12), paid: z.boolean().default(true) }),
});

export const attendanceRouter = Router();

attendanceRouter.get(
  '/',
  requirePermission('hrms:read', 'hrms:*', 'hrms:self'),
  wrap(async (req, res) => {
    const q = z
      .object({
        employeeId: z.string().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
      .parse(req.query);
    const where: Record<string, unknown> = {};
    if (q.employeeId) where.employeeId = q.employeeId;
    if (q.from || q.to) where.date = { gte: q.from ?? dayjs().startOf('month').toDate(), lte: q.to ?? new Date() };
    res.json(
      await prisma.attendance.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, code: true } } },
        orderBy: { date: 'desc' },
        take: 500,
      })
    );
  })
);

attendanceRouter.post(
  '/check-in',
  requirePermission('hrms:*', 'hrms:self'),
  wrap(async (req, res) => {
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id } });
    if (!employee) throw new HttpError(404, 'No employee profile linked to this account');
    const date = dayjs().startOf('day').toDate();
    const row = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      update: { checkIn: new Date(), status: 'PRESENT' },
      create: { employeeId: employee.id, date, checkIn: new Date(), status: 'PRESENT' },
    });
    res.json(row);
  })
);

attendanceRouter.post(
  '/check-out',
  requirePermission('hrms:*', 'hrms:self'),
  wrap(async (req, res) => {
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id } });
    if (!employee) throw new HttpError(404, 'No employee profile linked to this account');
    const date = dayjs().startOf('day').toDate();
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date } },
    });
    if (!existing?.checkIn) throw new HttpError(400, 'Check in first');
    const minutes = dayjs().diff(dayjs(existing.checkIn), 'minute');
    res.json(
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkOut: new Date(), minutes },
      })
    );
  })
);

attendanceRouter.post(
  '/mark',
  requirePermission('hrms:write', 'hrms:*'),
  validate(
    z.object({
      employeeId: z.string(),
      date: z.coerce.date(),
      status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'WFH', 'LEAVE']),
      note: z.string().optional(),
    })
  ),
  wrap(async (req, res) => {
    const { employeeId, date, status, note } = req.body;
    const day = dayjs(date).startOf('day').toDate();
    const row = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: day } },
      update: { status, note },
      create: { employeeId, date: day, status, note },
    });
    await audit(req, 'attendance.mark', 'attendance', row.id, null, row);
    res.json(row);
  })
);

attendanceRouter.get(
  '/summary',
  requirePermission('hrms:read', 'hrms:*'),
  wrap(async (req, res) => {
    const month = Number(req.query.month ?? dayjs().month() + 1);
    const year = Number(req.query.year ?? dayjs().year());
    const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
    const rows = await prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: start.toDate(), lte: start.endOf('month').toDate() } },
      _count: { _all: true },
    });
    res.json(rows.map((r) => ({ status: r.status, count: r._count._all })));
  })
);

export const leaveRouter = Router();

leaveRouter.get(
  '/',
  requirePermission('hrms:read', 'hrms:*', 'hrms:self'),
  wrap(async (req, res) => {
    const status = req.query.status as string | undefined;
    res.json(
      await prisma.leaveRequest.findMany({
        where: status ? { status } : {},
        include: { employee: { select: { firstName: true, lastName: true, code: true } }, type: true },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

leaveRouter.post(
  '/',
  requirePermission('hrms:*', 'hrms:self'),
  validate(
    z.object({
      employeeId: z.string(),
      typeId: z.string(),
      from: z.coerce.date(),
      to: z.coerce.date(),
      reason: z.string().optional(),
    })
  ),
  wrap(async (req, res) => {
    const days = Math.max(1, dayjs(req.body.to).diff(dayjs(req.body.from), 'day') + 1);
    const row = await prisma.leaveRequest.create({ data: { ...req.body, days } });
    await prisma.notification.create({
      data: { title: 'Leave request', body: `${days} day(s) requested`, kind: 'hr', href: '/hrms/leave' },
    });
    res.status(201).json(row);
  })
);

leaveRouter.patch(
  '/:id/decision',
  requirePermission('hrms:write', 'hrms:*'),
  validate(z.object({ status: z.enum(['APPROVED', 'REJECTED']) })),
  wrap(async (req, res) => {
    const row = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: req.body.status, approverId: req.user!.id },
      include: { employee: { include: { user: true } } },
    });
    if (row.employee.user) {
      emitUser(row.employee.user.id, 'leave:decision', { id: row.id, status: row.status });
    }
    await audit(req, 'leave.' + req.body.status.toLowerCase(), 'leaveRequest', row.id);
    res.json(row);
  })
);

export const payrollRouter = Router();

payrollRouter.get(
  '/',
  requirePermission('hrms:read', 'hrms:*'),
  wrap(async (req, res) => {
    const month = Number(req.query.month ?? dayjs().month() + 1);
    const year = Number(req.query.year ?? dayjs().year());
    res.json(
      await prisma.payslip.findMany({
        where: { month, year },
        include: { employee: { select: { firstName: true, lastName: true, code: true, designation: true } } },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

payrollRouter.post(
  '/run',
  requirePermission('hrms:write', 'hrms:*'),
  validate(z.object({ month: z.number().min(1).max(12), year: z.number() })),
  wrap(async (req, res) => {
    const { month, year } = req.body as { month: number; year: number };
    const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
    const slips = [];
    for (const e of employees) {
      const monthly = Math.round(e.ctc / 12);
      const basic = Math.round(monthly * 0.5);
      const hra = Math.round(monthly * 0.2);
      const allowances = monthly - basic - hra;
      const deductions = Math.round(basic * 0.12);
      const tds = Math.round(monthly * 0.05);
      const netPay = monthly - deductions - tds;
      slips.push(
        await prisma.payslip.upsert({
          where: { employeeId_month_year: { employeeId: e.id, month, year } },
          update: { basic, hra, allowances, deductions, tds, netPay },
          create: { employeeId: e.id, month, year, basic, hra, allowances, deductions, tds, netPay },
        })
      );
    }
    await audit(req, 'payroll.run', 'payslip', undefined, null, { month, year, count: slips.length });
    res.json({ count: slips.length, slips });
  })
);

payrollRouter.patch(
  '/:id',
  requirePermission('hrms:write', 'hrms:*'),
  validate(z.object({ status: z.enum(['DRAFT', 'APPROVED', 'PAID']).optional(), pdfUrl: z.string().optional() })),
  wrap(async (req, res) => {
    res.json(await prisma.payslip.update({ where: { id: req.params.id }, data: req.body }));
  })
);

export const jobRouter = crudRouter({
  model: 'jobOpening',
  permission: 'recruitment',
  searchFields: ['title', 'location', 'description'],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    location: z.string().default('Hyderabad'),
    type: z.string().default('FULL_TIME'),
    experience: z.string().optional().nullable(),
    description: z.string().default(''),
    skills: z.array(z.string()).default([]),
    salaryRange: z.string().optional().nullable(),
    openings: z.number().default(1),
    state: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  }),
});

export const applicationRouter = crudRouter({
  model: 'application',
  permission: 'recruitment',
  include: { job: { select: { title: true, slug: true } }, resume: true },
  searchFields: ['name', 'email', 'phone'],
  schema: z.object({
    jobId: z.string(),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    resumeId: z.string().optional().nullable(),
    portfolio: z.string().optional().nullable(),
    coverNote: z.string().optional().nullable(),
    stage: z.enum(['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).default('APPLIED'),
    rating: z.number().min(0).max(5).default(0),
  }),
});
