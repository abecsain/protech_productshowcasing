'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ShoppingCart, User as UserIcon, LogOut, Key, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCart } from './CartContext';
import { useSecurity } from './SecurityProvider';
import PageContainer from './ui/PageContainer';
import IconButton from './ui/IconButton';
import Button from './ui/Button';

const ChangePasswordModal = dynamic(() => import('./ChangePasswordModal'), { ssr: false });

interface UserInfo {
  id: number;
  name: string;
  mobile: string;
  role: string;
  canSeePrices: boolean;
  mustChange?: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalCount } = useCart();
  const { userInfo: user, refreshAuth } = useSecurity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user?.mustChange) {
      setShowPasswordModal(true);
    }
  }, [user?.mustChange]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await refreshAuth();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-state-changed'));
    }
    router.push('/auth');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-14">
        <PageContainer className="h-full flex items-center justify-between">
          {/* Left: Small Text Logo */}
          <Link
            href="/home"
            className="text-[17px] sm:text-[18px] font-bold text-[#1D4ED8] hover:text-[#1E40AF] transition-colors"
          >
            Protech Enterprises
          </Link>

          {/* Right (Laptop): Products & User Links */}
          <div className="hidden sm:flex items-center gap-6">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold bg-blue-50 text-[#1D4ED8] hover:bg-blue-100 border border-blue-200/80 transition-colors"
              >
                <Shield size={15} />
                <span>Admin Panel</span>
              </Link>
            )}

            <Link
              href="/products"
              className={`text-[15px] font-medium transition-colors ${
                pathname === '/products'
                  ? 'text-[#1D4ED8] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Products
            </Link>

            {/* Cart Link with Badge */}
            <Link
              href="/cart"
              className="relative p-2 text-slate-600 hover:text-[#1D4ED8] transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={20} strokeWidth={2} />
              {totalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </Link>

            {/* User Dropdown or Sign In Button */}
            {user ? (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  icon={<UserIcon size={16} />}
                  aria-expanded={userDropdownOpen}
                >
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </Button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-sm py-1.5 z-50"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{user.name}</p>
                        {user.role === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1D4ED8]">
                            Admin
                          </span>
                        )}
                      </div>
                      {user.firmName && (
                        <p className="text-[12px] text-[#1D4ED8] font-semibold truncate mt-0.5">{user.firmName}</p>
                      )}
                      {user.mobile ? (
                        <p className="text-[11px] text-slate-500 font-mono">{user.mobile}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400">Administrator</p>
                      )}
                    </div>

                    {user.role === 'admin' ? (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
                      >
                        <Shield size={16} className="text-[#1D4ED8]" />
                        <span>Admin Panel</span>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => setShowPasswordModal(true)}
                        className="justify-start px-3 py-2 text-[13px] text-slate-700"
                        icon={<Key size={16} className="text-slate-400" />}
                      >
                        Change Password
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={handleLogout}
                      className="justify-start px-3 py-2 text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50"
                      icon={<LogOut size={16} className="text-red-500" />}
                    >
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth">
                <Button variant="primary" size="sm" icon={<UserIcon size={15} />}>
                  Sign In / Register
                </Button>
              </Link>
            )}
          </div>

          {/* Right (Mobile): Sign In button (if not logged in) + Cart Icon + Hamburger */}
          <div className="flex sm:hidden items-center gap-1.5">
            {!user && (
              <Link href="/auth">
                <Button variant="primary" size="sm" className="h-8 px-2.5 text-xs font-semibold">
                  Sign In
                </Button>
              </Link>
            )}
            <Link
              href="/cart"
              className="relative text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={20} strokeWidth={2} />
              {totalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </Link>

            <IconButton
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
            </IconButton>
          </div>
        </PageContainer>

        {/* Mobile Full-Width Menu Dropdown with Backdrop */}
        {mobileMenuOpen && (
          <div className="sm:hidden">
            <div
              className="fixed inset-0 top-14 z-40 bg-slate-900/40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              id="customer-mobile-nav"
              className="fixed inset-x-0 top-14 z-50 bg-white border-b border-slate-200 px-4 py-3 space-y-2 shadow-xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
            >
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-[15px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200/80"
                >
                  <Shield size={18} />
                  <span>Admin Panel</span>
                </Link>
              )}

              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-[15px] font-medium ${
                  pathname === '/products' ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-800'
                }`}
              >
                Products
              </Link>

              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-[15px] font-medium text-slate-800"
              >
                <span>Shopping Cart</span>
                <span className="text-[12px] bg-[#1D4ED8] text-white px-2 py-0.5 rounded-full font-bold">
                  {totalCount}
                </span>
              </Link>

              {user ? (
                <div className="pt-2 border-t border-slate-100">
                  <div className="px-3 py-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[13px] font-bold text-slate-900">{user.name}</p>
                      {user.role === 'admin' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1D4ED8]">
                          Admin
                        </span>
                      )}
                    </div>
                    {user.firmName && (
                      <p className="text-[12px] text-[#1D4ED8] font-semibold truncate mt-0.5">{user.firmName}</p>
                    )}
                    {user.mobile ? (
                      <p className="text-[11px] text-slate-500 font-mono">{user.mobile}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Administrator</p>
                    )}
                  </div>

                  {user.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowPasswordModal(true);
                      }}
                      className="justify-start px-3 py-2.5 text-[14px] text-slate-700"
                      icon={<Key size={16} className="text-slate-400" />}
                    >
                      Change Password
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleLogout}
                    className="justify-start px-3 py-2.5 text-[14px] text-red-600 hover:text-red-700 hover:bg-red-50"
                    icon={<LogOut size={16} className="text-red-500" />}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" fullWidth size="md" icon={<UserIcon size={16} />}>
                      Sign In / Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          mustChange={Boolean(user?.mustChange)}
        />
      )}
    </>
  );
}
