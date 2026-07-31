import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { wrap, validate } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { cacheGet, cacheSet } from '../lib/redis';
import { logger } from '../lib/logger';

export const adsRouter = Router();

const platformParam = z.object({ platform: z.enum(['META', 'GOOGLE']) });

adsRouter.get(
  '/:platform/campaigns',
  requirePermission('ads:read', 'ads:*'),
  wrap(async (req, res) => {
    const { platform } = platformParam.parse(req.params);
    res.json(
      await prisma.adCampaign.findMany({
        where: { platform },
        orderBy: { spend: 'desc' },
        include: { metrics: { orderBy: { date: 'asc' }, take: 60 } },
      })
    );
  })
);

adsRouter.get(
  '/:platform/overview',
  requirePermission('ads:read', 'ads:*'),
  wrap(async (req, res) => {
    const { platform } = platformParam.parse(req.params);
    const key = `cache:ads:${platform}:overview`;
    const cached = await cacheGet(key);
    if (cached) return res.json(cached);

    const agg = await prisma.adCampaign.aggregate({
      where: { platform },
      _sum: { spend: true, impressions: true, clicks: true, leads: true, conversions: true, revenue: true },
      _count: { _all: true },
    });
    const daily = await prisma.adMetric.groupBy({
      by: ['date'],
      where: { campaign: { platform }, date: { gte: dayjs().subtract(30, 'day').toDate() } },
      _sum: { spend: true, clicks: true, impressions: true, leads: true },
      orderBy: { date: 'asc' },
    });

    const spend = agg._sum.spend ?? 0;
    const clicks = agg._sum.clicks ?? 0;
    const impressions = agg._sum.impressions ?? 0;
    const leads = agg._sum.leads ?? 0;
    const revenue = agg._sum.revenue ?? 0;

    const payload = {
      platform,
      campaigns: agg._count._all,
      spend, clicks, impressions, leads, revenue,
      ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
      roas: spend ? +(revenue / spend).toFixed(2) : 0,
      series: daily.map((d) => ({
        date: dayjs(d.date).format('YYYY-MM-DD'),
        spend: d._sum.spend ?? 0,
        clicks: d._sum.clicks ?? 0,
        impressions: d._sum.impressions ?? 0,
        leads: d._sum.leads ?? 0,
      })),
    };
    await cacheSet(key, payload, 120);
    res.json(payload);
  })
);

adsRouter.patch(
  '/campaigns/:id',
  requirePermission('ads:write', 'ads:*'),
  validate(
    z.object({
      name: z.string().optional(),
      status: z.string().optional(),
      dailyBudget: z.number().optional(),
      objective: z.string().optional(),
    })
  ),
  wrap(async (req, res) => {
    const row = await prisma.adCampaign.update({ where: { id: req.params.id }, data: req.body });
    await audit(req, 'update', 'adCampaign', row.id, null, row);
    res.json(row);
  })
);

/** Pulls live insights when tokens are configured; otherwise reports skipped. */
adsRouter.post(
  '/:platform/sync',
  requirePermission('ads:write', 'ads:*'),
  wrap(async (req, res) => {
    const { platform } = platformParam.parse(req.params);
    try {
      if (platform === 'META') {
        if (!env.ads.metaToken || !env.ads.metaAccount) {
          return res.json({ synced: 0, skipped: true, reason: 'META_ACCESS_TOKEN missing' });
        }
        const url =
          `https://graph.facebook.com/v19.0/${env.ads.metaAccount}/campaigns` +
          `?fields=name,objective,status,daily_budget,insights{spend,impressions,clicks,actions}` +
          `&access_token=${env.ads.metaToken}`;
        const json = (await (await fetch(url)).json()) as { data?: MetaCampaign[] };
        let synced = 0;
        for (const c of json.data ?? []) {
          const ins = c.insights?.data?.[0];
          await prisma.adCampaign.upsert({
            where: { id: c.id },
            update: {
              name: c.name, status: c.status, objective: c.objective,
              dailyBudget: Number(c.daily_budget ?? 0),
              spend: Math.round(Number(ins?.spend ?? 0)),
              impressions: Number(ins?.impressions ?? 0),
              clicks: Number(ins?.clicks ?? 0),
              syncedAt: new Date(),
            },
            create: {
              id: c.id, platform: 'META', externalId: c.id, name: c.name,
              status: c.status, objective: c.objective,
              dailyBudget: Number(c.daily_budget ?? 0), syncedAt: new Date(),
            },
          });
          synced++;
        }
        return res.json({ synced });
      }

      if (!env.ads.googleDevToken || !env.ads.googleCustomer) {
        return res.json({ synced: 0, skipped: true, reason: 'GOOGLE_ADS credentials missing' });
      }
      // Google Ads API requires an OAuth exchange; wire your refresh token flow here.
      return res.json({ synced: 0, pending: true, reason: 'Configure Google Ads OAuth exchange' });
    } catch (e) {
      logger.error('ads sync failed', (e as Error).message);
      return res.status(502).json({ error: 'Ad platform sync failed', detail: (e as Error).message });
    }
  })
);

type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  insights?: { data?: { spend?: string; impressions?: string; clicks?: string }[] };
};

export const analyticsRouter = Router();

analyticsRouter.get(
  '/overview',
  requirePermission('analytics:read', 'analytics:*'),
  wrap(async (req, res) => {
    const days = Number(req.query.days ?? 30);
    const from = dayjs().subtract(days, 'day').startOf('day').toDate();
    const rows = await prisma.analyticsDaily.findMany({ where: { date: { gte: from } }, orderBy: { date: 'asc' } });
    const sum = (k: 'sessions' | 'users' | 'pageviews') => rows.reduce((a, r) => a + r[k], 0);
    res.json({
      range: { days, from },
      sessions: sum('sessions'),
      users: sum('users'),
      pageviews: sum('pageviews'),
      bounceRate: rows.length ? +(rows.reduce((a, r) => a + r.bounceRate, 0) / rows.length).toFixed(2) : 0,
      avgDuration: rows.length ? +(rows.reduce((a, r) => a + r.avgDuration, 0) / rows.length).toFixed(1) : 0,
      series: rows.map((r) => ({
        date: dayjs(r.date).format('YYYY-MM-DD'),
        sessions: r.sessions, users: r.users, pageviews: r.pageviews,
      })),
      topPages: rows.at(-1)?.topPages ?? [],
      channels: rows.at(-1)?.channels ?? {},
    });
  })
);

analyticsRouter.post(
  '/ingest',
  requirePermission('analytics:*'),
  validate(
    z.object({
      date: z.coerce.date(),
      sessions: z.number(),
      users: z.number(),
      pageviews: z.number(),
      bounceRate: z.number().default(0),
      avgDuration: z.number().default(0),
      topPages: z.any().default([]),
      channels: z.any().default({}),
    })
  ),
  wrap(async (req, res) => {
    const { date, ...rest } = req.body;
    const day = dayjs(date).startOf('day').toDate();
    res.json(
      await prisma.analyticsDaily.upsert({ where: { date: day }, update: rest, create: { date: day, ...rest } })
    );
  })
);
