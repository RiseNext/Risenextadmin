'use client';

import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card p-5 shadow-soft', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-tight md:text-[34px]">{title}</h1>
        {subtitle ? <p className="muted mt-1.5 max-w-2xl text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: 'border-[var(--border)] muted',
  positive: 'border-moss/30 bg-moss-100 text-moss dark:bg-moss/20 dark:text-moss-100',
  warn: 'border-ember/30 bg-ember-100 text-ember-600 dark:bg-ember/20 dark:text-ember-100',
  info: 'border-ink/15 bg-cream-200 text-ink dark:bg-night-700 dark:text-cream',
  danger: 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={clsx('chip', TONES[tone])}>{children}</span>;
}

export function toneForValue(value: string): keyof typeof TONES {
  const v = String(value).toUpperCase();
  if (['PUBLISHED', 'WON', 'APPROVED', 'PAID', 'HIRED', 'DONE', 'ACTIVE', 'PRESENT'].includes(v)) return 'positive';
  if (['DRAFT', 'PENDING', 'TODO', 'APPLIED', 'NEW', 'PAUSED'].includes(v)) return 'info';
  if (['REVIEW', 'DOING', 'PROPOSAL', 'INTERVIEW', 'SCREEN', 'NOTICE', 'WFH', 'HALF_DAY'].includes(v)) return 'warn';
  if (['LOST', 'REJECTED', 'ARCHIVED', 'ABSENT', 'EXITED', 'FAILED', 'URGENT'].includes(v)) return 'danger';
  return 'neutral';
}

export function Modal({
  open, onClose, title, children, footer, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={clsx('card my-auto w-full shadow-lift', wide ? 'max-w-4xl' : 'max-w-2xl')}
            initial={{ y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-display text-xl">{title}</h2>
              <button className="btn-ghost h-9 w-9 !px-0" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer ? <div className="flex justify-end gap-2 border-t px-6 py-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            className="surface absolute right-0 top-0 h-full w-full max-w-md border-l p-6 shadow-lift"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl">{title}</h2>
              <button className="btn-ghost h-9 w-9 !px-0" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </div>
            {children}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm muted">
      <Loader2 className="animate-spin" size={16} />
      {label ?? 'Loading'}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border bg-cream-200/60 dark:bg-night-700">✦</div>
      <p className="font-display text-lg">{title}</p>
      {hint ? <p className="muted max-w-sm text-sm">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Tabs({
  tabs, active, onChange,
}: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 border-b pb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-sm transition',
            active === t.key ? 'bg-ink text-cream dark:bg-cream dark:text-ink' : 'hover:bg-cream-200/70 dark:hover:bg-night-700'
          )}
        >
          {t.label}
          {typeof t.count === 'number' ? <span className="ml-1.5 opacity-60">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm"
      aria-pressed={checked}
    >
      <span className={clsx('relative h-6 w-11 rounded-full transition', checked ? 'bg-ember' : 'bg-cream-300 dark:bg-night-600')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

export function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; placeholder?: string }) {
  return (
    <div className="relative">
      <select className="field appearance-none pr-9" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder ?? 'All'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />
    </div>
  );
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="field flex flex-wrap items-center gap-1.5">
      {value.map((v, i) => (
        <span key={`${v}-${i}`} className="chip border-[var(--border)] bg-cream-200/70 dark:bg-night-700">
          {v}
          <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} aria-label={`Remove ${v}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent outline-none"
        value={draft}
        placeholder={placeholder ?? 'Type and press enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            e.preventDefault();
            onChange([...value, draft.trim()]);
            setDraft('');
          }
          if (e.key === 'Backspace' && !draft) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

export function Stat({
  label, value, delta, hint,
}: { label: string; value: string | number; delta?: number; hint?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <p className="label">{label}</p>
      <p className="font-display text-[28px] leading-none">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {typeof delta === 'number' ? (
          <span className={clsx('chip', delta >= 0 ? TONES.positive : TONES.danger)}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="muted">{hint}</span> : null}
      </div>
    </Card>
  );
}

export function Confirm({
  open, onClose, onConfirm, title, body,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-ember" onClick={() => { onConfirm(); onClose(); }}>Confirm</button>
        </>
      }
    >
      <p className="text-sm muted">{body ?? 'This action cannot be undone.'}</p>
    </Modal>
  );
}
