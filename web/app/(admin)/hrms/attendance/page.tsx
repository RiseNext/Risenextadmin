'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Select, Spinner, Stat, toneForValue } from '@/components/ui';

type Row = {
  id: string; date: string; status: string; checkIn?: string | null; checkOut?: string | null;
  minutes: number; employee: { firstName: string; lastName: string; code: string };
};
type Employee = { id: string; firstName: string; lastName: string; code: string };

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState('');
  const employees = useFetch<{ data: Employee[] }>('/hrms/employees?perPage=200');
  const { data, loading, reload } = useFetch<Row[]>(`/hrms/attendance${employeeId ? `?employeeId=${employeeId}` : ''}`, [employeeId]);
  const summary = useFetch<{ status: string; count: number }[]>('/hrms/attendance/summary');
  const [msg, setMsg] = useState<string | null>(null);

  const punch = async (kind: 'check-in' | 'check-out') => {
    try {
      await api(`/hrms/attendance/${kind}`, { method: 'POST' });
      setMsg(kind === 'check-in' ? 'Checked in.' : 'Checked out.');
      await reload();
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'Could not record attendance');
    }
  };

  return (
    <div>
      <SectionHeader
        title="Attendance"
        subtitle="Daily punches, work-from-home and absences across the studio."
        actions={
          <>
            <button className="btn-ghost" onClick={() => punch('check-in')}>Check in</button>
            <button className="btn-primary" onClick={() => punch('check-out')}>Check out</button>
          </>
        }
      />

      {msg ? <p className="mb-4 rounded-xl border px-3.5 py-2.5 text-sm muted">{msg}</p> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(summary.data ?? []).map((s) => (
          <Stat key={s.status} label={s.status.toLowerCase().replace('_', ' ')} value={s.count} hint="this month" />
        ))}
      </div>

      <Card className="mt-4 p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="min-w-[220px]">
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="All employees"
              options={(employees.data?.data ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.firstName} ${e.lastName}` }))}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {['Employee', 'Date', 'In', 'Out', 'Hours', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName} <span className="muted text-xs">{r.employee.code}</span></td>
                    <td className="px-4 py-3">{dayjs(r.date).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-3">{r.checkIn ? dayjs(r.checkIn).format('HH:mm') : '—'}</td>
                    <td className="px-4 py-3">{r.checkOut ? dayjs(r.checkOut).format('HH:mm') : '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{(r.minutes / 60).toFixed(1)}</td>
                    <td className="px-4 py-3"><Badge tone={toneForValue(r.status)}>{r.status.toLowerCase().replace('_', ' ')}</Badge></td>
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
