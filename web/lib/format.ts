export const inr = (n: number, compact = false) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n || 0);

export const num = (n: number, compact = true) =>
  new Intl.NumberFormat('en-IN', { notation: compact ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n || 0);

export const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`;

export const bytes = (b: number) => {
  if (!b) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
