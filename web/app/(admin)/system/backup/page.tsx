'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { bytes } from '@/lib/format';
import { Card, Confirm, SectionHeader, Spinner } from '@/components/ui';

type Backup = { id: string; filename: string; bytes: number; note?: string | null; createdAt: string };

export default function BackupPage() {
  const { data, loading, reload } = useFetch<Backup[]>('/backups');
  const [busy, setBusy] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api('/backups', { method: 'POST', body: JSON.stringify({ note: 'manual' }) });
      await reload();
      setMsg('Backup created.');
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'Backup failed — check pg_dump availability on the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Backup & restore"
        subtitle="Full PostgreSQL snapshots. Scheduled nightly in production; restores are super-admin only."
        actions={<button className="btn-primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create backup'}</button>}
      />

      {msg ? <p className="mb-4 rounded-xl border px-3.5 py-2.5 text-sm muted">{msg}</p> : null}

      <Card className="p-0">
        {loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {['File', 'Size', 'Note', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((b) => (
                <tr key={b.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs">{b.filename}</td>
                  <td className="px-4 py-3">{bytes(b.bytes)}</td>
                  <td className="px-4 py-3 muted">{b.note ?? '—'}</td>
                  <td className="px-4 py-3 muted">{dayjs(b.createdAt).format('DD MMM YYYY HH:mm')}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost" onClick={() => setRestoreId(b.id)}>Restore</button>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 ? (
                <tr><td colSpan={5} className="muted px-4 py-10 text-center">No backups yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        )}
      </Card>

      <Confirm
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        title="Restore this backup?"
        body="The current database will be overwritten with the snapshot contents."
        onConfirm={async () => {
          if (!restoreId) return;
          await api(`/backups/${restoreId}/restore`, { method: 'POST' });
          setMsg('Restore complete.');
        }}
      />
    </div>
  );
}
