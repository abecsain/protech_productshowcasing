'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import { usePrices } from '@/lib/usePrices';
import type { CatalogProduct } from '@/lib/catalog';

interface HomeFeaturedGridProps {
  initialProducts: CatalogProduct[];
}

export default function HomeFeaturedGrid({ initialProducts }: HomeFeaturedGridProps) {
  const hasRestoredScrollRef = useRef(false);
  const productIds = useMemo(() => initialProducts.map((p) => p.id), [initialProducts]);
  const { prices, canSeePrices } = usePrices(productIds);

  // Restore scroll position
  useEffect(() => {
    if (initialProducts.length > 0 && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      try {
        const savedYStr = sessionStorage.getItem('pte_home_scrollY');
        if (savedYStr) {
          const targetY = parseInt(savedYStr, 10);
          if (!isNaN(targetY) && targetY > 0) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: targetY, behavior: 'instant' });
            });
          }
        }
      } catch {}
    }
  }, [initialProducts]);

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

  if (initialProducts.length === 0) {
    return (
      <p className="text-center py-8 text-slate-500 text-sm">
        Our product catalog is currently being updated. Please check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
      {initialProducts.map((p, idx) => {
        const price = canSeePrices && prices[p.id] !== undefined ? prices[p.id] : undefined;
        return (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              categoryId: p.categoryId,
              image: p.image,
              imageCount: p.imageCount,
              price,
            }}
            canSeePrices={canSeePrices}
            compact={true}
            priority={idx < 2}
          />
        );
      })}
    </div>
  );
}
