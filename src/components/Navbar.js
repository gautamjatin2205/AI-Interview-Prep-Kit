'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LogIn, Plus, BookOpen, Sparkles } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.success && data.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Re-check auth on every route change (catches post-login navigation)
  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  // Listen for a custom 'auth-change' event so login/register pages
  // can instantly trigger a navbar refresh without waiting for navigation
  useEffect(() => {
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <header className="border-b border-white/[0.08] bg-[#070a12]/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-400 p-[1px] shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#090d16]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight group-hover:text-sky-300 transition-colors">
                Prep<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Kit</span>.ai
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                FS-AI-01
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Interview Studio</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {user && (
            <Link
              href="/dashboard"
              className={`text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                pathname === '/dashboard'
                  ? 'bg-white/[0.08] text-sky-400 border border-white/[0.08]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span className="hidden xs:inline">My Kits</span>
            </Link>
          )}

          {user && (
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-sky-600/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Kit</span>
            </Link>
          )}

          <div className="h-6 w-[1px] bg-white/[0.08] mx-1 hidden sm:block" />

          {/* User Auth Section — only render after hydration to avoid flicker */}
          {!hydrated ? (
            // Skeleton placeholder while fetching
            <div className="w-24 h-8 rounded-xl bg-white/[0.04] animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* Avatar + Name chip */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-200 bg-slate-900/80 border border-white/[0.08] px-3 py-1.5 rounded-xl shadow-inner">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shadow">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="max-w-[100px] truncate">{user.name}</span>
              </div>
              {/* Mobile: just avatar initial */}
              <div className="sm:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-400 hover:text-rose-400 p-2 sm:px-3 sm:py-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white px-3.5 py-2 rounded-xl transition-all border border-white/[0.1]"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
