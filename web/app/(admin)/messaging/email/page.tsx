'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Select, Spinner, toneForValue } from '@/components/ui';

type Log = { id: string; channel: string; to: string; subject?: string | null; status: string; error?: string | null; createdAt: string };
type Template = { id: string; name: string; subject: string; variables: string[] };

export function MessagingConsole({ channel }: { channel: 'EMAIL' | 'WHATSAPP' }) {
  const logs = useFetch<Log[]>(`/messaging/logs?channel=${channel}`);
  const templates = useFetch<{ data: Template[] }>('/messaging/templates?perPage=100');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (channel === 'EMAIL') {
        await api('/messaging/email', {
          method: 'POST',
          body: JSON.stringify(template ? { to, template, vars: {} } : { to, subject, html: body }),
        });
      } else {
        await api('/messaging/whatsapp', { method: 'POST', body: JSON.stringify({ to, body }) });
      }
      setStatus('Queued for delivery.');
      setBody('');
      await logs.reload();
    } catch (e) {
      setStatus((e as { message?: string }).message ?? 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title={channel === 'EMAIL' ? 'Email' : 'WhatsApp'}
        subtitle={
          channel === 'EMAIL'
            ? 'Send transactional email through the studio SMTP account and review delivery history.'
             : 'Send WhatsApp Cloud API messages to leads and candidates.'
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <p className="label">Compose</p>
          <label className="label mt-3" htmlFor="to">To</label>
          <input id="to" className="field" placeholder={channel === 'EMAIL' ? 'name@company.com' : '+9190000 00000'} value={to} onChange={(e) => setTo(e.target.value)} />

          {channel === 'EMAIL' ? (
            <>
              <label className="label mt-3">Template</label>
              <Select
                value={template}
                onChange={setTemplate}
                placeholder="No template — write manually"
                options={(templates.data?.data ?? []).map((t) => ({ value: t.name, label: `${t.name} — ${t.subject}` }))}
              />
              {!template ? (
                <>
                  <label className="label mt-3" htmlFor="subject">Subject</label>
                  <input id="subject" className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </>
              ) : null}
            </>
          ) : null}

          {!template ? (
            <>
              <label className="label mt-3" htmlFor="body">Message</label>
              <textarea id="body" className="field min-h-[160px]" value={body} onChange={(e) => setBody(e.target.value)} />
            </>
          ) : null}

          <button className="btn-primary mt-4 w-full" onClick={send} disabled={busy || !to}>
            {busy ? 'Sending…' : 'Send'}
          </button>
          {status ? <p className="muted mt-3 text-sm">{status}</p> : null}
        </Card>

        <Card className="p-0">
          <p className="label px-5 pt-5">Delivery log</p>
          {logs.loading ? (
            <div className="p-5"><Spinner /></div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {['To', 'Subject', 'Status', 'When'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(logs.data ?? []).map((l) => (
                    <tr key={l.id} className="table-row">
                      <td className="px-4 py-3">{l.to}</td>
                      <td className="px-4 py-3 muted">{l.subject ?? '—'}</td>
                      <td className="px-4 py-3"><Badge tone={toneForValue(l.status)}>{l.status.toLowerCase()}</Badge></td>
                      <td className="px-4 py-3 muted whitespace-nowrap">{dayjs(l.createdAt).format('DD MMM HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return <MessagingConsole channel="EMAIL" />;
}
