'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { patch } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Spinner, Tabs, toneForValue } from '@/components/ui';

type Leave = {
  id: string; from: string; to: string; days: number; reason?: string | null; status: string;
  employee: { firstName: string; lastName: string; code: string };
  type: { name: string; paid: boolean };
};

export default function LeavePage() {
  const [status, setStatus] = useState('PENDING');
  const { data, loading, reload } = useFetch<Leave[]>(`/hrms/leave${status ? `?status=${status}` : ''}`, [status]);

  const decide = async (id: string, next: 'APPROVED' | 'REJECTED') => {
    await patch(`/hrms/leave/${id}/decision`, { status: next });
    await reload();
  };

  return (
    <div>
      <SectionHeader title="Leave management" subtitle="Approve or decline requests; employees are notified in realtime." />
      <Tabs
        tabs={[{ key: 'PENDING', label: 'Pending' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }, { key: '', label: 'All' }]}
        active={status}
        onChange={setStatus}
      />

      <Card className="p-0">
        {loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((l) => (
                  <tr key={l.id} className="table-row">
                    <td className="px-4 py-3">{l.employee.firstName} {l.employee.lastName}</td>
                    <td className="px-4 py-3">{l.type.name} {l.type.paid ? '' : <span className="muted text-xs">(unpaid)</span>}</td>
                    <td className="px-4 py-3">{dayjs(l.from).format('DD MMM')}</td>
                    <td className="px-4 py-3">{dayjs(l.to).format('DD MMM')}</td>
                    <td className="px-4 py-3 tabular-nums">{l.days}</td>
                    <td className="px-4 py-3 muted">{l.reason ?? '—'}</td>
                    <td className="px-4 py-3"><Badge tone={toneForValue(l.status)}>{l.status.toLowerCase()}</Badge></td>
                    <td className="px-4 py-3">
                      {l.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button className="btn-ghost" onClick={() => decide(l.id, 'REJECTED')}>Decline</button>
                          <button className="btn-primary" onClick={() => decide(l.id, 'APPROVED')}>Approve</button>
                        </div>
                      ) : null}
                    </td>
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
