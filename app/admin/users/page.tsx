'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MoreVertical, Key, Copy, Check, ArrowLeft, Clock, Trash2, AlertTriangle, Smartphone } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Switch from '@/components/ui/Switch';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface AdminUser {
  id: number;
  name: string;
  mobile: string;
  createdAt: string;
  priceVisible: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Clear any legacy scroll position so page always opens cleanly at top
  useEffect(() => {
    try {
      sessionStorage.removeItem('pte_admin_users_scrollY');
    } catch {}
  }, []);

  // Debounce search to prevent query spam and lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Active menu dropdown for "..." on each row
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Reset password modal state
  const [resetModal, setResetModal] = useState<{
    userName: string;
    mobile: string;
    tempPass: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete user modal state
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Auto-off timer selector modal
  const [timerModalUser, setTimerModalUser] = useState<AdminUser | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('never');
  const [customValue, setCustomValue] = useState<string>('2');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [customError, setCustomError] = useState<string>('');
  const [timerSubmitting, setTimerSubmitting] = useState<boolean>(false);
  const [modalOpenedAt, setModalOpenedAt] = useState<number>(0);

  const openTimerModal = useCallback((u: AdminUser) => {
    setTimerModalUser(u);
    setModalOpenedAt(Date.now());
    if (u.expiresAt && u.remainingMs && u.remainingMs > 0) {
      const remainingHours = Math.round((u.remainingMs / 3600000) * 10) / 10;
      const presetMatches = ['1', '6', '24'].find(
        (p) => Math.abs(Number(p) - remainingHours) < 0.2
      );
      if (presetMatches) {
        setSelectedPreset(presetMatches);
      } else {
        setSelectedPreset('custom');
        if (remainingHours >= 24) {
          setCustomValue(String(Math.round((remainingHours / 24) * 10) / 10));
          setCustomUnit('days');
        } else if (remainingHours < 1) {
          setCustomValue(String(Math.round(remainingHours * 60)));
          setCustomUnit('minutes');
        } else {
          setCustomValue(String(remainingHours));
          setCustomUnit('hours');
        }
      }
    } else {
      setSelectedPreset('never');
      setCustomValue('2');
      setCustomUnit('hours');
    }
    setCustomError('');
  }, []);

  const getComputedHours = (): number | null => {
    if (selectedPreset === 'never') return null;
    if (selectedPreset === 'custom') {
      const num = parseFloat(customValue);
      if (isNaN(num) || num <= 0) return null;
      if (customUnit === 'minutes') return Math.max(0.01, Math.round((num / 60) * 1000) / 1000);
      if (customUnit === 'days') return num * 24;
      return num;
    }
    return Number(selectedPreset);
  };

  const getExpiryPreviewText = (): string => {
    if (selectedPreset === 'never') {
      return 'Prices will stay visible permanently until manually switched off.';
    }
    const computed = getComputedHours();
    if (!computed || computed <= 0) {
      return 'Please enter a valid custom duration.';
    }
    const targetDate = new Date(modalOpenedAt + computed * 3600000);
    const dateStr = targetDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = targetDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let relativeStr = '';
    if (selectedPreset === 'custom') {
      relativeStr = `in ${customValue} ${customUnit}`;
    } else {
      const h = Number(selectedPreset);
      if (h < 24) relativeStr = `in ${h} ${h === 1 ? 'hour' : 'hours'}`;
      else relativeStr = `in ${Math.round(h / 24)} days`;
    }

    return `Price will automatically turn off on ${dateStr} at ${timeStr} (${relativeStr}).`;
  };

  const loadUsers = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Dismiss open action menu on ESC key
  useEffect(() => {
    if (!openMenuId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openMenuId]);

  const handleTogglePrice = async (user: AdminUser) => {
    if (!user.priceVisible) {
      // Opening price ON: open timer selector to configure duration
      openTimerModal(user);
      return;
    }

    // Instant Optimistic Toggle (0ms UI feedback, zero screen flash)
    const previousUsers = [...users];
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, priceVisible: false, expiresAt: null, remainingMs: null } : u
      )
    );

    try {
      const res = await fetch(`/api/admin/users/${user.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false, hours: null }),
      });
      if (res.ok) {
        showToast(`Price visibility turned OFF for ${user.name}`, 'info');
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('protech_live_sync');
            bc.postMessage({ type: 'PRICE_VISIBILITY_CHANGED', userId: user.id, enabled: false });
            bc.close();
          } catch {}
        }
      } else {
        setUsers(previousUsers);
        showToast('Failed to update price settings', 'error');
      }
    } catch (e) {
      setUsers(previousUsers);
      console.error('Failed to disable price', e);
      showToast('Failed to update price settings', 'error');
    }
  };

  const handleApplyTimer = async () => {
    if (!timerModalUser) return;

    if (selectedPreset === 'custom') {
      const num = parseFloat(customValue);
      if (isNaN(num) || num <= 0) {
        setCustomError('Please enter a duration greater than 0');
        return;
      }
      if (customUnit === 'days' && num > 365) {
        setCustomError('Maximum duration is 365 days');
        return;
      }
      if (customUnit === 'hours' && num > 8760) {
        setCustomError('Maximum duration is 8760 hours (1 year)');
        return;
      }
      if (customUnit === 'minutes' && num > 525600) {
        setCustomError('Maximum duration is 1 year');
        return;
      }
    }

    const hours = getComputedHours();
    setTimerSubmitting(true);
    setCustomError('');

    // Instant Optimistic Update (0ms UI feedback, zero screen flash)
    const previousUsers = [...users];
    const expiryDate = hours ? new Date(Date.now() + hours * 3600000).toISOString() : null;
    const remainingMs = hours ? hours * 3600000 : null;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === timerModalUser.id ? { ...u, priceVisible: true, expiresAt: expiryDate, remainingMs } : u
      )
    );
    const targetUser = timerModalUser;
    setTimerModalUser(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, hours }),
      });
      if (res.ok) {
        let durationLabel = 'Permanently';
        if (selectedPreset === 'custom') {
          durationLabel = `for ${customValue} ${customUnit}`;
        } else if (hours) {
          durationLabel = `for ${hours < 24 ? `${hours}h` : `${Math.round(hours / 24)} days`}`;
        }
        showToast(`Price visibility enabled ${durationLabel} for ${targetUser.name}`, 'success');
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('protech_live_sync');
            bc.postMessage({ type: 'PRICE_VISIBILITY_CHANGED', userId: targetUser.id, enabled: true });
            bc.close();
          } catch {}
        }
      } else {
        setUsers(previousUsers);
        const d = await res.json();
        showToast(d.error || 'Failed to apply price timer', 'error');
      }
    } catch (e) {
      setUsers(previousUsers);
      console.error('Failed to set price timer', e);
      showToast('Failed to apply price timer', 'error');
    } finally {
      setTimerSubmitting(false);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    setOpenMenuId(null);
    if (!confirm(`Generate temporary password for ${user.name} (${user.mobile})?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setCopied(false);
        setResetModal({
          userName: user.name,
          mobile: user.mobile,
          tempPass: data.temporaryPassword,
        });
      }
    } catch (e) {
      console.error('Failed to reset password', e);
      showToast('Failed to reset password', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    const target = deleteModalUser;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        setTotal((prev) => Math.max(0, prev - 1));
        showToast(`Customer "${target.name}" (${target.mobile}) deleted permanently`, 'success');
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('protech_live_sync');
            bc.postMessage({ type: 'USER_DELETED', userId: target.id });
            bc.close();
          } catch {}
        }
        setDeleteModalUser(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (e) {
      console.error('Failed to delete user', e);
      showToast('An error occurred while deleting user', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const formatExpiryNotice = (expiresAt: string | null, isVisible: boolean) => {
    if (!isVisible) return 'Price hidden';
    if (!expiresAt) return 'No auto-off';
    const date = new Date(expiresAt);
    return `Until ${date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })}, ${date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#1D4ED8] text-[13px] font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Registered Users ({total})
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Control price visibility, auto-off expiration, and credentials
            </p>
          </div>

          <div className="w-full sm:w-80">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search by name or mobile..."
            />
          </div>
        </div>
      </div>

      {/* Users Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No registered users found matching &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <>
            {/* MOBILE: Slim, Distinct & Bifurcated List View of Cards */}
            <div className="block sm:hidden p-3 bg-slate-100/80 space-y-2.5">
              {users.map((u) => {
                const regDate = new Date(u.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={u.id}
                    className={`bg-white rounded-xl border ${
                      u.priceVisible ? 'border-blue-200/90 shadow-2xs' : 'border-slate-200 shadow-2xs'
                    } p-3 transition-all`}
                  >
                    {/* Top Row: User Avatar, Name, Mobile, Reg Date, Menu */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* 2-letter Initials Avatar for instant customer identification */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none ${
                            u.priceVisible
                              ? 'bg-[#1D4ED8] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {getInitials(u.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="text-[14px] font-bold text-slate-900 truncate leading-snug">
                            {u.name}
                          </h2>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono leading-tight mt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Smartphone size={12} className="text-slate-400 shrink-0" />
                              <span>{u.mobile}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 font-sans">Reg: {regDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* "..." Menu Button for Reset Password & Delete with Click-Outside Backdrop */}
                      <div className="relative shrink-0">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === u.id ? null : u.id);
                          }}
                          aria-label="More options"
                          className="w-8 h-8 min-w-[32px] min-h-[32px] p-0 text-slate-400 hover:text-slate-800"
                        >
                          <MoreVertical size={16} strokeWidth={2.2} />
                        </IconButton>

                        {openMenuId === u.id && (
                          <>
                            {/* Backdrop: Clicking outside anywhere immediately closes menu */}
                            <div
                              className="fixed inset-0 z-30 bg-transparent cursor-default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                              }}
                              aria-hidden="true"
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 divide-y divide-slate-100">
                              <div className="py-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  fullWidth
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleResetPassword(u);
                                  }}
                                  className="justify-start px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#1D4ED8] hover:bg-blue-50"
                                  icon={<Key size={14} className="text-slate-400" />}
                                >
                                  Reset Password
                                </Button>
                              </div>
                              <div className="py-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  fullWidth
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteModalUser(u);
                                  }}
                                  className="justify-start px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                                  icon={<Trash2 size={14} className="text-red-500" />}
                                >
                                  Delete User
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Slim Controls Strip: Switch + Auto-off Timer Pill */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2">
                      <Switch
                        checked={u.priceVisible}
                        onChange={() => handleTogglePrice(u)}
                        label={u.priceVisible ? 'Price ON' : 'Price OFF'}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTimerModal(u)}
                        className={`text-[11.5px] px-2.5 py-0.5 h-7 min-h-[28px] rounded-lg border font-medium truncate max-w-[190px] flex items-center gap-1.5 ${
                          u.priceVisible
                            ? 'bg-blue-50 text-[#1D4ED8] border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        icon={<Clock size={12} className={u.priceVisible ? 'text-[#1D4ED8]' : 'text-slate-400'} />}
                      >
                        <span className="truncate">{formatExpiryNotice(u.expiresAt, u.priceVisible)}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LAPTOP: Clean Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3">Registration</th>
                    <th className="px-5 py-3">Price Visibility</th>
                    <th className="px-5 py-3">Auto-Off Timer</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const regDate = new Date(u.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900">{u.name}</td>
                        <td className="px-5 py-4 font-mono text-slate-700">{u.mobile}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{regDate}</td>
                        <td className="px-5 py-4">
                          <Switch
                            checked={u.priceVisible}
                            onChange={() => handleTogglePrice(u)}
                            label={u.priceVisible ? 'ON' : 'OFF'}
                          />
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTimerModal(u)}
                            className="text-[#1D4ED8] hover:text-[#1E40AF] px-2 h-8 min-h-[32px] justify-start text-[13px]"
                          >
                            {formatExpiryNotice(u.expiresAt, u.priceVisible)}
                          </Button>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResetPassword(u)}
                              icon={<Key size={14} />}
                            >
                              Reset Password
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteModalUser(u)}
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete user ${u.name}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {Math.ceil(total / 20) > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / 20)}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>

      {/* Auto-off Timer Modal (Never / 1h / 6h / 24h / 3 days / 7 days / Custom) */}
      {timerModalUser && (
        <Modal
          isOpen={Boolean(timerModalUser)}
          onClose={() => setTimerModalUser(null)}
          title="Price Visibility & Auto-Off Timer"
          description={`Configure price visibility for ${timerModalUser.name} (${timerModalUser.mobile})`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <Select
              label="Auto-off Duration"
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                setCustomError('');
              }}
              options={[
                { value: 'never', label: 'Never (No auto-off)' },
                { value: '1', label: '1 Hour' },
                { value: '6', label: '6 Hours' },
                { value: '24', label: '24 Hours (1 Day)' },
                { value: 'custom', label: 'Custom Timeout...' },
              ]}
            />

            {/* Custom Duration Fields - Visible when 'custom' is selected */}
            {selectedPreset === 'custom' && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    Set Custom Timeout
                  </span>
                  <span className="text-[11px] text-blue-700">
                    e.g. 45 Minutes or 5 Days
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Input
                      label="Duration"
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={customValue}
                      onChange={(e) => {
                        setCustomValue(e.target.value);
                        setCustomError('');
                      }}
                      placeholder="e.g. 12"
                      className="h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Select
                      label="Unit"
                      value={customUnit}
                      onChange={(e) => {
                        setCustomUnit(e.target.value as 'minutes' | 'hours' | 'days');
                        setCustomError('');
                      }}
                      options={[
                        { value: 'minutes', label: 'Minutes' },
                        { value: 'hours', label: 'Hours' },
                        { value: 'days', label: 'Days' },
                      ]}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                {customError && (
                  <p className="text-xs text-red-600 font-medium">{customError}</p>
                )}
              </div>
            )}

            {/* Live Visibility Schedule Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <Clock size={16} className="text-[#1D4ED8] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Visibility Schedule
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-relaxed">
                  {getExpiryPreviewText()}
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setTimerModalUser(null)}
                disabled={timerSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleApplyTimer}
                loading={timerSubmitting}
                loadingText="Saving..."
              >
                Save & Enable Price
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Temporary Password Reset Modal */}
      {resetModal && (
        <Modal
          isOpen={Boolean(resetModal)}
          onClose={() => setResetModal(null)}
          title="Temporary Password Generated"
          description={`Share this one-time code with ${resetModal.userName} (${resetModal.mobile}).`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-center">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg select-all">
              <span className="font-mono text-lg font-bold text-[#1D4ED8] tracking-wider block">
                {resetModal.tempPass}
              </span>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => copyToClipboard(resetModal.tempPass)}
              icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied to Clipboard' : 'Copy Password'}
            </Button>

            <p className="text-xs text-slate-500 leading-relaxed">
              The user will be required to change this password immediately upon their next login.
            </p>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setResetModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalUser && (
        <Modal
          isOpen={Boolean(deleteModalUser)}
          onClose={() => {
            if (!deletingUser) setDeleteModalUser(null);
          }}
          title="Delete Customer Account"
          description="Are you sure you want to permanently delete this customer account?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <span className="text-sm font-bold text-red-900">Warning: Permanent Action</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                Deleting this customer immediately terminates all active sessions, revokes wholesale price permissions, and permanently deletes their profile.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-semibold text-slate-900">{deleteModalUser.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono font-semibold text-slate-800">📱 {deleteModalUser.mobile}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Registered:</span>
                <span className="text-slate-700">
                  {new Date(deleteModalUser.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingUser}
                onClick={() => setDeleteModalUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deletingUser}
                loadingText="Deleting..."
                icon={<Trash2 size={14} />}
                onClick={handleDeleteUser}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
