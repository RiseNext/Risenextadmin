import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from './crud.factory';
import { prisma } from '../lib/prisma';
import { wrap, validate, HttpError } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { cacheDel } from '../lib/redis';

const publishState = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const postRouter = crudRouter({
  model: 'post',
  permission: 'blog',
  include: { cover: true, category: true, tags: true, author: { select: { id: true, name: true, avatarUrl: true } } },
  searchFields: ['title', 'excerpt', 'content'],
  orderBy: [{ createdAt: 'desc' }],
  schema: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    excerpt: z.string().optional().nullable(),
    content: z.string().default(''),
    readMinutes: z.number().default(3),
    authorId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    coverId: z.string().optional().nullable(),
    state: publishState.default('DRAFT'),
    publishedAt: z.coerce.date().optional().nullable(),
  }),
});

export const categoryRouter = crudRouter({
  model: 'category',
  permission: 'blog',
  searchFields: ['name'],
  orderBy: [{ name: 'asc' }],
  schema: z.object({ name: z.string().min(2), slug: z.string().min(2) }),
});

export const tagRouter = crudRouter({
  model: 'tag',
  permission: 'blog',
  searchFields: ['name'],
  orderBy: [{ name: 'asc' }],
  schema: z.object({ name: z.string().min(1), slug: z.string().min(1) }),
});

export const blogExtraRouter = Router();

blogExtraRouter.post(
  '/posts/:id/publish',
  requirePermission('blog:write', 'blog:*'),
  wrap(async (req, res) => {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { state: 'PUBLISHED', publishedAt: new Date() },
    });
    await audit(req, 'publish', 'post', post.id);
    await cacheDel('cache:public');
    res.json(post);
  })
);

blogExtraRouter.post(
  '/posts/:id/tags',
  requirePermission('blog:write', 'blog:*'),
  validate(z.object({ tagIds: z.array(z.string()) })),
  wrap(async (req, res) => {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { tags: { set: (req.body.tagIds as string[]).map((id) => ({ id })) } },
      include: { tags: true },
    });
    res.json(post);
  })
);

blogExtraRouter.get(
  '/comments',
  requirePermission('blog:read', 'blog:*'),
  wrap(async (req, res) => {
    const approved = req.query.approved;
    res.json(
      await prisma.comment.findMany({
        where: approved === undefined ? {} : { approved: approved === 'true' },
        include: { post: { select: { title: true, slug: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    );
  })
);

blogExtraRouter.patch(
  '/comments/:id',
  requirePermission('blog:write', 'blog:*'),
  validate(z.object({ approved: z.boolean() })),
  wrap(async (req, res) => {
    res.json(await prisma.comment.update({ where: { id: req.params.id }, data: { approved: req.body.approved } }));
  })
);

blogExtraRouter.delete(
  '/comments/:id',
  requirePermission('blog:delete', 'blog:*'),
  wrap(async (req, res) => {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

blogExtraRouter.get(
  '/posts/by-slug/:slug',
  wrap(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: { cover: true, category: true, tags: true, author: { select: { name: true, avatarUrl: true } } },
    });
    if (!post) throw new HttpError(404, 'Post not found');
    await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
    res.json(post);
  })
);
