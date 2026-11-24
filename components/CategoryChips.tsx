'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Folder, Layers, X, ChevronRight, Check } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

export interface Category {
  id: number;
  name: string;
  productCount?: number;
}

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: number | null;
  onSelect: (categoryId: number | null) => void;
  layout?: 'chips' | 'sidebar';
  onOpenDrawer?: () => void;
}

export default function CategoryChips({
  categories,
  selectedCategory,
  onSelect,
  layout = 'chips',
  onOpenDrawer,
}: CategoryChipsProps) {
  const [sidebarSearch, setSidebarSearch] = useState('');

  if (layout === 'sidebar') {
    const filtered = categories.filter((c) =>
      c.name.toLowerCase().includes(sidebarSearch.toLowerCase().trim())
    );

    return (
      <div className="w-full flex flex-col">
        {/* Header with Title, Count Badge & Reset */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Layers size={14} strokeWidth={2.2} />
            </span>
            <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">
              Categories
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {categories.length}
            </span>
          </div>

          {selectedCategory !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(null)}
              className="text-[11px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] p-0 h-auto min-h-0"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Quick Filter Search Bar when >= 6 categories */}
        {categories.length >= 6 && (
          <div className="mb-2.5 relative">
            <Input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Filter categories..."
              aria-label="Filter categories"
              icon={<Search size={14} className="text-slate-400" />}
              className="h-8 text-[12px] pl-8 pr-7 rounded-lg border-slate-200 bg-slate-50/60 focus:bg-white"
            />
            {sidebarSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarSearch('')}
                className="absolute right-1 top-1 h-6 w-6 min-h-0 p-0 text-slate-400 hover:text-slate-600"
                aria-label="Clear filter"
              >
                <X size={12} />
              </Button>
            )}
          </div>
        )}

        {/* Scrollable Category List with Distinct Bifurcated Items */}
        <div className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5 scrollbar-thin">
          {/* Master "All Products" Option */}
          {!sidebarSearch && (
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              onClick={() => onSelect(null)}
              icon={
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
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

          {/* Individual Category Items */}
          {filtered.length > 0 ? (
            filtered.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant="ghost"
                  fullWidth
                  size="sm"
                  onClick={() => onSelect(cat.id)}
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
            <div className="py-6 text-center text-[12px] text-slate-400">
              <p>No category matches &ldquo;{sidebarSearch}&rdquo;</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarSearch('')}
                className="mt-1 text-[11px] text-[#1D4ED8] font-semibold h-auto min-h-0 p-0"
              >
                Clear filter
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrolled = el.scrollLeft > 10;
      setIsScrolled(scrolled);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Horizontal scroll chips with integrated 3-line drawer trigger
  return (
    <div className="flex items-center gap-2 w-full">
      {onOpenDrawer && (
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open categories menu"
          title="Open categories menu"
          className={`whitespace-nowrap shrink-0 flex items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 shadow-xs transition-all duration-300 ease-in-out cursor-pointer h-9 min-h-[36px] ${
            isScrolled
              ? 'w-9 min-w-[36px] px-0 justify-center gap-0'
              : 'px-3 gap-1.5'
          }`}
        >
          <Menu size={18} strokeWidth={2.2} className="text-[#1D4ED8] shrink-0" />
          <div
            className={`flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out ${
              isScrolled ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[120px] opacity-100'
            }`}
          >
            <span className="text-[13px] font-semibold text-slate-800">Categories</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D4ED8] font-bold shrink-0">
              {categories.length}
            </span>
          </div>
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          const scrolled = e.currentTarget.scrollLeft > 10;
          if (scrolled !== isScrolled) setIsScrolled(scrolled);
        }}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none py-1 flex-1 min-w-0"
      >
        <Button
          variant={selectedCategory === null ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onSelect(null)}
          className={`whitespace-nowrap shrink-0 text-[13px] font-medium h-9 min-h-[36px] px-3.5 rounded-lg transition-all ${
            selectedCategory === null
              ? 'bg-[#1D4ED8] text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
        >
          All Products
        </Button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <Button
              key={cat.id}
              variant={isSelected ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onSelect(cat.id)}
              className={`whitespace-nowrap shrink-0 text-[13px] font-medium h-9 min-h-[36px] px-3.5 rounded-lg transition-all ${
                isSelected
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              {cat.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
