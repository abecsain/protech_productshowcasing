'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on route change and ensure clean top scroll
  useEffect(() => {
    setMobileMenuOpen(false);
    try {
      sessionStorage.removeItem('pte_admin_products_scrollY');
      sessionStorage.removeItem('pte_admin_users_scrollY');
    } catch {}
  }, [pathname]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  // Escape key listener
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // If on admin login page, display clean standalone page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    router.push('/admin/login');
    router.refresh();
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/products', label: 'Products', icon: Package },
  ];

  const isActive = (href: string, exact?: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col sm:flex-row">
      {/* Mobile Top Bar (height 56px) - Sticky with highest z-index */}
      <header className="sm:hidden sticky top-0 z-50 bg-white border-b border-slate-200 h-14 px-4 flex items-center justify-between">
        <Link href="/admin" className="text-[17px] font-bold text-[#1D4ED8]">
          Protech Admin
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/home"
            className="flex items-center gap-1 text-[12px] font-semibold text-[#1D4ED8] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200/80 transition-colors"
          >
            <Globe size={14} />
            <span>Website Home</span>
          </Link>
          <IconButton
            variant="ghost"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle admin navigation menu"
          >
            {mobileMenuOpen ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
          </IconButton>
        </div>
      </header>

      {/* Mobile Menu Dropdown with Backdrop - FIXED top-14 so it always shows even when scrolled down */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          {/* Backdrop: Clicking outside anywhere immediately closes menu */}
          <div
            className="fixed inset-0 top-14 z-40 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Drawer Container: Fixed right below header */}
          <div
            id="admin-mobile-nav"
            className="fixed inset-x-0 top-14 z-50 bg-white border-b border-slate-200 px-4 py-3 space-y-1 shadow-xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
          >
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Admin Navigation
              </span>
              <span className="text-[11px] text-slate-400">Control Panel</span>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold transition-colors ${
                    active ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold text-slate-800 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
              >
                <Globe size={20} className="shrink-0 text-[#1D4ED8]" />
                <span>Website Home</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="justify-start px-3.5 py-3 text-[15px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                icon={<LogOut size={20} className="shrink-0 text-red-500" />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Laptop Left Sidebar (width 220px) */}
      <aside className="hidden sm:flex flex-col w-[220px] shrink-0 min-h-screen bg-white border-r border-slate-200 p-4">
        {/* Top Brand */}
        <div className="pb-5 mb-4 border-b border-slate-100">
          <Link href="/admin" className="text-[18px] font-bold text-[#1D4ED8] block">
            Protech Admin
          </Link>
          <span className="text-[12px] text-slate-400">Control Panel</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-[#1D4ED8] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <Link
              href="/home"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
            >
              <Globe size={18} className="shrink-0 text-[#1D4ED8]" />
              <span>Website Home</span>
            </Link>
          </div>
        </nav>

        {/* Bottom Logout */}
        <div className="pt-4 border-t border-slate-100">
          <Button
            variant="ghost"
            fullWidth
            size="sm"
            onClick={handleLogout}
            className="justify-start px-3 py-2.5 text-[14px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
            icon={<LogOut size={18} className="shrink-0" />}
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
