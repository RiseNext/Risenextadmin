import dotenv from 'dotenv';
import path from 'path';

// Always load server/.env
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

console.log("DATABASE_URL =", process.env.DATABASE_URL);

function num(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  webOrigin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    expires: process.env.JWT_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  login: {
    maxAttempts: num(process.env.LOGIN_MAX_ATTEMPTS, 5),
    lockSeconds: num(process.env.LOGIN_LOCK_SECONDS, 15),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  uploadDriver: (process.env.UPLOAD_DRIVER ?? 'local') as 'cloudinary' | 'local',
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 200),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'Rise Next <hello@risenext.in>',
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? '',
    phoneId: process.env.WHATSAPP_PHONE_ID ?? '',
  },
  ads: {
    metaToken: process.env.META_ACCESS_TOKEN ?? '',
    metaAccount: process.env.META_AD_ACCOUNT_ID ?? '',
    googleDevToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
    googleCustomer: process.env.GOOGLE_ADS_CUSTOMER_ID ?? '',
    googleRefresh: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '',
  },
  ga4: {
    propertyId: process.env.GA4_PROPERTY_ID ?? '',
  },
  backup: {
    dir: process.env.BACKUP_DIR ?? './backups',
    cron: process.env.BACKUP_CRON ?? '0 3 * * *',
  },
};
