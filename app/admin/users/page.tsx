import React from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/security';
import { getAdminInitialUsersData } from '@/lib/admin-data';
import AdminUsersClient from '@/components/admin/AdminUsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireRole('admin');
  if (!admin) {
    redirect('/');
  }

  const data = await getAdminInitialUsersData();

  return (
    <AdminUsersClient
      initialUsers={data.users}
      initialTotal={data.total}
    />
  );
}
