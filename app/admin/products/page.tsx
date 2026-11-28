import React from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/security';
import { getAdminInitialProductsData } from '@/lib/admin-data';
import AdminProductsClient from '@/components/admin/AdminProductsClient';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const admin = await requireRole('admin');
  if (!admin) {
    redirect('/');
  }

  const data = await getAdminInitialProductsData();

  return (
    <AdminProductsClient
      initialProducts={data.products}
      initialTotal={data.total}
      initialCategories={data.categories}
      initialWhatsapp={data.whatsapp}
    />
  );
}
