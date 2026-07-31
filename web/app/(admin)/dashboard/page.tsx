'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { useFetch } from '@/lib/useCrud';
import { useAuth } from '@/lib/auth';
import { inr, num } from '@/lib/format';
import { Card, SectionHeader, Spinner, Stat, Badge, toneForValue } from '@/components/ui';
import { useSocketEvent } from '@/lib/socket';

type Dash = {
  kpis: Record<string, number>;
  leadsByStatus: { status: string; count: number }[];
  leadTrend: { date: string; count: number }[];
  trafficTrend: { date: string; sessions: number; users: number; pageviews: number }[];
  activity: { id: string; action: string; resource: string; at: string; by: string }[];
};

const PIE = ['#C2571F', '#3F4A34', '#DE7A44', '#5C6A4C', '#14110C', '#A49A86'];

export default function DashboardPage() {
  const { data, loading, reload } = useFetch<Dash>('/dashboard');
  const { user } = useAuth();
  useSocketEvent('lead:new', () => void reload());

  if (loading || !data) {
    return (
      <div className="py-20">
        <Spinner label="Assembling your dashboard" />
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div>
      <SectionHeader
        title={`Good ${dayjs().hour() < 12 ? 'morning' : dayjs().hour() < 17 ? 'afternoon' : 'evening'}, ${user?.name.split(' ')[0]}`}
        subtitle="Everything happening across risenext.in — website, pipeline, media spend and people."
        actions={
          <>
            <Link href="/crm/leads" className="btn-ghost">Open pipeline <ArrowUpRight size={14} /></Link>
            <Link href="/cms/heroes" className="btn-primary">Edit website</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Leads this week" value={num(k.leadsWeek, false)} hint={`${num(k.leadsTotal, false)} all time`} />
        <Stat label="Win rate" value={`${k.winRate}%`} hint="closed / total leads" />
        <Stat label="Pipeline value" value={inr(k.pipelineValue, true)} hint={`${k.openTasks} open tasks`} />
        <Stat label="Ad spend" value={inr(k.adSpend, true)} hint={`CPL ${inr(k.cpl)} · ROAS ${k.roas}x`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="label">Website traffic</p>
              <p className="font-display text-xl">Last 30 days</p>
            </div>
            <Link href="/analytics" className="btn-ghost">Details</Link>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trafficTrend}>
                <defs>
                  <linearGradient id="sessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C2571F" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#C2571F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(20,17,12,.12)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format('DD MMM')} fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,17,12,.12)', fontSize: 12 }} />
                <Area type="monotone" dataKey="sessions" stroke="#C2571F" strokeWidth={2} fill="url(#sessions)" />
                <Area type="monotone" dataKey="users" stroke="#3F4A34" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="label">Leads by status</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.leadsByStatus} dataKey="count" nameKey="status" innerRadius={54} outerRadius={84} paddingAngle={3}>
                  {data.leadsByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {data.leadsByStatus.map((s, i) => (
              <li key={s.status} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                {s.status.toLowerCase()} <span className="muted">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <p className="label">New leads per day</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadTrend}>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(20,17,12,.12)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format('DD')} fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#14110C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="label">Recent activity</p>
          <ul className="mt-1 divide-y">
            {data.activity.map((a, i) => (
              <motion.li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <span className="min-w-0">
                  <span className="block truncate">{a.by}</span>
                  <span className="muted text-xs">{a.action} · {a.resource}</span>
                </span>
                <span className="muted whitespace-nowrap text-xs">{dayjs(a.at).format('DD MMM HH:mm')}</span>
              </motion.li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Live projects" value={num(k.liveProjects, false)} />
        <Stat label="Published posts" value={num(k.publishedPosts, false)} />
        <Stat label="Active employees" value={num(k.activeEmployees, false)} hint={`${k.pendingLeaves} leave requests pending`} />
        <Stat label="Applications" value={num(k.applicationsThisMonth, false)} hint="this month" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={toneForValue(k.unhandledContacts ? 'PENDING' : 'DONE')}>
            {k.unhandledContacts} unhandled contact forms
          </Badge>
          <Badge tone={toneForValue(k.pendingLeaves ? 'PENDING' : 'DONE')}>{k.pendingLeaves} leave approvals</Badge>
          <Badge tone="info">{k.unreadNotifications} unread notifications</Badge>
          <Link href="/reports" className="btn-ghost ml-auto">Monthly report</Link>
        </div>
      </Card>
    </div>
  );
}
