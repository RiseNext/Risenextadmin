'use client';

import { useEffect, useState } from 'react';
import { api, patch } from '@/lib/api';
import { Card, SectionHeader, Spinner, Toggle } from '@/components/ui';
import { MediaPickerModal } from '@/components/MediaPicker';
import { mediaUrl } from '@/components/Uploader';

type Settings = {
  brandName: string; tagline: string; email: string; phone: string; address: string;
  socials: Record<string, string>; theme: Record<string, string>; maintenance: boolean;
  logoId?: string | null; logo?: { url: string } | null;
};

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<Settings>('/settings').then(setData);
  }, []);

  if (!data) return <Spinner label="Loading settings" />;

  const set = (patchObj: Partial<Settings>) => setData({ ...data, ...patchObj });

  const save = async () => {
    setSaving(true);
    try {
      const { brandName, tagline, email, phone, address, socials, theme, maintenance, logoId } = data;
      await patch('/settings', { brandName, tagline, email, phone, address, socials, theme, maintenance, logoId });
      setMsg('Settings saved.');
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Settings"
        subtitle="Brand identity, contact details, social links and site-wide switches."
        actions={<button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>}
      />

      {msg ? <p className="mb-4 rounded-xl border px-3.5 py-2.5 text-sm muted">{msg}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="label">Identity</p>
          <label className="label mt-3" htmlFor="brand">Brand name</label>
          <input id="brand" className="field" value={data.brandName} onChange={(e) => set({ brandName: e.target.value })} />
          <label className="label mt-3" htmlFor="tag">Tagline</label>
          <input id="tag" className="field" value={data.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          <label className="label mt-3">Logo</label>
          {data.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(data.logo.url)} alt="Logo" className="mb-2 h-12 w-auto" />
          ) : null}
          <button className="btn-ghost w-full" onClick={() => setPicker(true)}>Choose logo</button>
        </Card>

        <Card>
          <p className="label">Contact</p>
          <label className="label mt-3" htmlFor="em">Email</label>
          <input id="em" className="field" value={data.email} onChange={(e) => set({ email: e.target.value })} />
          <label className="label mt-3" htmlFor="ph">Phone</label>
          <input id="ph" className="field" value={data.phone} onChange={(e) => set({ phone: e.target.value })} />
          <label className="label mt-3" htmlFor="ad">Address</label>
          <textarea id="ad" className="field min-h-[80px]" value={data.address} onChange={(e) => set({ address: e.target.value })} />
        </Card>

        <Card>
          <p className="label">Social links</p>
          {['instagram', 'linkedin', 'youtube', 'x'].map((key) => (
            <div key={key} className="mt-3">
              <label className="label" htmlFor={key}>{key}</label>
              <input
                id={key}
                className="field"
                value={data.socials?.[key] ?? ''}
                onChange={(e) => set({ socials: { ...data.socials, [key]: e.target.value } })}
              />
            </div>
          ))}
        </Card>

        <Card>
          <p className="label">Brand colours</p>
          {['cream', 'ink', 'ember', 'moss'].map((key) => (
            <div key={key} className="mt-3 flex items-center gap-3">
              <input
                type="color"
                className="h-9 w-12 rounded-lg border"
                value={data.theme?.[key] ?? '#F5F2E8'}
                onChange={(e) => set({ theme: { ...data.theme, [key]: e.target.value } })}
                aria-label={key}
              />
              <span className="text-sm capitalize">{key}</span>
              <span className="muted ml-auto font-mono text-xs">{data.theme?.[key]}</span>
            </div>
          ))}
          <div className="mt-5 border-t pt-4">
            <Toggle checked={data.maintenance} onChange={(v) => set({ maintenance: v })} label="Maintenance mode on risenext.in" />
          </div>
        </Card>
      </div>

      <MediaPickerModal
        open={picker}
        onClose={() => setPicker(false)}
        accept="IMAGE,SVG"
        onPick={(item) => {
          set({ logoId: item.id, logo: { url: item.url } });
          setPicker(false);
        }}
      />
    </div>
  );
}
