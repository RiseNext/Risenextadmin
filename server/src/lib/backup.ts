import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { env } from '../env';
import { prisma } from './prisma';
import { logger } from './logger';

const run = promisify(exec);

export async function createBackup(note?: string, userId?: string) {
  await fs.mkdir(env.backup.dir, { recursive: true });
  const filename = `risenext-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  const target = path.join(env.backup.dir, filename);
  await run(`pg_dump --no-owner --clean --dbname="${env.databaseUrl}" -f "${target}"`);
  const stat = await fs.stat(target);
  return prisma.backup.create({
    data: { filename, bytes: Number(stat.size), note, createdBy: userId, driver: 'local' },
  });
}

export async function restoreBackup(id: string) {
  const record = await prisma.backup.findUnique({ where: { id } });
  if (!record) throw Object.assign(new Error('Backup not found'), { status: 404 });
  const file = path.join(env.backup.dir, record.filename);
  await run(`psql --dbname="${env.databaseUrl}" -f "${file}"`);
  return { restored: record.filename };
}

export function scheduleBackups() {
  if (!env.isProd) return;
  cron.schedule(env.backup.cron, async () => {
    try {
      const b = await createBackup('scheduled');
      logger.info('backup created', b.filename);
    } catch (e) {
      logger.error('backup failed', (e as Error).message);
    }
  });
}
