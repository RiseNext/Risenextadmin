import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { logger } from '../lib/logger';
import { env } from '../env';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFound = (_req: Request, res: Response) =>
  res.status(404).json({ error: 'Route not found' });

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
  }
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message ?? 'Unexpected error';
  if (status >= 500) logger.error(message, env.isProd ? '' : (err as Error).stack);
  res.status(status).json({ error: message });
}

export function validate(schema: ZodSchema, where: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[where] = schema.parse(req[where]) as never;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Wraps async handlers so rejections reach errorHandler. */
export const wrap =
  <T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
