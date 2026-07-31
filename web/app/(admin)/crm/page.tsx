'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { useFetch } from '@/lib/useCrud';
import { inr, num } from '@/lib/format';
import { Badge, Card, SectionHeader, Spinner, Stat, toneForValue } from '@/components/ui';
import { useSocketEvent } from '@/lib/socket';

type Pipeline = {
  leadsByStatus: { status: string; count: number }[];
  dealsByStage: { stage: string; count: number; value: number }[];
  pipelineValue: number;
  dealCount: number;
  recentLeads: { id: string; name: string; company?: string | null; status: string; budget?: number | null; createdAt: string }[];
};

const STAGES = ['discovery', 'proposal', 'negotiation', 'won', 'lost'];

export default function CrmPage() {
  const { data, loading, reload } = useFetch<Pipeline>('/crm/pipeline');
  useSocketEvent('lead:new', () => void reload());

  return (
    <div>
      <SectionHeader
        title="Pipeline"
        subtitle="Every enquiry from risenext.in, scored and staged."
        actions={<Link href="/crm/leads" className="btn-primary">Manage leads</Link>}
      />

      {loading || !data ? (
        <Spinner label="Loading pipeline" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Pipeline value" value={inr(data.pipelineValue, true)} hint={`${data.dealCount} deals`} />
            <Stat label="New leads" value={num(data.leadsByStatus.find((s) => s.status === 'NEW')?.count ?? 0, false)} />
            <Stat label="Qualified" value={num(data.leadsByStatus.find((s) => s.status === 'QUALIFIED')?.count ?? 0, false)} />
            <Stat label="Won" value={num(data.leadsByStatus.find((s) => s.status === 'WON')?.count ?? 0, false)} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {STAGES.map((stage) => {
              const row = data.dealsByStage.find((d) => d.stage === stage);
              return (
                <Card key={stage}>
                  <p className="label capitalize">{stage}</p>
                  <p className="font-display text-2xl">{row?.count ?? 0}</p>
                  <p className="muted mt-1 text-xs">{inr(row?.value ?? 0, true)}</p>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4 p-0">
            <p className="label px-5 pt-5">Latest enquiries</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {['Lead', 'Company', 'Budget', 'Status', 'Received'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentLeads.map((l) => (
                    <tr key={l.id} className="table-row">
                      <td className="px-4 py-3">{l.name}</td>
                      <td className="px-4 py-3">{l.company ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{l.budget ? inr(l.budget) : '—'}</td>
                      <td className="px-4 py-3"><Badge tone={toneForValue(l.status)}>{l.status.toLowerCase()}</Badge></td>
                      <td className="px-4 py-3 muted">{dayjs(l.createdAt).format('DD MMM, HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
