'use client';

import { Card, SectionHeader, Badge } from '@/components/ui';

const COLORS = [
  ['Cream', '#F5F2E8', 'Page surface'],
  ['Ink', '#14110C', 'Primary text & buttons'],
  ['Ember', '#C2571F', 'Accent, focus, alerts'],
  ['Moss', '#3F4A34', 'Secondary data series'],
  ['Night', '#0E0C09', 'Dark mode surface'],
];

export default function BrandPage() {
  return (
    <div>
      <SectionHeader title="Brand kit" subtitle="The Rise Next admin uses the same palette and type as risenext.in." />

      <Card>
        <p className="label">Palette</p>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-5">
          {COLORS.map(([name, hex, use]) => (
            <div key={name}>
              <div className="h-20 rounded-xl border" style={{ background: hex }} />
              <p className="mt-2 text-sm">{name}</p>
              <p className="muted font-mono text-xs">{hex}</p>
              <p className="muted mt-1 text-xs">{use}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="label">Typography</p>
        <p className="mt-3 font-display text-5xl">Instrument Serif — display</p>
        <p className="mt-2 text-lg">Inter Tight — interface and body copy</p>
        <p className="muted mt-2 text-sm">Numerals are tabular in tables and KPIs.</p>
      </Card>

      <Card className="mt-4">
        <p className="label">Components</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="btn-primary">Primary</button>
          <button className="btn-ember">Ember</button>
          <button className="btn-ghost">Ghost</button>
          <Badge tone="positive">published</Badge>
          <Badge tone="warn">review</Badge>
          <Badge tone="danger">lost</Badge>
          <Badge tone="info">draft</Badge>
        </div>
      </Card>
    </div>
  );
}
