'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, ArrowRight, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import Badge from '@/components/ui/Badge';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{ products: number; users: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to load dashboard stats', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Bar with Back Button & Security Status */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#1D4ED8] text-[13px] sm:text-[14px] font-semibold shadow-xs transition-colors"
          aria-label="Back to Store Catalog"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Back to Store</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" className="hidden xs:inline-flex items-center gap-1">
            <ShieldCheck size={12} strokeWidth={2.5} />
            <span>Admin Active</span>
          </Badge>
          <Link
            href="/products"
            className="text-[12px] sm:text-[13px] font-medium text-slate-500 hover:text-[#1D4ED8] inline-flex items-center gap-1 transition-colors"
          >
            <span>Live Catalog</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-[22px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
          Admin Dashboard
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 mt-1">
          Pro Tech Enterprises Administration Overview
        </p>
      </div>

      {/* 1. Stat Cards in Single Horizontal Line (Clickable links to respective dashboards) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Products Stat -> Links to /admin/products */}
        <Link
          href="/admin/products"
          className="group block relative overflow-hidden bg-white border border-slate-200 hover:border-[#1D4ED8] hover:shadow-md rounded-xl p-3.5 sm:p-5 shadow-xs transition-all cursor-pointer"
          aria-label="View Products Dashboard"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate group-hover:text-[#1D4ED8] transition-colors">
                Total Products
              </p>
              <div className="text-2xl sm:text-4xl font-extrabold text-[#1D4ED8] mt-1 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">
                {loading ? '...' : (stats?.products ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-blue-50 text-[#1D4ED8] group-hover:bg-[#1D4ED8] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Across 16 categories
            </p>
            <span className="text-[10px] sm:text-xs font-bold text-[#1D4ED8] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 shrink-0">
              <span>Open</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Total Users Stat -> Links to /admin/users */}
        <Link
          href="/admin/users"
          className="group block relative overflow-hidden bg-white border border-slate-200 hover:border-[#1D4ED8] hover:shadow-md rounded-xl p-3.5 sm:p-5 shadow-xs transition-all cursor-pointer"
          aria-label="View Users Dashboard"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate group-hover:text-[#1D4ED8] transition-colors">
                Total Users
              </p>
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 group-hover:text-[#1D4ED8] mt-1 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">
                {loading ? '...' : (stats?.users ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#1D4ED8] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Registered accounts
            </p>
            <span className="text-[10px] sm:text-xs font-bold text-[#1D4ED8] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 shrink-0">
              <span>Open</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Management Cards (Aligned vertically: Products below Products, Users below Users) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
        {/* Manage Products Card (Under Total Products) */}
        <Link
          href="/admin/products"
          className="group block bg-white border border-slate-200 hover:border-[#1D4ED8] hover:shadow-md rounded-xl p-3.5 sm:p-6 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1D4ED8] inline-flex items-center gap-0.5 sm:gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <h2 className="text-[15px] sm:text-lg font-bold text-slate-900 group-hover:text-[#1D4ED8] transition-colors leading-snug">
            Products
          </h2>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            Catalog inventory, images, categories & WhatsApp contact.
          </p>
        </Link>

        {/* Manage Users Card (Under Total Users) */}
        <Link
          href="/admin/users"
          className="group block bg-white border border-slate-200 hover:border-[#1D4ED8] hover:shadow-md rounded-xl p-3.5 sm:p-6 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1D4ED8] inline-flex items-center gap-0.5 sm:gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <h2 className="text-[15px] sm:text-lg font-bold text-slate-900 group-hover:text-[#1D4ED8] transition-colors leading-snug">
            Users
          </h2>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            Manage customer accounts, price switches & auto-off timers.
          </p>
        </Link>
      </div>
    </div>
  );
}
