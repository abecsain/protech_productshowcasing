'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, Folder, Layers, ChevronRight, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProductCard, { ProductItem } from '@/components/ProductCard';
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

export default function ProductsPage() {
  const pathname = usePathname();
  const { totalCount } = useCart();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Initialize filters from URL or sessionStorage so navigating Back restores the exact filter state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat !== null) return Number(cat);
    try {
      const saved = sessionStorage.getItem('pte_products_filter');
      if (saved) return JSON.parse(saved).category ?? null;
    } catch {}
    return null;
  });

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q !== null) return q;
    try {
      const saved = sessionStorage.getItem('pte_products_filter');
      if (saved) return JSON.parse(saved).query ?? '';
    } catch {}
    return '';
  });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q !== null) return q;
    try {
      const saved = sessionStorage.getItem('pte_products_filter');
      if (saved) return JSON.parse(saved).query ?? '';
    } catch {}
    return '';
  });

  const [page, setPage] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const params = new URLSearchParams(window.location.search);
    const p = params.get('page');
    if (p !== null) return Number(p);
    try {
      const saved = sessionStorage.getItem('pte_products_filter');
      if (saved) return JSON.parse(saved).page ?? 1;
    } catch {}
    return 1;
  });

  const [total, setTotal] = useState(0);
  const [canSeePrices, setCanSeePrices] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state to URL & sessionStorage
  useEffect(() => {
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

  const hasRestoredScrollRef = React.useRef(false);
  const isRestoringScrollRef = React.useRef(false);

  // Debounce customer search to make typing instantaneous and eliminate flicker
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const isDrawerPoppedRef = React.useRef(false);

  // Category Drawer browser Back button integration:
  // Pressing back on mobile closes the category drawer instead of navigating away!
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
      if (e.key === 'Escape') setCategoryDrawerOpen(false);
    };
    if (categoryDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [categoryDrawerOpen]);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    }
    loadCategories();
  }, []);

  // Fetch products with pagination, search, category
  const loadProducts = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
        console.log('[DEBUG LOADPRODUCTS FINISHED] products count:', data.products?.length);
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setCanSeePrices(Boolean(data.canSeePrices));
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchQuery, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Restore scroll position whenever arriving on /products with loaded products or on browser back
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

  // Real-time automatic price update without refresh
  useEffect(() => {
    const handlePriceChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ canSeePrices: boolean }>;
      const newCanSeePrices = Boolean(customEvent.detail?.canSeePrices);
      setCanSeePrices(newCanSeePrices);
      if (!newCanSeePrices) {
        // Strip prices from in-memory products immediately
        setProducts((prev) => prev.map((p) => ({ ...p, price: undefined })));
      } else {
        // Re-load to populate newly authorized prices
        loadProducts();
      }
    };

    window.addEventListener('price-visibility-changed', handlePriceChange);
    return () => window.removeEventListener('price-visibility-changed', handlePriceChange);
  }, [loadProducts]);

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

  const filteredDrawerCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(drawerSearch.toLowerCase().trim())
  );

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col">
      <Navbar />

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

      {/* Main Content Area (SS Protected) */}
      <main
        className="flex-1 py-6 sm:py-8 pb-28 sm:pb-12 ss-protected-content select-none-secure"
        data-ss-protect="true"
      >
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

            {/* Products Area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-semibold text-slate-900 tracking-tight">
                    {selectedCategory
                      ? categories.find((c) => c.id === selectedCategory)?.name || 'Category Products'
                      : 'All Products'}
                  </h1>
                </div>
                <span className="text-[13px] font-medium text-slate-500">
                  {total} product{total === 1 ? '' : 's'}
                </span>
              </div>

              {/* Grid: 2 columns on mobile, 4 columns on desktop */}
              {loading && products.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 p-3 space-y-3"
                    >
                      <Skeleton className="w-full aspect-square rounded-lg" />
                      <Skeleton className="w-1/3 h-3 rounded" />
                      <Skeleton className="w-3/4 h-4 rounded" />
                      <Skeleton className="w-1/2 h-4 rounded" />
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      canSeePrices={canSeePrices}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No products found"
                  description={
                    searchQuery
                      ? `No products match "${searchQuery}". Try a different keyword.`
                      : 'No products are currently available in this category.'
                  }
                  actionLabel={searchQuery || selectedCategory ? 'Reset Filters' : undefined}
                  onAction={
                    searchQuery || selectedCategory
                      ? () => {
                          setSearchQuery('');
                          setSelectedCategory(null);
                        }
                      : undefined
                  }
                />
              )}

              {/* Pagination */}
              {totalPages > 1 && !loading && (
                <div className="mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      hasRestoredScrollRef.current = true;
                      try {
                        sessionStorage.removeItem('pte_products_scrollY');
                      } catch {}
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </main>

      {/* Left Slide-out Category Drawer (Available on all screen sizes) */}
      {categoryDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-drawer-title"
          className="fixed inset-0 z-50 flex"
        >
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setCategoryDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Left Slide Panel */}
          <div className="relative w-[300px] max-w-[85vw] h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Menu size={20} className="text-[#1D4ED8]" strokeWidth={2.5} />
                <h2 id="category-drawer-title" className="text-[16px] font-bold text-slate-900">
                  All Categories
                </h2>
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setCategoryDrawerOpen(false)}
                aria-label="Close categories menu"
              >
                <X size={20} strokeWidth={2} />
              </IconButton>
            </div>

            {/* Quick Category Filter Input */}
            <div className="p-3 border-b border-slate-100 bg-white">
              <Input
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                placeholder="Filter categories..."
                aria-label="Filter categories"
                icon={<Search size={16} />}
              />
            </div>

            {/* Drawer Category List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {!drawerSearch && (
                <Button
                  variant="ghost"
                  fullWidth
                  size="sm"
                  onClick={() => {
                    handleCategorySelect(null);
                    setCategoryDrawerOpen(false);
                    setDrawerSearch('');
                  }}
                  icon={
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        selectedCategory === null
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <Layers size={13} strokeWidth={2.2} />
                    </span>
                  }
                  className={`!justify-start text-left h-10 !min-h-[40px] !px-2.5 rounded-xl border transition-all ${
                    selectedCategory === null
                      ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <span className="flex-1 truncate text-[13px]">All Products</span>
                  {selectedCategory === null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1D4ED8] shrink-0">
                      Active
                    </span>
                  )}
                </Button>
              )}

              {filteredDrawerCategories.length > 0 ? (
                filteredDrawerCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      variant="ghost"
                      fullWidth
                      size="sm"
                      onClick={() => {
                        handleCategorySelect(cat.id);
                        setCategoryDrawerOpen(false);
                        setDrawerSearch('');
                      }}
                      icon={
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-blue-50 group-hover:text-[#1D4ED8] group-hover:border-blue-200'
                          }`}
                        >
                          {isSelected ? <Check size={13} strokeWidth={2.5} /> : <Folder size={13} />}
                        </span>
                      }
                      className={`group !justify-start text-left h-10 !min-h-[40px] !px-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex-1 truncate text-[13px]">{cat.name}</span>
                      {isSelected ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1D4ED8] shrink-0">
                          Active
                        </span>
                      ) : (
                        <ChevronRight
                          size={13}
                          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                        />
                      )}
                    </Button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-[13px] text-slate-400">
                  <p>No matching category found</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrawerSearch('')}
                    className="mt-1 text-[12px] text-[#1D4ED8] font-semibold h-auto min-h-0 p-0"
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Bar on Mobile */}
      {totalCount > 0 && (
        <div className="sm:hidden fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40">
          <Link
            href="/cart"
            className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-medium text-[15px] rounded-lg shadow-md flex items-center justify-between px-5 transition-colors"
          >
            <span>{totalCount} {totalCount === 1 ? 'item' : 'items'} · Buy on WhatsApp</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* Business Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-[13px] text-slate-500">
        <PageContainer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="font-semibold text-slate-800">Pro Tech Enterprises</span>
          <p>© {new Date().getFullYear()} Pro Tech Enterprises. All rights reserved.</p>
        </PageContainer>
      </footer>
    </div>
  );
}
