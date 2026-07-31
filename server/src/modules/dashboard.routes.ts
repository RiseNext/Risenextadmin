import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { wrap } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { cacheGet, cacheSet } from '../lib/redis';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requirePermission('dashboard:read'),
  wrap(async (_req, res) => {
    const cached = await cacheGet('cache:dashboard');
    if (cached) return res.json(cached);

    const monthStart = dayjs().startOf('month').toDate();
    const weekStart = dayjs().subtract(7, 'day').toDate();

    const [
      leadsTotal, leadsWeek, wonLeads, pipeline, contacts, tasksOpen,
      posts, projects, employees, pendingLeaves, applications, adAgg, analytics, recentAudit, notifications,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.deal.aggregate({ _sum: { value: true } }),
      prisma.contactSubmission.count({ where: { handled: false } }),
      prisma.task.count({ where: { status: { not: 'DONE' } } }),
      prisma.post.count({ where: { state: 'PUBLISHED' } }),
      prisma.project.count({ where: { state: 'PUBLISHED' } }),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.application.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.adCampaign.aggregate({ _sum: { spend: true, leads: true, clicks: true, impressions: true, revenue: true } }),
      prisma.analyticsDaily.findMany({ where: { date: { gte: dayjs().subtract(30, 'day').toDate() } }, orderBy: { date: 'asc' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { name: true, avatarUrl: true } } },
      }),
      prisma.notification.count({ where: { read: false } }),
    ]);

    const leadsByStatus = await prisma.lead.groupBy({ by: ['status'], _count: { _all: true } });
    const leadsByDay = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "Lead" WHERE "createdAt" >= ${dayjs().subtract(30, 'day').toDate()}
      GROUP BY 1 ORDER BY 1 ASC`;

    const spend = adAgg._sum.spend ?? 0;
    const payload = {
      kpis: {
        leadsTotal,
        leadsWeek,
        winRate: leadsTotal ? +((wonLeads / leadsTotal) * 100).toFixed(1) : 0,
        pipelineValue: pipeline._sum.value ?? 0,
        unhandledContacts: contacts,
        openTasks: tasksOpen,
        publishedPosts: posts,
        liveProjects: projects,
        activeEmployees: employees,
        pendingLeaves,
        applicationsThisMonth: applications,
        adSpend: spend,
        adLeads: adAgg._sum.leads ?? 0,
        cpl: (adAgg._sum.leads ?? 0) ? +(spend / (adAgg._sum.leads ?? 1)).toFixed(0) : 0,
        roas: spend ? +((adAgg._sum.revenue ?? 0) / spend).toFixed(2) : 0,
        unreadNotifications: notifications,
      },
      leadsByStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count._all })),
      leadTrend: leadsByDay.map((r) => ({ date: dayjs(r.day).format('YYYY-MM-DD'), count: Number(r.count) })),
      trafficTrend: analytics.map((a) => ({
        date: dayjs(a.date).format('YYYY-MM-DD'),
        sessions: a.sessions,
        users: a.users,
        pageviews: a.pageviews,
      })),
      activity: recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        resource: a.resource,
        at: a.createdAt,
        by: a.user?.name ?? 'System',
        avatarUrl: a.user?.avatarUrl ?? null,
      })),
    };

    await cacheSet('cache:dashboard', payload, 30);
    res.json(payload);
  })
);
