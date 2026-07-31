'use client';

import { API_URL, tokens } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { inr, num, pct } from '@/lib/format';
import { Card, SectionHeader, Spinner, Stat } from '@/components/ui';

type Summary = {
  leadsThisMonth: number; wonThisMonth: number; conversionRate: number; revenue: number;
  adSpend: number; publishedPosts: number; activeEmployees: number; presentDays: number; applications: number;
};

const EXPORTS = ['leads', 'deals', 'employees', 'payslips', 'applications', 'contacts'];

export default function ReportsPage() {
  const { data, loading } = useFetch<Summary>('/reports/summary');

  const download = async (entity: string) => {
    const res = await fetch(`${API_URL}/api/reports/export/${entity}`, {
      headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : undefined,
      credentials: 'include',
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${entity}.csv`;
    a.click();
  };

  return (
    <div>
      <SectionHeader title="Reports" subtitle="Month-to-date performance across growth, delivery and people — with CSV exports." />

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Leads this month" value={num(data.leadsThisMonth, false)} />
            <Stat label="Won" value={num(data.wonThisMonth, false)} hint={pct(data.conversionRate)} />
            <Stat label="Closed revenue" value={inr(data.revenue, true)} />
            <Stat label="Ad spend" value={inr(data.adSpend, true)} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Published posts" value={num(data.publishedPosts, false)} />
            <Stat label="Active employees" value={num(data.activeEmployees, false)} />
            <Stat label="Present days" value={num(data.presentDays, false)} hint="this month" />
            <Stat label="Applications" value={num(data.applications, false)} />
          </div>

          <Card className="mt-4">
            <p className="label">Exports</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPORTS.map((e) => (
                <button key={e} className="btn-ghost capitalize" onClick={() => download(e)}>
                  {e}.csv
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
