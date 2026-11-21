'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/ui/PhoneInput';
import PasswordInput from '@/components/ui/PasswordInput';
import Button from '@/components/ui/Button';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password rules validation
  const ruleMinLength = password.length >= 8;
  const ruleLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
  const ruleNotMobile = mobile.length > 0 ? password !== mobile : true;
  const commonPasswords = ['password1', 'password123', 'qwerty123', 'welcome123', 'admin123', 'iloveyou1', 'abc12345', 'letmein123'];
  const ruleNotCommon = !commonPasswords.includes(password.toLowerCase());
  const strengthChecks = [ruleMinLength, /[A-Za-z]/.test(password), /\d/.test(password), ruleNotMobile, ruleNotCommon];
  const strength = strengthChecks.filter(Boolean).length;
  const strengthLabel = password.length === 0 ? '' : strength <= 2 ? 'Weak' : strength <= 4 ? 'Fair' : 'Strong';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid mobile or password');
      } else {
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!ruleMinLength || !ruleLetterAndNumber || !ruleNotMobile || !ruleNotCommon) {
      setError('Please meet all password requirements listed below');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mobile: cleanMobile,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col justify-between">
      <PageContainer className="flex flex-col items-center pt-8 sm:pt-20 pb-12">
        {/* Main Authentication Card */}
        <div className="w-full max-w-[400px]">
          <Card padding="lg" className="p-6">
            {/* 1. Brand Header */}
            <div className="text-center mb-4">
              <h1 className="text-[20px] font-bold text-[#1D4ED8] tracking-tight">
                Pro Tech Enterprises
              </h1>
              {/* 2. Subtitle */}
              <p className="mt-1 text-[14px] text-slate-600">
                Sign in to view our products.
              </p>
            </div>

            {/* 3. Segmented Tabs (Login | Register) */}
            <Tabs
              tabs={[
                { id: 'login', label: 'Login' },
                { id: 'register', label: 'Register' },
              ]}
              activeTab={tab}
              onChange={(id) => {
                setTab(id as 'login' | 'register');
                setError('');
              }}
              className="mb-6"
            />

            {/* General Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg"
              >
                {error}
              </div>
            )}

            {/* 4. LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <PhoneInput
                  label="Mobile number"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  autoComplete="tel"
                />

                <PasswordInput
                  label="Password"
                  required
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    loadingText="Please wait..."
                  >
                    Sign In
                  </Button>
                </div>
              </form>
            )}

            {/* 5. REGISTER FORM */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />

                <PhoneInput
                  label="Mobile number"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  autoComplete="tel"
                />

                <PasswordInput
                  label="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  autoComplete="new-password"
                />

                {password && (
                  <div className="-mt-2" aria-live="polite">
                    <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                      {strengthChecks.map((met, index) => (
                        <span
                          key={index}
                          className={`h-1.5 rounded-full ${
                            met
                              ? strength <= 2
                                ? 'bg-red-600'
                                : strength <= 4
                                ? 'bg-amber-500'
                                : 'bg-green-600'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[12px] text-slate-600">
                      Password strength: <span className="font-semibold">{strengthLabel}</span>
                    </p>
                  </div>
                )}

                <PasswordInput
                  label="Confirm password"
                  required
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />

                {/* Password Rules Checklist */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[13px] text-slate-600">
                  <p className="font-semibold text-slate-700 mb-1">
                    Password Requirements:
                  </p>
                  <div className="flex items-center gap-2">
                    {ruleMinLength ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={ruleMinLength ? 'text-slate-800' : ''}>
                      8+ characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ruleLetterAndNumber ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={ruleLetterAndNumber ? 'text-slate-800' : ''}>
                      A letter and a number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ruleNotMobile ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={ruleNotMobile ? 'text-slate-800' : ''}>
                      Must not match mobile number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ruleNotCommon ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={ruleNotCommon ? 'text-slate-800' : ''}>
                      Must not be a commonly used password
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    loadingText="Please wait..."
                  >
                    Create Account
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </PageContainer>

      {/* Small 13px muted text link in page footer: "Staff login" */}
      <footer className="py-6 text-center">
        <Link
          href="/admin/login"
          className="text-[13px] text-slate-500 hover:text-slate-700 transition-colors"
        >
          Staff login
        </Link>
      </footer>
    </div>
  );
}
