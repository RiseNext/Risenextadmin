import Redis from 'ioredis';
import { env } from '../env';
import { logger } from './logger';

/** Redis is optional in dev — every helper degrades to an in-memory Map. */
const memory = new Map<string, { v: string; exp: number }>();

export const redis = env.redisUrl
  ? new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 })
  : null;

if (redis) {
  redis.connect().catch((e) => logger.warn('redis unavailable, using memory cache', e.message));
  redis.on('error', (e) => logger.warn('redis error', e.message));
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis && redis.status === 'ready') {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const hit = memory.get(key);
  if (!hit || hit.exp < Date.now()) return null;
  return JSON.parse(hit.v) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  const raw = JSON.stringify(value);
  if (redis && redis.status === 'ready') {
    await redis.set(key, raw, 'EX', ttlSeconds);
    return;
  }
  memory.set(key, { v: raw, exp: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(prefix: string) {
  if (redis && redis.status === 'ready') {
    const keys = await redis.keys(prefix + '*');
    if (keys.length) await redis.del(keys);
    return;
  }
  for (const k of [...memory.keys()]) if (k.startsWith(prefix)) memory.delete(k);
}

/** Atomic counter used by the login throttle. */
export async function incrWithTtl(key: string, ttlSeconds: number) {
  if (redis && redis.status === 'ready') {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, ttlSeconds);
    return n;
  }
  const hit = memory.get(key);
  const alive = hit && hit.exp > Date.now();
  const n = alive ? Number(hit!.v) + 1 : 1;
  memory.set(key, { v: String(n), exp: alive ? hit!.exp : Date.now() + ttlSeconds * 1000 });
  return n;
}

export async function ttl(key: string) {
  if (redis && redis.status === 'ready') return redis.ttl(key);
  const hit = memory.get(key);
  if (!hit) return -2;
  return Math.max(0, Math.round((hit.exp - Date.now()) / 1000));
}

export async function reset(key: string) {
  if (redis && redis.status === 'ready') await redis.del(key);
  memory.delete(key);
}
