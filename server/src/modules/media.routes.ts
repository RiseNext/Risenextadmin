import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { upload, kindOf } from '../middleware/upload';
import { store, destroy, compressIfImage } from '../lib/storage';
import { wrap, validate, HttpError } from '../middleware/error';
import { requirePermission } from '../middleware/rbac';
import { audit } from '../middleware/audit';
import { emitAll } from '../lib/socket';
import type { MediaKind } from '@prisma/client';

export const mediaRouter = Router();

mediaRouter.get(
  '/',
  requirePermission('media:read', 'media:*'),
  wrap(async (req, res) => {
    const q = z
      .object({
        q: z.string().optional(),
        kind: z.string().optional(),
        folderId: z.string().optional(),
        page: z.coerce.number().default(1),
        perPage: z.coerce.number().max(120).default(48),
      })
      .parse(req.query);

    const where: Record<string, unknown> = {};
    if (q.q) where.OR = [
      { filename: { contains: q.q, mode: 'insensitive' } },
      { alt: { contains: q.q, mode: 'insensitive' } },
    ];
    if (q.kind) where.kind = q.kind as MediaKind;
    if (q.folderId) where.folderId = q.folderId === 'root' ? null : q.folderId;

    const [data, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: { uploadedBy: { select: { name: true } }, folder: true },
      }),
      prisma.media.count({ where }),
    ]);
    res.json({ data, meta: { ...q, total, pages: Math.ceil(total / q.perPage) } });
  })
);

mediaRouter.post(
  '/upload',
  requirePermission('media:write', 'media:*'),
  upload.array('files', 20),
  wrap(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) throw new HttpError(400, 'No files received');
    const folderId = (req.body.folderId as string) || null;
    const folder = (req.body.folder as string) || 'risenext';

    const created = [];
    for (const file of files) {
      const { buffer, mime } = await compressIfImage(file.buffer, file.mimetype);
      const stored = await store(buffer, file.originalname, mime, folder);
      const media = await prisma.media.create({
        data: {
          kind: kindOf(mime) as MediaKind,
          url: stored.url,
          publicId: stored.publicId,
          filename: file.originalname,
          mime,
          bytes: stored.bytes,
          width: stored.width,
          height: stored.height,
          duration: stored.duration,
          alt: (req.body.alt as string) || null,
          folderId,
          uploadedById: req.user!.id,
        },
      });
      created.push(media);
      emitAll('media:uploaded', media);
    }
    await audit(req, 'upload', 'media', undefined, null, { count: created.length });
    res.status(201).json(created);
  })
);

mediaRouter.post(
  '/:id/replace',
  requirePermission('media:write', 'media:*'),
  upload.single('file'),
  wrap(async (req, res) => {
    const existing = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Media not found');
    const file = req.file as Express.Multer.File;
    if (!file) throw new HttpError(400, 'No file received');
    const { buffer, mime } = await compressIfImage(file.buffer, file.mimetype);
    const stored = await store(buffer, file.originalname, mime);
    await destroy(existing.publicId, existing.url);
    const media = await prisma.media.update({
      where: { id: existing.id },
      data: {
        url: stored.url,
        publicId: stored.publicId,
        filename: file.originalname,
        mime,
        bytes: stored.bytes,
        width: stored.width,
        height: stored.height,
        kind: kindOf(mime) as MediaKind,
      },
    });
    await audit(req, 'replace', 'media', media.id, existing, media);
    res.json(media);
  })
);

mediaRouter.patch(
  '/:id',
  requirePermission('media:write', 'media:*'),
  validate(z.object({ alt: z.string().optional().nullable(), folderId: z.string().optional().nullable() })),
  wrap(async (req, res) => {
    res.json(await prisma.media.update({ where: { id: req.params.id }, data: req.body }));
  })
);

mediaRouter.delete(
  '/:id',
  requirePermission('media:delete', 'media:*'),
  wrap(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (!media) throw new HttpError(404, 'Media not found');
    await destroy(media.publicId, media.url);
    await prisma.media.delete({ where: { id: media.id } });
    await audit(req, 'delete', 'media', media.id, media, null);
    emitAll('media:deleted', { id: media.id });
    res.json({ ok: true });
  })
);

mediaRouter.get(
  '/stats',
  requirePermission('media:read', 'media:*'),
  wrap(async (_req, res) => {
    const grouped = await prisma.media.groupBy({ by: ['kind'], _count: { _all: true }, _sum: { bytes: true } });
    res.json(
      grouped.map((g) => ({ kind: g.kind, count: g._count._all, bytes: g._sum.bytes ?? 0 }))
    );
  })
);

/** Folder tree — the File Manager. */
export const folderRouter = Router();

folderRouter.get(
  '/',
  requirePermission('media:read', 'media:*'),
  wrap(async (_req, res) => {
    const folders = await prisma.folder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { media: true, children: true } } },
    });
    res.json(folders);
  })
);

folderRouter.post(
  '/',
  requirePermission('media:write', 'media:*'),
  validate(z.object({ name: z.string().min(1), parentId: z.string().optional().nullable() })),
  wrap(async (req, res) => {
    res.status(201).json(await prisma.folder.create({ data: req.body }));
  })
);

folderRouter.patch(
  '/:id',
  requirePermission('media:write', 'media:*'),
  validate(z.object({ name: z.string().min(1).optional(), parentId: z.string().optional().nullable() })),
  wrap(async (req, res) => {
    res.json(await prisma.folder.update({ where: { id: req.params.id }, data: req.body }));
  })
);

folderRouter.delete(
  '/:id',
  requirePermission('media:delete', 'media:*'),
  wrap(async (req, res) => {
    await prisma.media.updateMany({ where: { folderId: req.params.id }, data: { folderId: null } });
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);
