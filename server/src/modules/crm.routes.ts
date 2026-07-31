import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { crudRouter } from './crud.factory';
import { prisma } from '../lib/prisma';
import { wrap, validate } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { emitRole } from '../lib/socket';
import { publicFormLimiter } from '../middleware/rateLimit';
import { sendMail } from '../lib/mailer';
import { sendWhatsApp } from '../lib/whatsapp';

const leadStatus = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);

export const leadRouter = crudRouter({
  model: 'lead',
  permission: 'crm',
  include: { activities: { orderBy: { createdAt: 'desc' } }, deals: true },
  searchFields: ['name', 'email', 'phone', 'company'],
  socketEvent: 'lead:changed',
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    source: z.string().default('website'),
    service: z.string().optional().nullable(),
    budget: z.number().optional().nullable(),
    message: z.string().optional().nullable(),
    status: leadStatus.default('NEW'),
    score: z.number().default(0),
    ownerId: z.string().optional().nullable(),
  }),
});

export const dealRouter = crudRouter({
  model: 'deal',
  permission: 'crm',
  include: { lead: true },
  searchFields: ['title', 'stage'],
  schema: z.object({
    title: z.string().min(2),
    leadId: z.string().optional().nullable(),
    value: z.number().default(0),
    stage: z.string().default('discovery'),
    closeDate: z.coerce.date().optional().nullable(),
    ownerId: z.string().optional().nullable(),
  }),
});

export const contactRouter = crudRouter({
  model: 'contactSubmission',
  permission: 'crm',
  searchFields: ['name', 'email', 'subject', 'message'],
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    subject: z.string().optional().nullable(),
    message: z.string().min(2),
    page: z.string().optional().nullable(),
    handled: z.boolean().default(false),
  }),
});

export const crmExtraRouter = Router();

crmExtraRouter.get(
  '/pipeline',
  requirePermission('crm:read', 'crm:*'),
  wrap(async (_req, res) => {
    const [byStatus, byStage, totals, recent] = await Promise.all([
      prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.deal.groupBy({ by: ['stage'], _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.aggregate({ _sum: { value: true }, _count: { _all: true } }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    res.json({
      leadsByStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      dealsByStage: byStage.map((s) => ({ stage: s.stage, count: s._count._all, value: s._sum.value ?? 0 })),
      pipelineValue: totals._sum.value ?? 0,
      dealCount: totals._count._all,
      recentLeads: recent,
    });
  })
);

crmExtraRouter.post(
  '/leads/:id/activities',
  requirePermission('crm:write', 'crm:*'),
  validate(
    z.object({
      type: z.enum(['call', 'email', 'meeting', 'whatsapp', 'note']),
      note: z.string().optional(),
      dueAt: z.coerce.date().optional().nullable(),
    })
  ),
  wrap(async (req, res) => {
    const activity = await prisma.activity.create({
      data: { ...req.body, leadId: req.params.id, userId: req.user!.id },
    });
    await audit(req, 'activity.create', 'lead', req.params.id, null, activity);
    res.status(201).json(activity);
  })
);

crmExtraRouter.post(
  '/leads/:id/outreach',
  requirePermission('crm:write', 'crm:*', 'messaging:send'),
  validate(z.object({ channel: z.enum(['email', 'whatsapp']), subject: z.string().optional(), body: z.string().min(2) })),
  wrap(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (req.body.channel === 'email' && lead.email) {
      await sendMail({ to: lead.email, subject: req.body.subject ?? 'Rise Next', html: req.body.body });
    } else if (lead.phone) {
      await sendWhatsApp(lead.phone, req.body.body);
    }
    await prisma.activity.create({
      data: { leadId: lead.id, type: req.body.channel, note: req.body.body, userId: req.user!.id, doneAt: new Date() },
    });
    res.json({ ok: true });
  })
);

/** Public website endpoints — contact form and lead capture. */
export const publicFormsRouter = Router();

publicFormsRouter.post(
  '/contact',
  publicFormLimiter,
  validate(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      subject: z.string().optional(),
      message: z.string().min(2),
      page: z.string().optional(),
      service: z.string().optional(),
      budget: z.coerce.number().optional(),
    })
  ),
  wrap(async (req, res) => {
    const body = req.body as Record<string, string & number>;
    const [submission, lead] = await prisma.$transaction([
      prisma.contactSubmission.create({
        data: {
          name: body.name, email: body.email, phone: body.phone,
          subject: body.subject, message: body.message, page: body.page,
        },
      }),
      prisma.lead.create({
        data: {
          name: body.name, email: body.email, phone: body.phone,
          message: body.message, service: body.service, budget: body.budget,
          source: 'website', status: 'NEW',
          score: body.budget ? Math.min(100, Number(body.budget) / 1000) : 20,
        },
      }),
    ]);

    await prisma.notification.create({
      data: { title: 'New enquiry', body: `${body.name} — ${body.subject ?? 'Website form'}`, kind: 'lead', href: `/crm/leads/${lead.id}` },
    });
    emitRole('SALES', 'lead:new', lead);
    emitRole('ADMIN', 'lead:new', lead);
    await sendMail({
      to: body.email,
      subject: 'We received your enquiry — Rise Next',
      html: `<p>Hi ${body.name},</p><p>Thanks for reaching out to Rise Next. Our team will respond within one business day.</p>`,
    }).catch(() => null);

    res.status(201).json({ ok: true, id: submission.id });
  })
);

publicFormsRouter.get(
  '/openings',
  wrap(async (_req, res) => {
    res.json(await prisma.jobOpening.findMany({ where: { state: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } }));
  })
);

publicFormsRouter.get(
  '/stats',
  wrap(async (_req, res) => {
    const since = dayjs().subtract(30, 'day').toDate();
    const [projects, clients, leads] = await Promise.all([
      prisma.project.count({ where: { state: 'PUBLISHED' } }),
      prisma.client.count({ where: { state: 'PUBLISHED' } }),
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
    ]);
    res.json({ projects, clients, leadsLast30Days: leads });
  })
);
