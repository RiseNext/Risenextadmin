'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Modal, Spinner, EmptyState, Tabs } from './ui';
import { Uploader, MediaCard, type MediaItem } from './Uploader';

const KIND_TABS = [
  { key: '', label: 'All' },
  { key: 'IMAGE', label: 'Images' },
  { key: 'VIDEO', label: 'Video' },
  { key: 'PDF', label: 'PDF' },
  { key: 'DOC', label: 'Docs' },
  { key: 'SHEET', label: 'Sheets' },
  { key: 'SLIDE', label: 'Slides' },
  { key: 'SVG', label: 'SVG' },
  { key: 'ZIP', label: 'ZIP' },
];

export function MediaPickerModal({
  open, onClose, onPick, accept,
}: { open: boolean; onClose: () => void; onPick: (item: MediaItem) => void; accept?: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');

  const allowed = accept?.split(',').map((s) => s.trim().toUpperCase());

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '60' });
      if (kind) params.set('kind', kind);
      if (q) params.set('q', q);
      const res = await api<{ data: MediaItem[] }>(`/media?${params}`);
      setItems(allowed?.length ? res.data.filter((m) => allowed.includes(m.kind)) : res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, q]);

  return (
    <Modal open={open} onClose={onClose} title="Media library" wide>
      <Uploader compact onUploaded={(uploaded) => setItems((prev) => [...uploaded, ...prev])} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input className="field max-w-xs" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-4">
        <Tabs tabs={KIND_TABS.filter((t) => !allowed?.length || !t.key || allowed.includes(t.key))} active={kind} onChange={setKind} />
      </div>

      {loading ? (
        <Spinner label="Loading media" />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Upload a file above to get started." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onSelect={onPick} />
          ))}
        </div>
      )}
    </Modal>
  );
}
