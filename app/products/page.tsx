import React from 'react';
import Navbar from '@/components/Navbar';
import PageContainer from '@/components/ui/PageContainer';
import ProductsCatalogView from '@/components/ProductsCatalogView';
import { getCachedCategories, getCachedProductsPage } from '@/lib/catalog';

export const revalidate = 600; // Cache page for 10 minutes (revalidated on admin mutation)

interface ProductsPageProps {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const categoryId = resolvedParams.category ? Number(resolvedParams.category) : null;
  const page = resolvedParams.page ? Number(resolvedParams.page) : 1;
  const q = resolvedParams.q ? String(resolvedParams.q) : '';

  const [categories, data] = await Promise.all([
    getCachedCategories(),
    getCachedProductsPage({
      page,
      limit: 24,
      category: categoryId,
      q,
    }),
  ]);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <ProductsCatalogView
        initialCategories={categories}
        initialProducts={data.products}
        initialTotal={data.total}
        initialPage={data.page}
        initialCategory={categoryId}
        initialQuery={q}
      />

      {/* Clean Business Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-[13px] text-slate-500">
        <PageContainer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="font-semibold text-slate-800">Pro Tech Enterprises</span>
          <p>© {new Date().getFullYear()} Pro Tech Enterprises. All rights reserved.</p>
        </PageContainer>
      </footer>
    </div>
  );
}
