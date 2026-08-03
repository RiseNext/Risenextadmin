'use client';

import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { useFetch } from '@/lib/useCrud';
import { api } from '@/lib/api';
import { inr, num } from '@/lib/format';
import { Badge, Card, SectionHeader, Spinner, Stat, toneForValue } from '@/components/ui';

type Overview = {
  platform: string; campaigns: number; spend: number; clicks: number; impressions: number;
  leads: number; revenue: number; ctr: number; cpc: number; cpl: number; roas: number;
  series: { date: string; spend: number; clicks: number; leads: number }[];
};
type Campaign = {
  id: string; name: string; status: string; objective?: string | null;
  dailyBudget: number; spend: number; clicks: number; impressions: number; leads: number; revenue: number;
};

 function AdsDashboard({ platform }: { platform: 'META' | 'GOOGLE' }) {
  const { data, loading, reload } = useFetch<Overview>(`/ads/${platform}/overview`);
  const campaigns = useFetch<Campaign[]>(`/ads/${platform}/campaigns`);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api<{ synced: number; skipped?: boolean; reason?: string }>(`/ads/${platform}/sync`, { method: 'POST' });
      setNote(res.skipped ? `Sync skipped — ${res.reason}` : `Synced ${res.synced} campaigns`);
      await Promise.all([reload(), campaigns.reload()]);
    } catch (e) {
      setNote((e as { message?: string }).message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const label = platform === 'META' ? 'Meta Ads' : 'Google Ads';

  return (
    <div>
      <SectionHeader
        title={label}
        subtitle={`Spend, efficiency and campaign health for ${label}. Connect API credentials in the environment to pull live insights.`}
        actions={
          <button className="btn-primary" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        }
      />

      {note ? <p className="mb-4 rounded-xl border px-3.5 py-2.5 text-sm muted">{note}</p> : null}

      {loading || !data ? (
        <Spinner label={`Loading ${label}`} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Spend" value={inr(data.spend, true)} hint={`${data.campaigns} campaigns`} />
            <Stat label="Leads" value={num(data.leads, false)} hint={`CPL ${inr(data.cpl)}`} />
            <Stat label="CTR" value={`${data.ctr}%`} hint={`CPC ${inr(data.cpc)}`} />
            <Stat label="ROAS" value={`${data.roas}x`} hint={`Revenue ${inr(data.revenue, true)}`} />
          </div>

          <Card className="mt-4">
            <p className="label">Daily spend & leads</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series}>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(20,17,12,.12)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format('DD')} fontSize={11} stroke="currentColor" opacity={0.5} />
                  <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="spend" fill="#C2571F" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="leads" fill="#3F4A34" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mt-4 p-0">
            <p className="label px-5 pt-5">Campaigns</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {['Campaign', 'Status', 'Budget/day', 'Spend', 'Impressions', 'Clicks', 'Leads', 'CPL'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(campaigns.data ?? []).map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="px-4 py-3">
                        <span className="block">{c.name}</span>
                        <span className="muted text-xs">{c.objective}</span>
                      </td>
                      <td className="px-4 py-3"><Badge tone={toneForValue(c.status)}>{c.status.toLowerCase()}</Badge></td>
                      <td className="px-4 py-3 tabular-nums">{inr(c.dailyBudget)}</td>
                      <td className="px-4 py-3 tabular-nums">{inr(c.spend)}</td>
                      <td className="px-4 py-3 tabular-nums">{num(c.impressions)}</td>
                      <td className="px-4 py-3 tabular-nums">{num(c.clicks, false)}</td>
                      <td className="px-4 py-3 tabular-nums">{c.leads}</td>
                      <td className="px-4 py-3 tabular-nums">{c.leads ? inr(Math.round(c.spend / c.leads)) : '—'}</td>
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

export default function Page() {
  const params = useParams<{ platform: string }>();
  return <AdsDashboard platform={params.platform === 'google' ? 'GOOGLE' : 'META'} />;
}
