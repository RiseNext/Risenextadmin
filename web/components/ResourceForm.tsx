'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { slugify } from '@/lib/format';
import type { Field } from '@/lib/resources';
import { Modal, Select, TagInput, Toggle } from './ui';
import { MediaPickerModal } from './MediaPicker';
import { SelectedMediaChip, type MediaItem } from './Uploader';

type Values = Record<string, unknown>;

export function ResourceForm({
  open, onClose, onSubmit, fields, initial, title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Values) => Promise<void>;
  fields: Field[];
  initial?: Values | null;
  title: string;
}) {
  const [values, setValues] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<Field | null>(null);
  const [options, setOptions] = useState<Record<string, { label: string; value: string }[]>>({});
  const [mediaCache, setMediaCache] = useState<Record<string, MediaItem>>({});

  useEffect(() => {
    if (!open) return;
    const seed: Values = {};
    fields.forEach((f) => {
      const raw = initial?.[f.name];
      if (f.type === 'tags' || f.type === 'multiselect') seed[f.name] = Array.isArray(raw) ? raw : [];
      else if (f.type === 'boolean') seed[f.name] = Boolean(raw);
      else if (f.type === 'json') seed[f.name] = raw ? JSON.stringify(raw, null, 2) : '';
      else if (f.type === 'date' && raw) seed[f.name] = dayjs(raw as string).format('YYYY-MM-DD');
      else if (f.type === 'datetime' && raw) seed[f.name] = dayjs(raw as string).format('YYYY-MM-DDTHH:mm');
      else seed[f.name] = raw ?? (f.type === 'number' || f.type === 'currency' ? '' : '');
    });
    setValues(seed);
    setError(null);
  }, [open, initial, fields]);

  useEffect(() => {
    if (!open) return;
    fields
      .filter((f) => f.optionsFrom)
      .forEach(async (f) => {
        try {
          const res = await api<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>(
            `${f.optionsFrom}?perPage=200`
          );
          const list = Array.isArray(res) ? res : (res.data ?? []);
          setOptions((prev) => ({
            ...prev,
            [f.name]: list.map((r) => ({
              value: String(r.id),
              label: String(r[f.optionLabel ?? 'name'] ?? r.title ?? r.id),
            })),
          }));
        } catch {
          /* option source unavailable */
        }
      });
  }, [open, fields]);

  useEffect(() => {
    fields
      .filter((f) => f.type === 'media')
      .forEach(async (f) => {
        const id = values[f.name];
        if (!id || typeof id !== 'string' || mediaCache[id]) return;
        try {
          const items = await api<{ data: MediaItem[] }>('/media?perPage=120');
          const found = items.data.find((m) => m.id === id);
          if (found) setMediaCache((prev) => ({ ...prev, [id]: found }));
        } catch {
          /* ignore */
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, fields]);

  const set = (name: string, value: unknown) => setValues((prev) => ({ ...prev, [name]: value }));

  const grouped = useMemo(() => fields, [fields]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Values = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.type === 'number' || f.type === 'currency') payload[f.name] = v === '' || v === null ? null : Number(v);
        else if (f.type === 'json') payload[f.name] = v ? JSON.parse(String(v)) : null;
        else if (f.type === 'date' || f.type === 'datetime') payload[f.name] = v ? new Date(String(v)).toISOString() : null;
        else if (f.type === 'boolean') payload[f.name] = Boolean(v);
        else if (f.type === 'tags' || f.type === 'multiselect') payload[f.name] = v ?? [];
        else payload[f.name] = v === '' ? null : v;
        if (f.required && (payload[f.name] === null || payload[f.name] === undefined)) {
          throw new Error(`${f.label} is required`);
        }
      }
      await onSubmit(payload);
      onClose();
    } catch (e) {
      setError((e as Error).message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        wide
        footer={
          <>
            {error ? <p className="mr-auto text-sm text-red-600">{error}</p> : null}
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {grouped.map((f) => {
            const span = f.col === 2 ? 'md:col-span-2' : '';
            const v = values[f.name];
            return (
              <div key={f.name} className={span}>
                <label className="label" htmlFor={f.name}>
                  {f.label} {f.required ? <span className="text-ember">*</span> : null}
                </label>

                {f.type === 'textarea' ? (
                  <textarea id={f.name} className="field min-h-[96px]" value={String(v ?? '')} placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)} />
                ) : f.type === 'richtext' ? (
                  <textarea id={f.name} className="field min-h-[220px] font-mono text-[13px]" value={String(v ?? '')}
                    placeholder="Markdown or HTML" onChange={(e) => set(f.name, e.target.value)} />
                ) : f.type === 'json' ? (
                  <textarea id={f.name} className="field min-h-[160px] font-mono text-[13px]" value={String(v ?? '')}
                    onChange={(e) => set(f.name, e.target.value)} />
                ) : f.type === 'select' ? (
                  <Select
                    value={String(v ?? '')}
                    onChange={(val) => set(f.name, val)}
                    options={f.options ?? options[f.name] ?? []}
                    placeholder="Select"
                  />
                ) : f.type === 'boolean' ? (
                  <Toggle checked={Boolean(v)} onChange={(val) => set(f.name, val)} label={Boolean(v) ? 'Yes' : 'No'} />
                ) : f.type === 'tags' || f.type === 'multiselect' ? (
                  <TagInput value={(v as string[]) ?? []} onChange={(val) => set(f.name, val)} />
                ) : f.type === 'media' ? (
                  typeof v === 'string' && v && mediaCache[v] ? (
                    <SelectedMediaChip item={mediaCache[v]} onClear={() => set(f.name, null)} />
                  ) : (
                    <button type="button" className="btn-ghost w-full justify-start" onClick={() => setPickerFor(f)}>
                      {v ? 'Change media' : 'Choose or upload media'}
                    </button>
                  )
                ) : f.type === 'slug' ? (
                  <div className="flex gap-2">
                    <input id={f.name} className="field" value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
                    <button
                      type="button"
                      className="btn-ghost whitespace-nowrap"
                      onClick={() => set(f.name, slugify(String(values[f.from ?? 'title'] ?? '')))}
                    >
                      Generate
                    </button>
                  </div>
                ) : (
                  <input
                    id={f.name}
                    className="field"
                    type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : f.type === 'email' ? 'email' : 'text'}
                    value={String(v ?? '')}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}

                {f.help ? <p className="muted mt-1 text-xs">{f.help}</p> : null}
              </div>
            );
          })}
        </div>
      </Modal>

      <MediaPickerModal
        open={!!pickerFor}
        onClose={() => setPickerFor(null)}
        accept={pickerFor?.accept}
        onPick={(item) => {
          if (pickerFor) {
            set(pickerFor.name, item.id);
            setMediaCache((prev) => ({ ...prev, [item.id]: item }));
          }
          setPickerFor(null);
        }}
      />
    </>
  );
}
