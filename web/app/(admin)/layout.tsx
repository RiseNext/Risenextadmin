'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, Moon, Sun, Search, LogOut, X, Wifi, WifiOff } from 'lucide-react';
import { NAV } from '@/lib/resources';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api, patch } from '@/lib/api';
import { getSocket, useSocketEvent } from '@/lib/socket';
import { initials } from '@/lib/format';
import { Spinner } from '@/components/ui';

type Notice = { id: string; title: string; body?: string | null; href?: string | null; read: boolean; createdAt: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showNotices, setShowNotices] = useState(false);
  const [online, setOnline] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (socket) {
      const onConnect = () => setOnline(true);
      const onDisconnect = () => setOnline(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      setOnline(socket.connected);
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void api<Notice[]>('/notifications').then(setNotices).catch(() => null);
  }, [user]);

  useSocketEvent<Notice>('notification:new', (n) => setNotices((prev) => [n, ...prev]));
  useSocketEvent<{ name?: string }>('lead:new', (lead) =>
    setNotices((prev) => [
      { id: `lead-${Date.now()}`, title: 'New lead received', body: lead?.name ?? '', href: '/crm/leads', read: false, createdAt: new Date().toISOString() },
      ...prev,
    ])
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Opening the studio" />
      </div>
    );
  }

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || can(i.permission)),
  })).filter((g) => g.items.length);

  const unread = notices.filter((n) => !n.read).length;
  const allItems = groups.flatMap((g) => g.items);
  const matches = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems.slice(0, 8);

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
        ) : null}
      </AnimatePresence>

      <aside
        className={clsx(
          'surface fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-cream dark:bg-cream dark:text-ink">✦</span>
            <span>
              <span className="block font-display text-lg leading-none">Rise Next</span>
              <span className="muted text-[10px] uppercase tracking-[.22em]">Admin</span>
            </span>
          </Link>
          <button className="btn-ghost h-8 w-8 !px-0 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={15} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="label px-2.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition',
                          active
                            ? 'bg-ink text-cream dark:bg-cream dark:text-ink'
                            : 'hover:bg-cream-200/70 dark:hover:bg-night-700'
                        )}
                      >
                        <item.icon size={15} className={active ? '' : 'opacity-70'} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ember text-xs text-cream">{initials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{user.name}</p>
              <p className="muted truncate text-xs">{user.role.replace('_', ' ').toLowerCase()}</p>
            </div>
            <button className="btn-ghost h-8 w-8 !px-0" onClick={() => logout()} aria-label="Sign out"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="surface sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 md:px-6">
          <button className="btn-ghost h-9 w-9 !px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={16} /></button>

          <button className="btn-ghost hidden min-w-[240px] justify-start gap-2 md:flex" onClick={() => setPalette(true)}>
            <Search size={14} /> <span className="muted">Jump to…</span>
            <span className="muted ml-auto text-[10px]">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className={clsx('chip hidden sm:inline-flex', online ? 'border-moss/30 text-moss' : 'muted')}>
              {online ? <Wifi size={12} /> : <WifiOff size={12} />} {online ? 'Live' : 'Offline'}
            </span>
            <button className="btn-ghost h-9 w-9 !px-0" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="relative">
              <button className="btn-ghost relative h-9 w-9 !px-0" onClick={() => setShowNotices((s) => !s)} aria-label="Notifications">
                <Bell size={15} />
                {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ember" /> : null}
              </button>
              <AnimatePresence>
                {showNotices ? (
                  <motion.div
                    className="card absolute right-0 mt-2 w-[320px] p-0 shadow-lift"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <p className="text-sm font-medium">Notifications</p>
                      <button
                        className="muted text-xs"
                        onClick={async () => {
                          await api('/notifications/read-all', { method: 'POST' }).catch(() => null);
                          setNotices((prev) => prev.map((n) => ({ ...n, read: true })));
                        }}
                      >
                        Mark all read
                      </button>
                    </div>
                    <ul className="max-h-[360px] overflow-y-auto">
                      {notices.length === 0 ? (
                        <li className="muted px-4 py-6 text-sm">Nothing new.</li>
                      ) : (
                        notices.slice(0, 20).map((n) => (
                          <li key={n.id} className="border-b last:border-0">
                            <Link
                              href={n.href ?? '#'}
                              className={clsx('block px-4 py-3 text-sm hover:bg-cream-200/50 dark:hover:bg-night-700', !n.read && 'bg-ember-100/40 dark:bg-ember/10')}
                              onClick={async () => {
                                setShowNotices(false);
                                if (!n.read && !n.id.startsWith('lead-')) {
                                  await patch(`/notifications/${n.id}/read`, {}).catch(() => null);
                                }
                              }}
                            >
                              <p className="font-medium">{n.title}</p>
                              {n.body ? <p className="muted mt-0.5 text-xs">{n.body}</p> : null}
                            </Link>
                          </li>
                        ))
                      )}
                    </ul>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* command palette */}
      <AnimatePresence>
        {palette ? (
          <motion.div className="fixed inset-0 z-50 bg-ink/40 p-4 backdrop-blur-sm md:pt-[14vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPalette(false)}>
            <motion.div
              className="card mx-auto w-full max-w-lg p-0 shadow-lift"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                className="w-full bg-transparent px-5 py-4 text-sm outline-none"
                placeholder="Search modules…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="max-h-[50vh] overflow-y-auto border-t">
                {matches.map((m) => (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      className="flex items-center gap-2.5 px-5 py-3 text-sm hover:bg-cream-200/60 dark:hover:bg-night-700"
                      onClick={() => { setPalette(false); setQuery(''); }}
                    >
                      <m.icon size={15} className="opacity-70" /> {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
