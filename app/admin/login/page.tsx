'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Button from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center px-4 pt-10 sm:pt-16 pb-16">
      <div className="text-center mb-6 w-full max-w-[400px]">
        <h1 className="text-[20px] font-bold text-[#1D4ED8] tracking-tight">
          Pro Tech Enterprises
        </h1>
        <p className="mt-1 text-[15px] text-slate-600">
          Administrator Control Panel
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <Card padding="md">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">Admin Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter authorized credentials to continue</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoComplete="username"
            />

            <PasswordInput
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                loadingText="Signing in..."
              >
                Sign In as Admin
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/auth"
              className="text-xs text-slate-500 hover:text-[#1D4ED8] hover:underline"
            >
              ← Back to Customer Portal
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
