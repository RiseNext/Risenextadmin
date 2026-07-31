'use client';

import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { UploadCloud, File as FileIcon, X, RefreshCw, Trash2 } from 'lucide-react';
import { uploadFiles, del, API_URL } from '@/lib/api';
import { bytes } from '@/lib/format';

export type MediaItem = {
  id: string;
  kind: string;
  url: string;
  filename: string;
  mime: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  createdAt?: string;
};

export const mediaUrl = (url?: string | null) =>
  !url ? '' : url.startsWith('http') ? url : `${API_URL}${url}`;

type Job = { id: string; name: string; size: number; pct: number; error?: string; done?: boolean };

export function Uploader({
  onUploaded, folderId, accept, multiple = true, compact,
}: {
  onUploaded?: (items: MediaItem[]) => void;
  folderId?: string;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const batch: Job[] = files.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, name: f.name, size: f.size, pct: 0 }));
      setJobs((prev) => [...prev, ...batch]);
      try {
        const items = (await uploadFiles(
          '/media/upload',
          files,
          folderId ? { folderId } : {},
          (pct) => setJobs((prev) => prev.map((j) => (batch.some((b) => b.id === j.id) ? { ...j, pct } : j)))
        )) as MediaItem[];
        setJobs((prev) => prev.map((j) => (batch.some((b) => b.id === j.id) ? { ...j, pct: 100, done: true } : j)));
        onUploaded?.(items);
        setTimeout(() => setJobs((prev) => prev.filter((j) => !batch.some((b) => b.id === j.id))), 1600);
      } catch (e) {
        const message = (e as { message?: string }).message ?? 'Upload failed';
        setJobs((prev) => prev.map((j) => (batch.some((b) => b.id === j.id) ? { ...j, error: message } : j)));
      }
    },
    [folderId, onUploaded]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(Array.from(e.dataTransfer.files));
        }}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center transition',
          compact ? 'px-4 py-6' : 'px-6 py-12',
          dragging ? 'border-ember bg-ember-100/60 dark:bg-ember/10' : 'hover:bg-cream-200/50 dark:hover:bg-night-700'
        )}
      >
        <UploadCloud className={clsx('transition', dragging && 'scale-110 text-ember')} size={compact ? 20 : 28} />
        <p className="text-sm font-medium">Drop files or click to upload</p>
        {!compact ? (
          <p className="muted max-w-sm text-xs">
            Images, video, PDF, Word, Excel, PowerPoint, SVG and ZIP. Images are compressed automatically; uploads
            continue in the background.
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          void send(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      {jobs.length ? (
        <ul className="mt-4 space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="card px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <FileIcon size={14} />
                  <span className="truncate">{j.name}</span>
                </span>
                <span className="muted whitespace-nowrap">
                  {j.error ? j.error : j.done ? 'Done' : `${j.pct}% · ${bytes(j.size)}`}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream-200 dark:bg-night-600">
                <motion.div
                  className={clsx('h-full rounded-full', j.error ? 'bg-red-500' : 'bg-ember')}
                  animate={{ width: `${j.error ? 100 : j.pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function MediaPreview({ item, className }: { item?: MediaItem | null; className?: string }) {
  if (!item) return <div className={clsx('skeleton aspect-[4/3] w-full', className)} />;
  const url = mediaUrl(item.url);
  if (item.kind === 'IMAGE' || item.kind === 'SVG') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={item.alt ?? item.filename} className={clsx('h-full w-full object-cover', className)} />;
  }
  if (item.kind === 'VIDEO') {
    return <video src={url} controls className={clsx('h-full w-full bg-black object-cover', className)} />;
  }
  return (
    <div className={clsx('flex h-full w-full flex-col items-center justify-center gap-1.5 bg-cream-200/70 p-4 text-center dark:bg-night-700', className)}>
      <FileIcon size={20} />
      <span className="text-[11px] leading-tight">{item.filename}</span>
      <span className="muted text-[10px]">{item.kind} · {bytes(item.bytes)}</span>
    </div>
  );
}

export function MediaCard({
  item, onDelete, onReplace, selected, onSelect,
}: {
  item: MediaItem;
  onDelete?: (id: string) => void;
  onReplace?: (item: MediaItem) => void;
  selected?: boolean;
  onSelect?: (item: MediaItem) => void;
}) {
  return (
    <div className={clsx('card group relative overflow-hidden p-0', selected && 'ring-2 ring-ember')}>
      <button className="block aspect-[4/3] w-full" onClick={() => onSelect?.(item)}>
        <MediaPreview item={item} />
      </button>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs">{item.filename}</span>
        <span className="muted whitespace-nowrap text-[10px]">{bytes(item.bytes)}</span>
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
        {onReplace ? (
          <button className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-cream" onClick={() => onReplace(item)} aria-label="Replace">
            <RefreshCw size={12} />
          </button>
        ) : null}
        {onDelete ? (
          <button
            className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-cream hover:bg-red-600"
            onClick={async () => {
              await del(`/media/${item.id}`);
              onDelete(item.id);
            }}
            aria-label="Delete"
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SelectedMediaChip({ item, onClear }: { item: MediaItem; onClear: () => void }) {
  return (
    <div className="card flex items-center gap-3 p-2">
      <div className="h-12 w-16 overflow-hidden rounded-lg">
        <MediaPreview item={item} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.filename}</p>
        <p className="muted text-xs">{item.kind} · {bytes(item.bytes)}</p>
      </div>
      <button className="btn-ghost h-8 w-8 !px-0" onClick={onClear} aria-label="Clear"><X size={14} /></button>
    </div>
  );
}
