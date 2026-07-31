import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from './crud.factory';
import { prisma } from '../lib/prisma';
import { wrap } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { cacheGet, cacheSet } from '../lib/redis';

const publishState = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const heroRouter = crudRouter({
  model: 'hero',
  permission: 'cms',
  reorderable: true,
  include: { media: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['headline', 'subline'],
  schema: z.object({
    eyebrow: z.string().optional().nullable(),
    headline: z.string().min(2),
    subline: z.string().optional().nullable(),
    body: z.string().optional().nullable(),
    ctaLabel: z.string().optional().nullable(),
    ctaHref: z.string().optional().nullable(),
    altCta: z.string().optional().nullable(),
    altHref: z.string().optional().nullable(),
    mediaId: z.string().optional().nullable(),
    theme: z.string().default('cream'),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const serviceRouter = crudRouter({
  model: 'service',
  permission: 'cms',
  reorderable: true,
  include: { cover: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['title', 'summary'],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    summary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    features: z.array(z.string()).default([]),
    priceFrom: z.number().optional().nullable(),
    coverId: z.string().optional().nullable(),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const projectRouter = crudRouter({
  model: 'project',
  permission: 'cms',
  reorderable: true,
  include: { cover: true, gallery: true, client: true, service: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['title', 'summary'],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    clientId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    results: z.array(z.string()).default([]),
    year: z.number().optional().nullable(),
    featured: z.boolean().default(false),
    coverId: z.string().optional().nullable(),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const clientRouter = crudRouter({
  model: 'client',
  permission: 'cms',
  reorderable: true,
  include: { logo: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['name', 'industry'],
  schema: z.object({
    name: z.string().min(1),
    industry: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    logoId: z.string().optional().nullable(),
    testimonial: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
    authorRole: z.string().optional().nullable(),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const teamRouter = crudRouter({
  model: 'teamMember',
  permission: 'cms',
  reorderable: true,
  include: { photo: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['name', 'role'],
  schema: z.object({
    name: z.string().min(2),
    role: z.string().min(2),
    bio: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    photoId: z.string().optional().nullable(),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const galleryRouter = crudRouter({
  model: 'galleryAlbum',
  permission: 'cms',
  reorderable: true,
  include: { items: true },
  orderBy: [{ order: 'asc' }],
  searchFields: ['title', 'caption'],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    caption: z.string().optional().nullable(),
    kind: z.string().default('photo'),
    order: z.number().default(0),
    state: publishState.default('DRAFT'),
  }),
});

export const pageRouter = crudRouter({
  model: 'page',
  permission: 'cms',
  include: { seo: true },
  searchFields: ['title', 'slug'],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(1),
    blocks: z.any().default([]),
    state: publishState.default('DRAFT'),
  }),
});

export const seoRouter = crudRouter({
  model: 'seo',
  permission: 'seo',
  include: { ogImage: true },
  searchFields: ['path', 'title'],
  orderBy: [{ path: 'asc' }],
  schema: z.object({
    path: z.string().min(1),
    title: z.string().min(2),
    description: z.string().optional().nullable(),
    keywords: z.array(z.string()).default([]),
    ogImageId: z.string().optional().nullable(),
    canonical: z.string().optional().nullable(),
    robots: z.string().default('index, follow'),
    schemaJson: z.any().optional().nullable(),
    pageId: z.string().optional().nullable(),
  }),
});

/** Album membership + project gallery relation management. */
export const cmsRelationRouter = Router();

cmsRelationRouter.post(
  '/albums/:id/items',
  requirePermission('cms:write', 'cms:*'),
  wrap(async (req, res) => {
    const ids = (req.body.mediaIds as string[]) ?? [];
    const album = await prisma.galleryAlbum.update({
      where: { id: req.params.id },
      data: { items: { connect: ids.map((id) => ({ id })) } },
      include: { items: true },
    });
    res.json(album);
  })
);

cmsRelationRouter.delete(
  '/albums/:id/items/:mediaId',
  requirePermission('cms:write', 'cms:*'),
  wrap(async (req, res) => {
    const album = await prisma.galleryAlbum.update({
      where: { id: req.params.id },
      data: { items: { disconnect: { id: req.params.mediaId } } },
      include: { items: true },
    });
    res.json(album);
  })
);

cmsRelationRouter.post(
  '/projects/:id/gallery',
  requirePermission('cms:write', 'cms:*'),
  wrap(async (req, res) => {
    const ids = (req.body.mediaIds as string[]) ?? [];
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { gallery: { set: ids.map((id) => ({ id })) } },
      include: { gallery: true },
    });
    res.json(project);
  })
);

/** Site-wide settings singleton. */
export const settingsRouter = Router();

settingsRouter.get(
  '/',
  wrap(async (_req, res) => {
    const cached = await cacheGet('cache:settings');
    if (cached) return res.json(cached);
    const settings = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
      include: { logo: true },
    });
    await cacheSet('cache:settings', settings, 120);
    res.json(settings);
  })
);

settingsRouter.patch(
  '/',
  requirePermission('settings:write', 'settings:*'),
  wrap(async (req, res) => {
    const settings = await prisma.siteSetting.update({
      where: { id: 'singleton' },
      data: req.body,
      include: { logo: true },
    });
    await cacheSet('cache:settings', settings, 120);
    res.json(settings);
  })
);

/** Public read-only feed consumed by the risenext.in website. */
export const publicRouter = Router();

publicRouter.get(
  '/site',
  wrap(async (_req, res) => {
    const cached = await cacheGet('cache:public:site');
    if (cached) return res.json(cached);
    const [settings, heroes, services, projects, clients, team, albums, posts, jobs] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { id: 'singleton' }, include: { logo: true } }),
      prisma.hero.findMany({ where: { state: 'PUBLISHED' }, orderBy: { order: 'asc' }, include: { media: true } }),
      prisma.service.findMany({ where: { state: 'PUBLISHED' }, orderBy: { order: 'asc' }, include: { cover: true } }),
      prisma.project.findMany({
        where: { state: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        include: { cover: true, gallery: true, client: true },
      }),
      prisma.client.findMany({ where: { state: 'PUBLISHED' }, orderBy: { order: 'asc' }, include: { logo: true } }),
      prisma.teamMember.findMany({ where: { state: 'PUBLISHED' }, orderBy: { order: 'asc' }, include: { photo: true } }),
      prisma.galleryAlbum.findMany({ where: { state: 'PUBLISHED' }, orderBy: { order: 'asc' }, include: { items: true } }),
      prisma.post.findMany({
        where: { state: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 12,
        include: { cover: true, category: true, tags: true, author: { select: { name: true, avatarUrl: true } } },
      }),
      prisma.jobOpening.findMany({ where: { state: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } }),
    ]);
    const payload = { settings, heroes, services, projects, clients, team, albums, posts, jobs };
    await cacheSet('cache:public:site', payload, 60);
    res.json(payload);
  })
);

publicRouter.get(
  '/seo',
  wrap(async (req, res) => {
    const path = String(req.query.path ?? '/');
    res.json(await prisma.seo.findUnique({ where: { path }, include: { ogImage: true } }));
  })
);
