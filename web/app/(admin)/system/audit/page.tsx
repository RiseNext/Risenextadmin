'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Spinner } from '@/components/ui';
import { useSocketEvent } from '@/lib/socket';

type Log = {
  id: string; action: string; resource: string; entityId?: string | null; ip?: string | null;
  createdAt: string; user?: { name: string; email: string } | null;
};

export default function AuditPage() {
  const [resource, setResource] = useState('');
  const { data, loading, reload } = useFetch<{ data: Log[]; meta: { total: number } }>(
    `/audit?perPage=100${resource ? `&resource=${resource}` : ''}`,
    [resource]
  );
  useSocketEvent('audit:new', () => void reload());

  return (
    <div>
      <SectionHeader title="Audit logs" subtitle="Every create, update, delete, login and export — with before/after snapshots." />

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <input className="field max-w-xs" placeholder="Filter by resource (e.g. post)" value={resource} onChange={(e) => setResource(e.target.value)} />
          <span className="muted text-xs">{data?.meta.total ?? 0} entries</span>
        </div>

        {loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {['When', 'Who', 'Action', 'Resource', 'Entity', 'IP'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((l) => (
                  <tr key={l.id} className="table-row">
                    <td className="px-4 py-3 whitespace-nowrap muted">{dayjs(l.createdAt).format('DD MMM HH:mm:ss')}</td>
                    <td className="px-4 py-3">{l.user?.name ?? 'System'}</td>
                    <td className="px-4 py-3"><Badge>{l.action}</Badge></td>
                    <td className="px-4 py-3">{l.resource}</td>
                    <td className="px-4 py-3 font-mono text-xs muted">{l.entityId ?? '—'}</td>
                    <td className="px-4 py-3 muted">{l.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
