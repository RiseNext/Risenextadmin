import { env } from '../env';
import { prisma } from './prisma';
import { logger } from './logger';

/** WhatsApp Cloud API sender. Logs every message to MessageLog. */
export async function sendWhatsApp(to: string, body: string, template?: string) {
  const log = await prisma.messageLog.create({
    data: { channel: 'WHATSAPP', to, body, status: 'QUEUED' },
  });

  if (!env.whatsapp.token || !env.whatsapp.phoneId) {
    logger.warn('WhatsApp not configured — message logged only');
    return prisma.messageLog.update({ where: { id: log.id }, data: { status: 'SKIPPED' } });
  }

  const payload = template
    ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: 'en' } } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body } };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${env.whatsapp.phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return prisma.messageLog.update({ where: { id: log.id }, data: { status: 'SENT' } });
  } catch (e) {
    return prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: (e as Error).message },
    });
  }
}
