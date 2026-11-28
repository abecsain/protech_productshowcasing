'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Search, Folder, Layers, ChevronRight, ChevronDown, Check } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import SearchBar from '@/components/ui/SearchBar';
import Input from '@/components/ui/Input';
import CategoryChips, { Category } from '@/components/CategoryChips';
import Pagination from '@/components/ui/Pagination';
import PageContainer from '@/components/ui/PageContainer';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useCart } from '@/components/CartContext';
import { usePrices } from '@/lib/usePrices';
import { getCategoryAncestors } from '@/lib/categories';
import type { CatalogProduct, CatalogCategory } from '@/lib/catalog';

interface ProductsCatalogViewProps {
  initialCategories: CatalogCategory[];
  initialProducts: CatalogProduct[];
  initialTotal: number;
  initialPage: number;
  initialCategory: number | null;
  initialQuery: string;
}

export default function ProductsCatalogView({
  initialCategories,
  initialProducts,
  initialTotal,
  initialPage,
  initialCategory,
  initialQuery,
}: ProductsCatalogViewProps) {
  const pathname = usePathname();
  const { totalCount } = useCart();
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
  }, [initialProducts, initialTotal]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(initialQuery);
  const [page, setPage] = useState<number>(initialPage);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState<boolean>(false);

  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { prices, canSeePrices } = usePrices(productIds);

  const isFirstUrlSyncRef = useRef(true);
  const lastLoadedKeyRef = useRef(
    `${initialPage}|${initialCategory ?? ''}|${initialQuery.trim()}`
  );
  const hasRestoredScrollRef = useRef(false);
  const isRestoringScrollRef = useRef(false);

  // Sync state to URL & sessionStorage
  useEffect(() => {
    if (isFirstUrlSyncRef.current) {
      isFirstUrlSyncRef.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', String(selectedCategory));
    if (debouncedSearchQuery.trim()) params.set('q', debouncedSearchQuery.trim());
    if (page > 1) params.set('page', String(page));

    const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
    try {
      window.history.replaceState(window.history.state, '', newQuery);
    } catch {}

    try {
      sessionStorage.setItem(
        'pte_products_filter',
        JSON.stringify({
          category: selectedCategory,
          query: debouncedSearchQuery,
          page,
        })
      );
    } catch {}
  }, [selectedCategory, debouncedSearchQuery, page]);

  // Track and save scroll position continuously
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (isRestoringScrollRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!isRestoringScrollRef.current && window.scrollY > 0) {
          sessionStorage.setItem('pte_products_scrollY', String(Math.round(window.scrollY)));
        }
      }, 80);
    };

    const handleBeforeUnload = () => {
      if (!isRestoringScrollRef.current && window.scrollY > 0) {
        sessionStorage.setItem('pte_products_scrollY', String(Math.round(window.scrollY)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeout);
      if (!isRestoringScrollRef.current && window.scrollY > 0) {
        sessionStorage.setItem('pte_products_scrollY', String(Math.round(window.scrollY)));
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Debounce customer search (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerExpandedIds, setDrawerExpandedIds] = useState<Set<number>>(new Set());
  const isDrawerPoppedRef = useRef(false);

  const toggleDrawerExpand = (id: number) => {
    setDrawerExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Category Drawer browser Back button integration
  useEffect(() => {
    if (!categoryDrawerOpen) return;

    isDrawerPoppedRef.current = false;
    const drawerId = `drawer_${Date.now()}`;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), drawerActive: true, drawerId },
        ''
      );
    } catch {}

    const handlePopState = () => {
      isDrawerPoppedRef.current = true;
      setCategoryDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!isDrawerPoppedRef.current && window.history.state?.drawerId === drawerId) {
        window.history.back();
      }
    };
  }, [categoryDrawerOpen]);

  // Lock scroll when left slide drawer is open
  useEffect(() => {
    if (categoryDrawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [categoryDrawerOpen]);

  // ESC key listener for drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoryDrawerOpen(false);
      }
    };
    if (categoryDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [categoryDrawerOpen]);

  // Fetch products on client filter/pagination changes
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '24',
      });
      if (debouncedSearchQuery.trim()) {
        params.set('q', debouncedSearchQuery.trim());
      }
      if (selectedCategory) {
        params.set('category', String(selectedCategory));
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchQuery, selectedCategory]);

  useEffect(() => {
    // Skip when state still matches SSR initial data (works in Strict Mode too)
    const currentKey = `${page}|${selectedCategory ?? ''}|${debouncedSearchQuery.trim()}`;
    if (lastLoadedKeyRef.current === currentKey) {
      return;
    }
    lastLoadedKeyRef.current = currentKey;
    loadProducts();
  }, [loadProducts, page, selectedCategory, debouncedSearchQuery]);

  // Restore scroll position
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout | null = null;
    const restoreScroll = () => {
      try {
        const savedYStr = sessionStorage.getItem('pte_products_scrollY');
        if (!savedYStr) return;
        const targetY = parseInt(savedYStr, 10);
        if (isNaN(targetY) || targetY <= 0) return;

        isRestoringScrollRef.current = true;
        if (scrollInterval) clearInterval(scrollInterval);

        let attempts = 0;
        scrollInterval = setInterval(() => {
          attempts++;
          window.scrollTo({ top: targetY, behavior: 'instant' });
          if (Math.abs(window.scrollY - targetY) < 15 || attempts > 25) {
            if (scrollInterval) clearInterval(scrollInterval);
            setTimeout(() => {
              isRestoringScrollRef.current = false;
            }, 100);
          }
        }, 30);
      } catch {}
    };

    if (pathname === '/products' && !loading && products.length > 0) {
      restoreScroll();
    }

    const handlePopState = () => {
      restoreScroll();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, loading, products]);

  const handleCategorySelect = (catId: number | null) => {
    setSelectedCategory(catId);
    setPage(1);
    hasRestoredScrollRef.current = true;
    try {
      sessionStorage.removeItem('pte_products_scrollY');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    hasRestoredScrollRef.current = true;
    try {
      sessionStorage.removeItem('pte_products_scrollY');
    } catch {}
  };

  const totalPages = Math.ceil(total / 24);

  const isDrawerSearching = drawerSearch.trim().length > 0;
  const filteredDrawerCategories = useMemo(() => {
    const q = drawerSearch.toLowerCase().trim();
    if (q) {
      return categories.filter(
        (cat) => cat.name.toLowerCase().includes(q) || cat.fullPath.toLowerCase().includes(q)
      );
    }
    return categories.filter((cat) => {
      if (cat.level === 1) return true;
      if (cat.level === 2) return cat.parentId !== null && drawerExpandedIds.has(cat.parentId);
      if (cat.level === 3) {
        const parent = categories.find((p) => p.id === cat.parentId);
        return Boolean(
          parent &&
            parent.parentId !== null &&
            drawerExpandedIds.has(parent.parentId) &&
            drawerExpandedIds.has(parent.id)
        );
      }
      return false;
    });
  }, [categories, drawerSearch, drawerExpandedIds]);

  const activeBreadcrumbs = selectedCategory
    ? getCategoryAncestors(categories, selectedCategory)
    : [];

  return (
    <>
      {/* Sticky Search & Category Header */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <PageContainer>
          <div className="w-full">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search products by name..."
            />
          </div>

          {/* Category Bar with Three-Line Menu Drawer Trigger & Horizontal Chips (Mobile & Tablet) */}
          <div className="mt-2.5 flex items-center gap-2 lg:hidden">
            <CategoryChips
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
              layout="chips"
              onOpenDrawer={() => setCategoryDrawerOpen(true)}
            />
          </div>
        </PageContainer>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 py-6 sm:py-8 pb-28 sm:pb-12">
        <PageContainer>
          <div className="flex gap-8 items-start">
            {/* Left Sidebar Category List (Laptop only) */}
            <aside className="hidden lg:block w-64 shrink-0 sticky top-[128px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <CategoryChips
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
                layout="sidebar"
              />
            </aside>

            {/* Right Product Grid Area */}
            <div className="flex-1 min-w-0">
              {/* Category Title / Breadcrumb & Item Count Bar */}
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {activeBreadcrumbs.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap text-sm sm:text-base font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(null)}
                        className="text-slate-500 hover:text-[#1D4ED8] font-medium text-xs sm:text-sm"
                      >
                        All
                      </button>
                      {activeBreadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id}>
                          <span className="text-slate-300 text-xs">/</span>
                          <button
                            type="button"
                            onClick={() => handleCategorySelect(crumb.id)}
                            className={`truncate max-w-[160px] sm:max-w-none ${
                              idx === activeBreadcrumbs.length - 1
                                ? 'text-slate-900 font-bold'
                                : 'text-slate-600 hover:text-[#1D4ED8] font-medium text-xs sm:text-sm'
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {debouncedSearchQuery
                        ? `Results for "${debouncedSearchQuery}"`
                        : 'All Products'}
                    </h1>
                  )}
                  <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {total} items
                  </span>
                </div>

                {/* Clear Filter button if filtered */}
                {(selectedCategory !== null || debouncedSearchQuery.trim() !== '') && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setPage(1);
                    }}
                    className="text-xs text-[#1D4ED8] hover:underline font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Product Grid State */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3"
                    >
                      <Skeleton className="w-full aspect-square rounded-xl" />
                      <Skeleton className="w-3/4 h-4 rounded" />
                      <Skeleton className="w-1/2 h-3 rounded" />
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {products.map((p, idx) => {
                      const price =
                        canSeePrices && prices[p.id] !== undefined ? prices[p.id] : undefined;
                      return (
                        <ProductCard
                          key={p.id}
                          product={{
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            category: p.category,
                            categoryId: p.categoryId,
                            categoryPath: p.categoryPath,
                            image: p.image,
                            imageCount: p.imageCount,
                            price,
                          }}
                          canSeePrices={canSeePrices}
                          priority={idx < 2}
                        />
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={(newPage) => {
                          setPage(newPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="No products found"
                  description={
                    debouncedSearchQuery || selectedCategory
                      ? 'No products match your search or filter. Try clearing filters.'
                      : 'No products are currently available in the catalog.'
                  }
                  actionLabel={selectedCategory !== null || debouncedSearchQuery ? 'Show all products' : undefined}
                  onAction={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setPage(1);
                  }}
                />
              )}
            </div>
          </div>
        </PageContainer>
      </main>

      {/* Slide-out Category Drawer (Left Side on Mobile) */}
      {categoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setCategoryDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Layers size={18} className="text-[#1D4ED8]" />
                <span>Categories</span>
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setCategoryDrawerOpen(false)}
                aria-label="Close categories"
              >
                <X size={18} />
              </IconButton>
            </div>

            {/* In-drawer Search Filter */}
            <div className="p-3 border-b border-slate-100">
              <Input
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                placeholder="Find category..."
                icon={<Search size={14} className="text-slate-400" />}
                className="text-xs h-8"
              />
            </div>

            {/* Category Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => {
                  handleCategorySelect(null);
                  setCategoryDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-50 text-[#1D4ED8] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder size={15} />
                  <span>All Products</span>
                </div>
                {selectedCategory === null && <Check size={14} className="text-[#1D4ED8]" />}
              </button>

              {filteredDrawerCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const catHasChildren =
                  !isDrawerSearching &&
                  cat.level < 3 &&
                  categories.some((c) => c.parentId === cat.id);
                const isExpanded = drawerExpandedIds.has(cat.id);

                return (
                  <div
                    key={cat.id}
                    className={`w-full flex items-center gap-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      cat.level === 2 ? 'pl-6 pr-3' : cat.level === 3 ? 'pl-10 pr-3' : 'px-3'
                    } ${
                      isSelected
                        ? 'bg-blue-50 text-[#1D4ED8] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {catHasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDrawerExpand(cat.id);
                        }}
                        aria-label={isExpanded ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-blue-50 text-[#1D4ED8] border-blue-300'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} strokeWidth={2.5} />
                        ) : (
                          <ChevronRight size={14} strokeWidth={2.5} />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleCategorySelect(cat.id);
                          setCategoryDrawerOpen(false);
                        }}
                        aria-label={`Select ${cat.name}`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                            : 'bg-white border-slate-300 hover:border-[#1D4ED8]'
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleCategorySelect(cat.id);
                        setCategoryDrawerOpen(false);
                      }}
                      className="flex-1 flex items-center justify-between min-w-0 text-left py-0.5 cursor-pointer"
                    >
                      <span className="truncate pr-2">
                        {cat.level > 1 ? `↳ ${cat.name}` : cat.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-blue-100 text-[#1D4ED8]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cat.productCount ?? 0}
                      </span>
                    </button>
                  </div>
                );
              })}

              {filteredDrawerCategories.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching category
                </div>
              )}
            </div>

            {/* Bottom Close Action */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setCategoryDrawerOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
