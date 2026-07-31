'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Phase = 'lobby' | 'security' | 'doors' | 'login' | 'reception' | 'boot';

const LINES = [
  'Good to see you. Welcome to Rise Next.',
  'One moment — opening the studio doors.',
];

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockFor, setLockFor] = useState(0);
  const [busy, setBusy] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user && phase === 'lobby') setPhase('reception');
  }, [user, phase]);

  useEffect(() => {
    if (lockFor <= 0) return;
    timer.current = setInterval(() => setLockFor((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [lockFor]);

  const enter = () => {
    setPhase('security');
    setTimeout(() => setPhase('doors'), 2400);
    setTimeout(() => setPhase('login'), 3900);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockFor > 0 || busy) return;
    setBusy(true);
    setError(null);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      setPhase('reception');
      setTimeout(() => setPhase('boot'), 2200);
      setTimeout(() => router.push('/dashboard'), 3200);
      return;
    }
    setError(res.message);
    setAttempts(res.attempts ?? attempts + 1);
    if (res.lockedFor) setLockFor(res.lockedFor);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-cream">
      {/* lobby scene */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: phase === 'lobby' ? 1 : phase === 'security' ? 1.08 : 1.24,
          filter: phase === 'login' ? 'blur(14px) brightness(.55)' : 'blur(0px) brightness(1)',
        }}
        transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#3a3226_0%,#14110c_55%,#0a0806_100%)]" />
        {/* ceiling light bars */}
        <div className="absolute inset-x-0 top-0 flex justify-center gap-24 pt-10 opacity-70">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-40 rounded-full bg-cream/70 blur-[2px]"
              animate={{ opacity: [0.35, 0.9, 0.5] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        {/* reception desk silhouette */}
        <div className="absolute bottom-0 left-1/2 h-[34vh] w-[72vw] -translate-x-1/2 rounded-t-[64px] bg-gradient-to-b from-[#241f18] to-[#100d09] shadow-[0_-40px_120px_rgba(0,0,0,.7)]" />
        <div className="absolute bottom-[34vh] left-1/2 -translate-x-1/2 font-display text-[13vw] leading-none tracking-tight text-cream/[.06]">
          RISE NEXT
        </div>
        <div className="grain absolute inset-0" />
      </motion.div>

      {/* glass doors */}
      <div className="pointer-events-none absolute inset-0 flex">
        <motion.div
          className="glass h-full w-1/2 border-r border-white/20"
          animate={{ x: phase === 'doors' || phase === 'login' || phase === 'reception' || phase === 'boot' ? '-102%' : '0%' }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute right-6 top-1/2 h-24 w-1.5 -translate-y-1/2 rounded-full bg-cream/50" />
        </motion.div>
        <motion.div
          className="glass h-full w-1/2 border-l border-white/20"
          animate={{ x: phase === 'doors' || phase === 'login' || phase === 'reception' || phase === 'boot' ? '102%' : '0%' }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute left-6 top-1/2 h-24 w-1.5 -translate-y-1/2 rounded-full bg-cream/50" />
        </motion.div>
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-6">
        <AnimatePresence mode="wait">
          {phase === 'lobby' ? (
            <motion.div key="lobby" className="text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="mb-3 text-[11px] uppercase tracking-[.4em] text-cream/60">Rise Next · Hyderabad</p>
              <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">The studio is open.</h1>
              <p className="mx-auto mt-4 max-w-md text-sm text-cream/70">
                This is the private entrance to the Rise Next command centre.
              </p>
              <button className="btn mt-8 bg-cream px-6 py-3 text-ink hover:bg-ember hover:text-cream" onClick={enter}>
                Enter the studio
              </button>
            </motion.div>
          ) : null}

          {phase === 'security' ? (
            <motion.div key="security" className="flex max-w-lg items-start gap-4 rounded-3xl border border-white/15 bg-black/30 p-6 backdrop-blur" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ember/90 text-cream">
                <ShieldAlert size={20} />
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-ember" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[.3em] text-cream/50">Security</p>
                {LINES.map((line, i) => (
                  <motion.p key={line} className="mt-2 text-lg leading-snug" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.9 }}>
                    {line}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          ) : null}

          {phase === 'login' ? (
            <motion.form
              key="login"
              onSubmit={submit}
              className="w-full max-w-md rounded-[28px] border border-white/15 bg-white/[.07] p-8 shadow-glass backdrop-blur-2xl"
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            >
              <p className="text-[11px] uppercase tracking-[.34em] text-cream/50">Rise Next admin</p>
              <h1 className="mt-2 font-display text-3xl">Sign in</h1>
              <p className="mt-1.5 text-sm text-cream/60">Use your studio credentials.</p>

              <label className="mt-6 block text-xs uppercase tracking-[.14em] text-cream/50" htmlFor="email">Email</label>
              <div className="relative mt-1.5">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/50" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/25 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-cream/35 focus:border-ember"
                  placeholder="admin@risenext.in"
                />
              </div>

              <label className="mt-4 block text-xs uppercase tracking-[.14em] text-cream/50" htmlFor="password">Password</label>
              <div className="relative mt-1.5">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/50" />
                <input
                  id="password"
                  type={reveal ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/25 py-3 pl-10 pr-11 text-sm outline-none placeholder:text-cream/35 focus:border-ember"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50" onClick={() => setReveal((r) => !r)} aria-label="Toggle password">
                  {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
                    {error}
                    {attempts ? <span className="ml-1 opacity-70">({attempts}/5 attempts)</span> : null}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button
                type="submit"
                disabled={busy || lockFor > 0}
                className="mt-6 w-full rounded-full bg-cream py-3 text-sm font-medium text-ink transition hover:bg-ember hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lockFor > 0 ? `Locked — retry in ${lockFor}s` : busy ? 'Verifying…' : 'Sign in'}
              </button>

              <p className="mt-4 text-center text-[11px] text-cream/40">
                Five failed attempts disables sign-in for 15 seconds.
              </p>
            </motion.form>
          ) : null}

          {phase === 'reception' || phase === 'boot' ? (
            <motion.div key="reception" className="text-center" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <motion.div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ember text-cream"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✦
              </motion.div>
              <p className="mt-6 text-xs uppercase tracking-[.34em] text-cream/50">Reception</p>
              <h1 className="mt-2 font-display text-4xl">
                {phase === 'boot' ? 'Loading your dashboard' : `Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}.`}
              </h1>
              <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-cream/15">
                <motion.div className="h-full bg-ember" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3 }} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
