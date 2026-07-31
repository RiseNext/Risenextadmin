'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api, patch } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { inr } from '@/lib/format';
import { Badge, Card, SectionHeader, Select, Spinner, Stat, toneForValue } from '@/components/ui';

type Payslip = {
  id: string; month: number; year: number; basic: number; hra: number; allowances: number;
  deductions: number; tds: number; netPay: number; status: string;
  employee: { firstName: string; lastName: string; code: string; designation: string };
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: dayjs().month(i).format('MMMM') }));

export default function PayrollPage() {
  const [month, setMonth] = useState(String(dayjs().month() + 1));
  const [year, setYear] = useState(String(dayjs().year()));
  const { data, loading, reload } = useFetch<Payslip[]>(`/hrms/payroll?month=${month}&year=${year}`, [month, year]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await api('/hrms/payroll/run', { method: 'POST', body: JSON.stringify({ month: Number(month), year: Number(year) }) });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const rows = data ?? [];
  const gross = rows.reduce((a, r) => a + r.basic + r.hra + r.allowances, 0);
  const net = rows.reduce((a, r) => a + r.netPay, 0);

  return (
    <div>
      <SectionHeader
        title="Payroll"
        subtitle="Generate, approve and mark payslips as paid. Figures derive from each employee's CTC."
        actions={<button className="btn-primary" onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run payroll'}</button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Employees" value={rows.length} />
        <Stat label="Gross" value={inr(gross, true)} />
        <Stat label="Net payable" value={inr(net, true)} />
        <Stat label="Deductions" value={inr(rows.reduce((a, r) => a + r.deductions + r.tds, 0), true)} />
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap gap-3 border-b px-5 py-4">
          <div className="min-w-[160px]"><Select value={month} onChange={setMonth} options={MONTHS} placeholder="Month" /></div>
          <div className="min-w-[120px]">
            <Select
              value={year}
              onChange={setYear}
              options={[0, 1, 2].map((i) => ({ value: String(dayjs().year() - i), label: String(dayjs().year() - i) }))}
              placeholder="Year"
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
                  {['Employee', 'Basic', 'HRA', 'Allowances', 'Deductions', 'TDS', 'Net pay', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3">
                      {p.employee.firstName} {p.employee.lastName}
                      <span className="muted block text-xs">{p.employee.designation}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.basic)}</td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.hra)}</td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.allowances)}</td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.deductions)}</td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.tds)}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{inr(p.netPay)}</td>
                    <td className="px-4 py-3"><Badge tone={toneForValue(p.status)}>{p.status.toLowerCase()}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {p.status === 'DRAFT' ? (
                          <button className="btn-ghost" onClick={async () => { await patch(`/hrms/payroll/${p.id}`, { status: 'APPROVED' }); await reload(); }}>Approve</button>
                        ) : null}
                        {p.status === 'APPROVED' ? (
                          <button className="btn-primary" onClick={async () => { await patch(`/hrms/payroll/${p.id}`, { status: 'PAID' }); await reload(); }}>Mark paid</button>
                        ) : null}
                      </div>
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
