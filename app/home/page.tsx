import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PageContainer from '@/components/ui/PageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import HomeFeaturedGrid from '@/components/HomeFeaturedGrid';
import { getCachedFeaturedProducts } from '@/lib/catalog';

export const revalidate = 600; // Cache page for 10 minutes (revalidated on admin mutation)

export default async function HomePage() {
  const featuredProducts = await getCachedFeaturedProducts();

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main
        className="flex-1 py-6 sm:py-10 ss-protected-content select-none-secure"
        data-ss-protect="true"
      >
        <PageContainer>
          {/* Header Section */}
          <Card padding="lg" className="mb-8">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
              Pro Tech Enterprises
            </h1>
            <p className="mt-2 text-[15px] sm:text-[16px] text-slate-600">
              Your Trusted Technology Partner – Quality Hardware, Networking & Accessories.
            </p>
            <div className="mt-5">
              <Link href="/products" prefetch={true}>
                <Button variant="primary" size="md">
                  View All Products
                </Button>
              </Link>
            </div>
          </Card>

          {/* Featured Products Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight">
                Featured Products
              </h2>
              <Link
                href="/products"
                prefetch={true}
                className="text-[14px] font-medium text-[#1D4ED8] hover:underline"
              >
                View all →
              </Link>
            </div>

            <HomeFeaturedGrid initialProducts={featuredProducts} />

            {/* Bottom Call to Action */}
            <div className="mt-10 text-center">
              <Link href="/products" prefetch={true}>
                <Button variant="secondary" size="md">
                  Browse Full Catalog
                </Button>
              </Link>
            </div>
          </section>
        </PageContainer>
      </main>

      {/* Clean Business Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-[13px] text-slate-500">
        <PageContainer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="font-semibold text-slate-800">Pro Tech Enterprises</span>
          <p>© {new Date().getFullYear()} Pro Tech Enterprises. All rights reserved.</p>
        </PageContainer>
      </footer>
    </div>
  );
}
