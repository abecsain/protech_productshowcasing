'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProductCard, { ProductItem } from '@/components/ProductCard';
import PageContainer from '@/components/ui/PageContainer';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Card from '@/components/ui/Card';

export default function HomePage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [canSeePrices, setCanSeePrices] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasRestoredScrollRef = React.useRef(false);

  // Track scroll position on /home
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (window.scrollY > 0) {
          sessionStorage.setItem('pte_home_scrollY', String(Math.round(window.scrollY)));
        }
      }, 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      if (window.scrollY > 0) {
        sessionStorage.setItem('pte_home_scrollY', String(Math.round(window.scrollY)));
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restore scroll position once products load
  useEffect(() => {
    if (!loading && products.length > 0 && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      try {
        const savedYStr = sessionStorage.getItem('pte_home_scrollY');
        if (savedYStr) {
          const targetY = parseInt(savedYStr, 10);
          if (!isNaN(targetY) && targetY > 0) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.scrollTo({ top: targetY, behavior: 'instant' });
              });
            });
          }
        }
      } catch {}
    }
  }, [loading, products]);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch('/api/products?limit=12');
        if (res.ok) {
          const data = await res.json();
          setProducts((data.products || []).slice(0, 12));
          setCanSeePrices(Boolean(data.canSeePrices));
        }
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();

    // Live price update without refresh
    const handlePriceChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ canSeePrices: boolean }>;
      const newCanSeePrices = Boolean(customEvent.detail?.canSeePrices);
      setCanSeePrices(newCanSeePrices);
      if (!newCanSeePrices) {
        setProducts((prev) => prev.map((p) => ({ ...p, price: undefined })));
      } else {
        loadFeatured();
      }
    };

    window.addEventListener('price-visibility-changed', handlePriceChange);
    return () => window.removeEventListener('price-visibility-changed', handlePriceChange);
  }, []);

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
              <Link href="/products">
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
                className="text-[14px] font-medium text-[#1D4ED8] hover:underline"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-2 space-y-2">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                    <Skeleton className="w-3/4 h-3 rounded" />
                    <Skeleton className="w-1/2 h-3 rounded" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    canSeePrices={canSeePrices}
                    compact={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No featured products"
                description="Our product catalog is currently being updated. Please check back soon."
              />
            )}

            {/* Bottom Call to Action */}
            <div className="mt-10 text-center">
              <Link href="/products">
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
