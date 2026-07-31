import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate, wrap, HttpError } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { cacheDel } from '../lib/redis';
import { emitAll } from '../lib/socket';

type Delegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
};

export type CrudOptions = {
  /** Prisma model key, e.g. 'service' */
  model: keyof typeof prisma;
  /** permission prefix, e.g. 'cms' */
  permission: string;
  schema: z.ZodSchema;
  updateSchema?: z.ZodSchema;
  searchFields?: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  /** enables PATCH /reorder with [{id, order}] */
  reorderable?: boolean;
  socketEvent?: string;
};

/**
 * Builds a fully-featured CRUD router: list (search + filter + pagination + sort),
 * read, create, update, delete, bulk delete, optional reorder — all audited.
 */
export function crudRouter(opts: CrudOptions) {
  const router = Router();
  const model = () => prisma[opts.model] as unknown as Delegate;
  const resource = String(opts.model);
  const cacheKey = `cache:${resource}`;

  const listQuery = z.object({
    q: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    perPage: z.coerce.number().min(1).max(200).default(25),
    sort: z.string().optional(),
    dir: z.enum(['asc', 'desc']).default('desc'),
    state: z.string().optional(),
    status: z.string().optional(),
    stage: z.string().optional(),
  });

  router.get(
    '/',
    requirePermission(`${opts.permission}:read`, `${opts.permission}:*`),
    wrap(async (req: Request, res: Response) => {
      const { q, page, perPage, sort, dir, state, status, stage } = listQuery.parse(req.query);
      const where: Record<string, unknown> = {};
      if (q && opts.searchFields?.length) {
        where.OR = opts.searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
      }
      if (state) where.state = state;
      if (status) where.status = status;
      if (stage) where.stage = stage;

      const orderBy = sort ? [{ [sort]: dir }] : (opts.orderBy ?? [{ createdAt: 'desc' as const }]);
      const [rows, total] = await Promise.all([
        model().findMany({
          where,
          include: opts.include,
          orderBy,
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        model().count({ where }),
      ]);
      res.json({ data: rows, meta: { page, perPage, total, pages: Math.ceil(total / perPage) } });
    })
  );

  router.get(
    '/:id',
    requirePermission(`${opts.permission}:read`, `${opts.permission}:*`),
    wrap(async (req, res) => {
      const row = await model().findUnique({ where: { id: req.params.id }, include: opts.include });
      if (!row) throw new HttpError(404, `${resource} not found`);
      res.json(row);
    })
  );

  router.post(
    '/',
    requirePermission(`${opts.permission}:write`, `${opts.permission}:*`),
    validate(opts.schema),
    wrap(async (req, res) => {
      const row = await model().create({ data: req.body, include: opts.include });
      await audit(req, 'create', resource, row.id, null, row);
      await cacheDel(cacheKey);
      emitAll(opts.socketEvent ?? `${resource}:created`, row);
      res.status(201).json(row);
    })
  );

  router.patch(
    '/:id',
    requirePermission(`${opts.permission}:write`, `${opts.permission}:*`),
    validate(opts.updateSchema ?? (opts.schema as z.AnyZodObject).partial?.() ?? opts.schema),
    wrap(async (req, res) => {
      const before = await model().findUnique({ where: { id: req.params.id } });
      if (!before) throw new HttpError(404, `${resource} not found`);
      const row = await model().update({ where: { id: req.params.id }, data: req.body, include: opts.include });
      await audit(req, 'update', resource, req.params.id, before, row);
      await cacheDel(cacheKey);
      emitAll(opts.socketEvent ?? `${resource}:updated`, row);
      res.json(row);
    })
  );

  router.delete(
    '/:id',
    requirePermission(`${opts.permission}:delete`, `${opts.permission}:*`),
    wrap(async (req, res) => {
      const before = await model().findUnique({ where: { id: req.params.id } });
      if (!before) throw new HttpError(404, `${resource} not found`);
      await model().delete({ where: { id: req.params.id } });
      await audit(req, 'delete', resource, req.params.id, before, null);
      await cacheDel(cacheKey);
      emitAll(opts.socketEvent ?? `${resource}:deleted`, { id: req.params.id });
      res.json({ ok: true });
    })
  );

  router.post(
    '/bulk-delete',
    requirePermission(`${opts.permission}:delete`, `${opts.permission}:*`),
    validate(z.object({ ids: z.array(z.string()).min(1) })),
    wrap(async (req, res) => {
      const ids = req.body.ids as string[];
      // deleteMany is available on every delegate at runtime
      const deleted = await (prisma[opts.model] as unknown as {
        deleteMany: (a: unknown) => Promise<{ count: number }>;
      }).deleteMany({ where: { id: { in: ids } } });
      await audit(req, 'bulk-delete', resource, undefined, { ids }, null);
      await cacheDel(cacheKey);
      res.json({ ok: true, count: deleted.count });
    })
  );

  if (opts.reorderable) {
    router.patch(
      '/reorder',
      requirePermission(`${opts.permission}:write`, `${opts.permission}:*`),
      validate(z.object({ items: z.array(z.object({ id: z.string(), order: z.number() })) })),
      wrap(async (req, res) => {
        const items = req.body.items as { id: string; order: number }[];
        await prisma.$transaction(
          items.map((i) => model().update({ where: { id: i.id }, data: { order: i.order } }) as never)
        );
        await audit(req, 'reorder', resource, undefined, null, items);
        await cacheDel(cacheKey);
        res.json({ ok: true });
      })
    );
  }

  return router;
}
