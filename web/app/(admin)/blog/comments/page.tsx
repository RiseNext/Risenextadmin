'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { del, patch } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Spinner, Tabs } from '@/components/ui';

type Comment = {
  id: string; body: string; approved: boolean; authorName?: string | null; createdAt: string;
  post: { title: string; slug: string }; user?: { name: string } | null;
};

export default function CommentsPage() {
  const [filter, setFilter] = useState('false');
  const { data, loading, reload } = useFetch<Comment[]>(`/blog/comments?approved=${filter}`, [filter]);

  return (
    <div>
      <SectionHeader title="Comments" subtitle="Moderate reader comments before they appear on risenext.in." />
      <Tabs
        tabs={[{ key: 'false', label: 'Awaiting approval' }, { key: 'true', label: 'Approved' }]}
        active={filter}
        onChange={setFilter}
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{c.user?.name ?? c.authorName ?? 'Anonymous'}</span>
                    <span className="muted"> on {c.post.title}</span>
                  </p>
                  <p className="mt-1.5 text-sm">{c.body}</p>
                  <p className="muted mt-2 text-xs">{dayjs(c.createdAt).format('DD MMM YYYY, HH:mm')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.approved ? 'positive' : 'info'}>{c.approved ? 'approved' : 'pending'}</Badge>
                  {!c.approved ? (
                    <button className="btn-primary" onClick={async () => { await patch(`/blog/comments/${c.id}`, { approved: true }); await reload(); }}>Approve</button>
                  ) : (
                    <button className="btn-ghost" onClick={async () => { await patch(`/blog/comments/${c.id}`, { approved: false }); await reload(); }}>Unapprove</button>
                  )}
                  <button className="btn-ghost text-red-600" onClick={async () => { await del(`/blog/comments/${c.id}`); await reload(); }}>Delete</button>
                </div>
              </div>
            </Card>
          ))}
          {(data ?? []).length === 0 ? <p className="muted py-10 text-center text-sm">Nothing to moderate.</p> : null}
        </div>
      )}
    </div>
  );
}
