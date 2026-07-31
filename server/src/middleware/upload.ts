import multer from 'multer';
import { env } from '../env';
import { HttpError } from './error';

export const ALLOWED = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
  SVG: ['image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  PDF: ['application/pdf'],
  DOC: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  SHEET: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  SLIDE: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  ZIP: ['application/zip', 'application/x-zip-compressed'],
} as const;

export type MediaKindName = keyof typeof ALLOWED | 'OTHER';

export function kindOf(mime: string): MediaKindName {
  for (const [kind, list] of Object.entries(ALLOWED)) {
    if ((list as readonly string[]).includes(mime)) return kind as MediaKindName;
  }
  return 'OTHER';
}

const all = Object.values(ALLOWED).flat() as string[];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!all.includes(file.mimetype)) {
      return cb(new HttpError(415, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});
