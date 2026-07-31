'use client';

import { useEffect, useState } from 'react';
import { FolderPlus, Folder, Trash2 } from 'lucide-react';
import { api, del, post } from '@/lib/api';
import { Card, EmptyState, SectionHeader, Spinner } from '@/components/ui';
import { Uploader, MediaCard, type MediaItem } from '@/components/Uploader';

type FolderRow = { id: string; name: string; parentId?: string | null; _count?: { media: number; children: number } };

export default function FileManagerPage() {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [current, setCurrent] = useState<string>('root');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [f, m] = await Promise.all([
        api<FolderRow[]>('/folders'),
        api<{ data: MediaItem[] }>(`/media?perPage=60&folderId=${current}`),
      ]);
      setFolders(f);
      setItems(m.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div>
      <SectionHeader title="File manager" subtitle="Organise assets into folders for each brand, campaign or shoot." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-max">
          <p className="label">Folders</p>
          <ul className="space-y-1 text-sm">
            <li>
              <button
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${current === 'root' ? 'bg-ink text-cream dark:bg-cream dark:text-ink' : 'hover:bg-cream-200/70 dark:hover:bg-night-700'}`}
                onClick={() => setCurrent('root')}
              >
                <Folder size={14} /> Unsorted
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id} className="group flex items-center gap-1">
                <button
                  className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left ${current === f.id ? 'bg-ink text-cream dark:bg-cream dark:text-ink' : 'hover:bg-cream-200/70 dark:hover:bg-night-700'}`}
                  onClick={() => setCurrent(f.id)}
                >
                  <Folder size={14} /> {f.name}
                  <span className="muted ml-auto text-xs">{f._count?.media ?? 0}</span>
                </button>
                <button
                  className="btn-ghost h-8 w-8 !px-0 opacity-0 transition group-hover:opacity-100"
                  onClick={async () => { await del(`/folders/${f.id}`); await load(); }}
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <input className="field" placeholder="New folder" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button
              className="btn-ghost"
              onClick={async () => {
                if (!newName.trim()) return;
                await post('/folders', { name: newName.trim() });
                setNewName('');
                await load();
              }}
              aria-label="Create folder"
            >
              <FolderPlus size={14} />
            </button>
          </div>
        </Card>

        <div>
          <Card>
            <Uploader
              compact
              folderId={current === 'root' ? undefined : current}
              onUploaded={(uploaded) => setItems((prev) => [...uploaded, ...prev])}
            />
          </Card>

          <div className="mt-4">
            {loading ? (
              <Spinner label="Loading files" />
            ) : items.length === 0 ? (
              <EmptyState title="This folder is empty" hint="Drop files above to add them here." />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <MediaCard key={item.id} item={item} onDelete={(id) => setItems((prev) => prev.filter((p) => p.id !== id))} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
