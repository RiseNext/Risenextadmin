import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { env } from '../env';
import { logger } from './logger';

if (env.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export type StoredFile = {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
};

const LOCAL_DIR = path.resolve(process.cwd(), 'uploads');

/** Compress images before storage; leave other formats untouched. */
export async function compressIfImage(buffer: Buffer, mime: string) {
  if (!mime.startsWith('image/') || mime === 'image/svg+xml') return { buffer, mime };
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return out.byteLength < buffer.byteLength
    ? { buffer: out, mime: 'image/webp' }
    : { buffer, mime };
}

export async function store(
  buffer: Buffer,
  filename: string,
  mime: string,
  folder = 'risenext'
): Promise<StoredFile> {
  if (env.uploadDriver === 'cloudinary' && env.cloudinary.cloudName) {
    const resourceType = mime.startsWith('video/')
      ? 'video'
      : mime.startsWith('image/')
        ? 'image'
        : 'raw';
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder, resource_type: resourceType, filename_override: filename, use_filename: true },
          (err, res) => {
            if (err || !res) return reject(err);
            resolve({
              url: res.secure_url,
              publicId: res.public_id,
              width: res.width,
              height: res.height,
              duration: (res as { duration?: number }).duration,
              bytes: res.bytes,
            });
          }
        )
        .end(buffer);
    });
  }

  await fs.mkdir(path.join(LOCAL_DIR, folder), { recursive: true });
  const safe = `${Date.now()}-${filename.replace(/[^\w.\-]+/g, '_')}`;
  const rel = path.join(folder, safe);
  await fs.writeFile(path.join(LOCAL_DIR, rel), buffer);
  let width: number | undefined;
  let height: number | undefined;
  if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
    const meta = await sharp(buffer).metadata();
    width = meta.width;
    height = meta.height;
  }
  return { url: `/static/${rel.split(path.sep).join('/')}`, bytes: buffer.byteLength, width, height };
}

export async function destroy(publicId?: string | null, url?: string) {
  try {
    if (publicId && env.cloudinary.cloudName) {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
      return;
    }
    if (url?.startsWith('/static/')) {
      await fs.unlink(path.join(LOCAL_DIR, url.replace('/static/', '')));
    }
  } catch (e) {
    logger.warn('destroy failed', (e as Error).message);
  }
}
