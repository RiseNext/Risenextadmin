'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFetch } from '@/lib/useCrud';
import { num, pct } from '@/lib/format';
import { Card, SectionHeader, Spinner, Stat, Tabs } from '@/components/ui';

type Analytics = {
  sessions: number; users: number; pageviews: number; bounceRate: number; avgDuration: number;
  series: { date: string; sessions: number; users: number; pageviews: number }[];
  topPages: { path: string; views: number }[];
  channels: Record<string, number>;
};

export default function AnalyticsPage() {
  const [days, setDays] = useState('30');
  const { data, loading } = useFetch<Analytics>(`/analytics/overview?days=${days}`, [days]);

  return (
    <div>
      <SectionHeader title="Analytics" subtitle="Traffic, engagement and channel mix for risenext.in." />
      <Tabs
        tabs={[{ key: '7', label: '7 days' }, { key: '30', label: '30 days' }, { key: '60', label: '60 days' }]}
        active={days}
        onChange={setDays}
      />

      {loading || !data ? (
        <Spinner label="Loading analytics" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Sessions" value={num(data.sessions)} />
            <Stat label="Users" value={num(data.users)} />
            <Stat label="Pageviews" value={num(data.pageviews)} />
            <Stat label="Bounce rate" value={pct(data.bounceRate)} />
            <Stat label="Avg. duration" value={`${Math.round(data.avgDuration)}s`} />
          </div>

          <Card className="mt-4">
            <p className="label">Sessions & users</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series}>
                  <defs>
                    <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3F4A34" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3F4A34" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(20,17,12,.12)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format('DD MMM')} fontSize={11} stroke="currentColor" opacity={0.5} />
                  <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="sessions" stroke="#3F4A34" strokeWidth={2} fill="url(#a)" />
                  <Area type="monotone" dataKey="pageviews" stroke="#C2571F" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <p className="label">Top pages</p>
              <ul className="divide-y text-sm">
                {(data.topPages ?? []).map((p) => (
                  <li key={p.path} className="flex items-center justify-between py-2.5">
                    <span className="font-mono text-xs">{p.path}</span>
                    <span className="tabular-nums">{num(p.views, false)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="label">Channels</p>
              <ul className="space-y-3 text-sm">
                {Object.entries(data.channels ?? {}).map(([channel, value]) => {
                  const total = Object.values(data.channels).reduce((a, b) => a + b, 0) || 1;
                  return (
                    <li key={channel}>
                      <div className="mb-1 flex justify-between">
                        <span className="capitalize">{channel}</span>
                        <span className="muted tabular-nums">{num(value, false)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-night-600">
                        <div className="h-full rounded-full bg-ember" style={{ width: `${(value / total) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
