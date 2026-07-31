import nodemailer from 'nodemailer';
import { env } from '../env';
import { prisma } from './prisma';
import { logger } from './logger';

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

export function render(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  templateName?: string;
}) {
  const log = await prisma.messageLog.create({
    data: { channel: 'EMAIL', to: opts.to, subject: opts.subject, body: opts.html, status: 'QUEUED' },
  });
  if (!transporter) {
    logger.warn('SMTP not configured — mail logged only:', opts.subject);
    await prisma.messageLog.update({ where: { id: log.id }, data: { status: 'SKIPPED' } });
    return log;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to: opts.to, subject: opts.subject, html: opts.html });
    return prisma.messageLog.update({ where: { id: log.id }, data: { status: 'SENT' } });
  } catch (e) {
    return prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: (e as Error).message },
    });
  }
}

export async function sendTemplate(name: string, to: string, vars: Record<string, string | number>) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { name } });
  if (!tpl) throw Object.assign(new Error('Template not found'), { status: 404 });
  return sendMail({ to, subject: render(tpl.subject, vars), html: render(tpl.html, vars), templateName: name });
}
