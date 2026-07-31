'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api, del, patch } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, Confirm, Modal, SectionHeader, Select, Spinner, Toggle } from '@/components/ui';
import { initials } from '@/lib/format';

type User = {
  id: string; name: string; email: string; role: string; active: boolean;
  permissions: string[]; lastLoginAt?: string | null; createdAt: string;
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'HR', 'MARKETING', 'SALES', 'EMPLOYEE', 'VIEWER'].map((r) => ({
  value: r,
  label: r.replace('_', ' ').toLowerCase(),
}));

export default function UsersPage() {
  const { data, loading, reload } = useFetch<User[]>('/users');
  const matrix = useFetch<Record<string, string[]>>('/users/roles');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setCreating(false);
      setForm({ name: '', email: '', password: '', role: 'VIEWER' });
      await reload();
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Could not create user');
    }
  };

  return (
    <div>
      <SectionHeader
        title="Users & roles"
        subtitle="Role-based access across every module. Super admins can grant extra resource:action permissions."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>New user</button>}
      />

      <Card className="p-0">
        {loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {['User', 'Role', 'Active', 'Last login', 'Extra permissions', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-[.12em] muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-ember text-xs text-cream">{initials(u.name)}</span>
                        <span>
                          {u.name}
                          <span className="muted block text-xs">{u.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <Select value={u.role} onChange={async (role) => { await patch(`/users/${u.id}`, { role }); await reload(); }} options={ROLES} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={u.active} onChange={async (active) => { await patch(`/users/${u.id}`, { active }); await reload(); }} />
                    </td>
                    <td className="px-4 py-3 muted">{u.lastLoginAt ? dayjs(u.lastLoginAt).format('DD MMM HH:mm') : 'never'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.permissions.length ? u.permissions.map((p) => <Badge key={p}>{p}</Badge>) : <span className="muted">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost text-red-600" onClick={() => setConfirmId(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <p className="label">Role matrix</p>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          {Object.entries(matrix.data ?? {}).map(([role, grants]) => (
            <div key={role} className="rounded-xl border p-3.5">
              <p className="text-sm font-medium capitalize">{role.replace('_', ' ').toLowerCase()}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {grants.map((g) => <Badge key={g}>{g}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New user"
        footer={
          <>
            {error ? <p className="mr-auto text-sm text-red-600">{error}</p> : null}
            <button className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}>Create</button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="n">Name</label>
            <input id="n" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="e">Email</label>
            <input id="e" className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="p">Temporary password</label>
            <input id="p" className="field" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <Select value={form.role} onChange={(role) => setForm({ ...form, role })} options={ROLES} />
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete this user?"
        body="Their sessions end immediately and audit history is retained."
        onConfirm={async () => { if (confirmId) { await del(`/users/${confirmId}`); await reload(); } }}
      />
    </div>
  );
}
