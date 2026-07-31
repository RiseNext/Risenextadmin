'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { ArrowUpDown, Pencil, Plus, Search, Trash2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { useCrud, type Row } from '@/lib/useCrud';
import { useAuth } from '@/lib/auth';
import type { Resource } from '@/lib/resources';
import { inr, num } from '@/lib/format';
import { Badge, Card, Confirm, EmptyState, SectionHeader, Spinner, toneForValue } from './ui';
import { ResourceForm } from './ResourceForm';
import { mediaUrl } from './Uploader';

const pick = (row: Row, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], row);

function Cell({ value, type }: { value: unknown; type?: string }) {
  if (value === null || value === undefined || value === '') return <span className="muted">—</span>;
  switch (type) {
    case 'badge':
      return <Badge tone={toneForValue(String(value))}>{String(value).toLowerCase().replace(/_/g, ' ')}</Badge>;
    case 'currency':
      return <span className="tabular-nums">{inr(Number(value))}</span>;
    case 'number':
      return <span className="tabular-nums">{num(Number(value), false)}</span>;
    case 'date':
      return <span className="whitespace-nowrap">{dayjs(String(value)).format('DD MMM YYYY')}</span>;
    case 'boolean':
      return <Badge tone={value ? 'positive' : 'neutral'}>{value ? 'Yes' : 'No'}</Badge>;
    case 'media':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={mediaUrl(String(value))} alt="" className="h-9 w-14 rounded-md object-cover" />;
    default: {
      const text = String(value);
      return <span className="line-clamp-2 max-w-[34ch]">{text}</span>;
    }
  }
}

export function ResourcePage({ resource }: { resource: Resource }) {
  const crud = useCrud(resource.endpoint);
  const { can } = useAuth();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const writable = can(`${resource.permission}:write`);
  const deletable = can(`${resource.permission}:delete`);

  const sorted = useMemo(() => {
    if (!sort) return crud.rows;
    return [...crud.rows].sort((a, b) => {
      const av = pick(a, sort.key);
      const bv = pick(b, sort.key);
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [crud.rows, sort]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...crud.rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await crud.reorder(next.map((r, i) => ({ id: r.id, order: i })));
  };

  const exportCsv = () => {
    const cols = resource.columns.map((c) => c.key);
    const header = resource.columns.map((c) => c.label).join(',');
    const body = crud.rows
      .map((r) => cols.map((c) => `"${String(pick(r, c) ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${resource.key}-${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
  };

  return (
    <div>
      <SectionHeader
        title={resource.label}
        subtitle={resource.description}
        actions={
          <>
            <button className="btn-ghost" onClick={exportCsv}><Download size={14} /> Export CSV</button>
            {writable ? (
              <button className="btn-primary" onClick={() => setCreating(true)}>
                <Plus size={14} /> New {resource.singular.toLowerCase()}
              </button>
            ) : null}
          </>
        }
      />

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              className="field pl-9"
              placeholder={`Search ${resource.label.toLowerCase()}`}
              value={crud.query.q}
              onChange={(e) => crud.setQuery((q) => ({ ...q, q: e.target.value, page: 1 }))}
            />
          </div>
          <span className="muted text-xs">{crud.meta.total} records</span>
          {selected.length && deletable ? (
            <button
              className="btn-ghost text-red-600"
              onClick={async () => {
                await crud.removeMany(selected);
                setSelected([]);
              }}
            >
              <Trash2 size={14} /> Delete {selected.length}
            </button>
          ) : null}
        </div>

        {crud.loading ? (
          <div className="p-6"><Spinner label={`Loading ${resource.label.toLowerCase()}`} /></div>
        ) : crud.error ? (
          <div className="p-6 text-sm text-red-600">{crud.error}</div>
        ) : sorted.length === 0 ? (
          <EmptyState
            title={`No ${resource.label.toLowerCase()} yet`}
            hint={writable ? `Create your first ${resource.singular.toLowerCase()} to publish it on risenext.in.` : undefined}
            action={writable ? <button className="btn-primary mt-2" onClick={() => setCreating(true)}><Plus size={14} /> New</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {deletable ? (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === sorted.length && sorted.length > 0}
                        onChange={(e) => setSelected(e.target.checked ? sorted.map((r) => r.id) : [])}
                      />
                    </th>
                  ) : null}
                  {resource.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">
                      <button
                        className="inline-flex items-center gap-1.5"
                        onClick={() =>
                          setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))
                        }
                      >
                        {c.label} <ArrowUpDown size={11} className="opacity-50" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    className="table-row hover:bg-cream-200/40 dark:hover:bg-night-700/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.012, 0.2) }}
                  >
                    {deletable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={(e) =>
                            setSelected((prev) => (e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)))
                          }
                        />
                      </td>
                    ) : null}
                    {resource.columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle">
                        <Cell value={pick(row, c.key)} type={c.type} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {resource.reorderable && writable ? (
                          <>
                            <button className="btn-ghost h-8 w-8 !px-0" onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp size={14} /></button>
                            <button className="btn-ghost h-8 w-8 !px-0" onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown size={14} /></button>
                          </>
                        ) : null}
                        {writable ? (
                          <button className="btn-ghost h-8 w-8 !px-0" onClick={() => setEditing(row)} aria-label="Edit"><Pencil size={14} /></button>
                        ) : null}
                        {deletable ? (
                          <button className="btn-ghost h-8 w-8 !px-0 text-red-600" onClick={() => setConfirmId(row.id)} aria-label="Delete"><Trash2 size={14} /></button>
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {crud.meta.pages > 1 ? (
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="muted">Page {crud.meta.page} of {crud.meta.pages}</span>
            <div className="flex gap-2">
              <button className="btn-ghost" disabled={crud.meta.page <= 1} onClick={() => crud.setQuery((q) => ({ ...q, page: q.page - 1 }))}>Previous</button>
              <button className="btn-ghost" disabled={crud.meta.page >= crud.meta.pages} onClick={() => crud.setQuery((q) => ({ ...q, page: q.page + 1 }))}>Next</button>
            </div>
          </div>
        ) : null}
      </Card>

      <ResourceForm
        open={creating}
        onClose={() => setCreating(false)}
        title={`New ${resource.singular.toLowerCase()}`}
        fields={resource.fields}
        onSubmit={async (values) => { await crud.create(values); }}
      />

      <ResourceForm
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${resource.singular.toLowerCase()}`}
        fields={resource.fields}
        initial={editing}
        onSubmit={async (values) => { if (editing) await crud.update(editing.id, values); }}
      />

      <Confirm
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title={`Delete this ${resource.singular.toLowerCase()}?`}
        body="It will be removed from the admin and from risenext.in immediately."
        onConfirm={() => confirmId && crud.remove(confirmId)}
      />
    </div>
  );
}

export const clsxSafe = clsx;
