'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { bytes } from '@/lib/format';
import { Card, EmptyState, SectionHeader, Spinner, Tabs, Stat } from '@/components/ui';
import { Uploader, MediaCard, type MediaItem } from '@/components/Uploader';
import { useSocketEvent } from '@/lib/socket';

const KINDS = [
  { key: '', label: 'All' },
  { key: 'IMAGE', label: 'Images' },
  { key: 'VIDEO', label: 'Video' },
  { key: 'PDF', label: 'PDF' },
  { key: 'DOC', label: 'Word' },
  { key: 'SHEET', label: 'Excel' },
  { key: 'SLIDE', label: 'PowerPoint' },
  { key: 'SVG', label: 'SVG' },
  { key: 'ZIP', label: 'ZIP' },
];

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<{ kind: string; count: number; bytes: number }[]>([]);
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '60' });
      if (kind) params.set('kind', kind);
      if (q) params.set('q', q);
      const [res, s] = await Promise.all([
        api<{ data: MediaItem[] }>(`/media?${params}`),
        api<{ kind: string; count: number; bytes: number }[]>('/media/stats'),
      ]);
      setItems(res.data);
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, q]);

  useSocketEvent<MediaItem>('media:uploaded', (m) => setItems((prev) => [m, ...prev.filter((p) => p.id !== m.id)]));

  const totalBytes = stats.reduce((a, s) => a + s.bytes, 0);
  const totalFiles = stats.reduce((a, s) => a + s.count, 0);

  return (
    <div>
      <SectionHeader
        title="Media manager"
        subtitle="Every asset used across risenext.in — images, film, decks and documents."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Files" value={totalFiles} />
        <Stat label="Storage used" value={bytes(totalBytes)} />
        <Stat label="Images" value={stats.find((s) => s.kind === 'IMAGE')?.count ?? 0} />
        <Stat label="Videos" value={stats.find((s) => s.kind === 'VIDEO')?.count ?? 0} />
      </div>

      <Card>
        <Uploader onUploaded={(uploaded) => setItems((prev) => [...uploaded, ...prev])} />
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input className="field max-w-xs" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-4">
        <Tabs tabs={KINDS} active={kind} onChange={setKind} />
      </div>

      {loading ? (
        <Spinner label="Loading media" />
      ) : items.length === 0 ? (
        <EmptyState title="No files yet" hint="Drop assets above — images are compressed automatically." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onDelete={(id) => setItems((prev) => prev.filter((p) => p.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
