'use client';

// OLD CODE:
// import { useAuth } from '@/context/AuthContext';
// import Link from 'next/link';
// import { Activity, LogOut, LayoutDashboard, MonitorPlay, Shield } from 'lucide-react';

// NEW CODE:
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Activity, LogOut, LayoutDashboard, MonitorPlay, Shield, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  // OLD CODE:
  // const { user, logout } = useAuth();
  //
  // if (!user) return null;

  // NEW CODE:
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkTheme = document.documentElement.classList.contains('dark') || 
                          localStorage.getItem('haqms_theme') === 'dark';
      setIsDark(isDarkTheme);
      if (isDarkTheme) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('haqms_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('haqms_theme', 'light');
    }
  };

  if (!user) return null;

  return (
    <nav className="glass sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-extrabold text-2xl tracking-tight">
          <Activity className="h-6 w-6 animate-pulse" />
          <span>HAQMS</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/queue"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <MonitorPlay className="h-4 w-4" />
            Live Queue
          </Link>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Shield className="h-3 w-3" />
              {user.role}
            </span>
          </div>

          {/* OLD CODE: (No theme toggle button) */}
          {/* NEW CODE: Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500 hover:text-white transition-all duration-300 focus:outline-none"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 focus:outline-none"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
