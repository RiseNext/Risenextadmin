'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, del, patch, post } from './api';

export type Paged<T> = { data: T[]; meta: { page: number; perPage: number; total: number; pages: number } };
export type Row = Record<string, unknown> & { id: string };

export function useCrud<T extends Row>(endpoint: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<Paged<T>['meta']>({ page: 1, perPage: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState({ q: '', page: 1, perPage: 25, state: '', status: '', stage: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) params.set(k, String(v));
      });
      const res = await api<Paged<T> | T[]>(`${endpoint}?${params.toString()}`);
      if (Array.isArray(res)) {
        setRows(res);
        setMeta({ page: 1, perPage: res.length, total: res.length, pages: 1 });
      } else {
        setRows(res.data);
        setMeta(res.meta);
      }
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [endpoint, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (values: Record<string, unknown>) => {
    const row = await post<T>(endpoint, values);
    await load();
    return row;
  };

  const update = async (id: string, values: Record<string, unknown>) => {
    const row = await patch<T>(`${endpoint}/${id}`, values);
    await load();
    return row;
  };

  const remove = async (id: string) => {
    await del(`${endpoint}/${id}`);
    await load();
  };

  const removeMany = async (ids: string[]) => {
    await post(`${endpoint}/bulk-delete`, { ids });
    await load();
  };

  const reorder = async (items: { id: string; order: number }[]) => {
    await patch(`${endpoint}/reorder`, { items });
    await load();
  };

  return {
    rows, meta, loading, error, query, setQuery,
    reload: load, create, update, remove, removeMany, reorder,
  };
}

/** Fetch-once helper for read-only endpoints. */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
