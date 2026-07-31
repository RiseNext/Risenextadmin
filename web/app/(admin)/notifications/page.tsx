'use client';

import dayjs from 'dayjs';
import Link from 'next/link';
import { api, patch } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Spinner } from '@/components/ui';
import { useSocketEvent } from '@/lib/socket';

type Notice = { id: string; title: string; body?: string | null; kind: string; href?: string | null; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const { data, loading, reload } = useFetch<Notice[]>('/notifications');
  useSocketEvent('notification:new', () => void reload());

  return (
    <div>
      <SectionHeader
        title="Notifications"
        subtitle="Realtime alerts across leads, HR approvals, ad spend and publishing."
        actions={
          <button
            className="btn-ghost"
            onClick={async () => {
              await api('/notifications/read-all', { method: 'POST' });
              await reload();
            }}
          >
            Mark all read
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n) => (
            <Card key={n.id} className={n.read ? '' : 'border-ember/40'}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="muted mt-0.5 text-sm">{n.body}</p> : null}
                  <p className="muted mt-1.5 text-xs">{dayjs(n.createdAt).format('DD MMM YYYY, HH:mm')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={n.read ? 'neutral' : 'warn'}>{n.kind}</Badge>
                  {n.href ? <Link href={n.href} className="btn-ghost">Open</Link> : null}
                  {!n.read ? (
                    <button className="btn-primary" onClick={async () => { await patch(`/notifications/${n.id}/read`, {}); await reload(); }}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
          {(data ?? []).length === 0 ? <p className="muted py-10 text-center text-sm">No notifications.</p> : null}
        </div>
      )}
    </div>
  );
}
