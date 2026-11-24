import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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

      <main className="flex-1 py-6 sm:py-10">
        <PageContainer>
          {/* Header Section */}
          <Card padding="lg" className="mb-8">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
              Protech Enterprises
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

      <Footer className="mt-12" />
    </div>
  );
}
