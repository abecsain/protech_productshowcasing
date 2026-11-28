'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Folder, Layers, X, ChevronRight, ChevronDown, Check } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { getCategoryAncestors, type CategoryTreeNode } from '@/lib/categories';

export type Category = CategoryTreeNode;

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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const ancestors = selectedCategory ? getCategoryAncestors(categories, selectedCategory) : [];
  const activeAncestorIds = new Set(ancestors.map((a) => a.id));
  const activeLevel1Id = ancestors[0]?.id ?? null;
  const activeLevel2Id = ancestors[1]?.id ?? null;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      setIsScrolled(el.scrollLeft > 10);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (layout === 'sidebar') {
    const query = sidebarSearch.toLowerCase().trim();
    const isSearching = query.length > 0;
    const mainCategories = categories.filter((c) => c.level === 1);
    const hasChildren = (id: number) => categories.some((c) => c.parentId === id);

    const toggleExpand = (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const filtered = isSearching
      ? categories.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.fullPath.toLowerCase().includes(query)
        )
      : categories.filter((cat) => {
          if (cat.level === 1) return true;
          if (cat.level === 2) {
            return (
              cat.parentId !== null &&
              (expandedIds.has(cat.parentId) || activeAncestorIds.has(cat.parentId))
            );
          }
          if (cat.level === 3) {
            const parent = categories.find((p) => p.id === cat.parentId);
            if (!parent || !parent.parentId) return false;
            const l1Visible = expandedIds.has(parent.parentId) || activeAncestorIds.has(parent.parentId);
            const l2Visible = expandedIds.has(parent.id) || activeAncestorIds.has(parent.id);
            return l1Visible && l2Visible;
          }
          return false;
        });

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
              {mainCategories.length}
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

        {/* Scrollable 3-Level Category List */}
        <div className="space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5 scrollbar-thin">
          {/* Master "All Products" Option */}
          {!isSearching && (
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

          {/* Individual Category Items (3-Level Tree) */}
          {filtered.length > 0 ? (
            filtered.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const isInActiveBranch = !isSelected && activeAncestorIds.has(cat.id);
              const catHasChildren = !isSearching && cat.level < 3 && hasChildren(cat.id);
              const isExpanded = expandedIds.has(cat.id) || activeAncestorIds.has(cat.id);

              return (
                <div
                  key={cat.id}
                  className={
                    !isSearching
                      ? cat.level === 2
                        ? 'pl-3'
                        : cat.level === 3
                        ? 'pl-6'
                        : ''
                      : ''
                  }
                >
                  <Button
                    variant="ghost"
                    fullWidth
                    size="sm"
                    onClick={() => {
                      if (catHasChildren) {
                        setExpandedIds((prev) => new Set(prev).add(cat.id));
                      }
                      onSelect(cat.id);
                    }}
                    icon={
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#1D4ED8] text-white'
                            : isInActiveBranch
                            ? 'bg-blue-100 text-[#1D4ED8] border border-blue-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-blue-50 group-hover:text-[#1D4ED8] group-hover:border-blue-200'
                        }`}
                      >
                        {isSelected ? <Check size={13} strokeWidth={2.5} /> : <Folder size={12} />}
                      </span>
                    }
                    className={`group !justify-start text-left !px-2.5 rounded-xl border transition-all ${
                      cat.level === 1 ? 'h-10 !min-h-[40px]' : 'h-9 !min-h-[36px]'
                    } ${
                      isSelected
                        ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                        : isInActiveBranch
                        ? 'bg-blue-50/40 text-[#1D4ED8] font-semibold border-blue-100'
                        : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex-1 truncate text-[12.5px]">
                      {isSearching ? cat.fullPath : cat.level > 1 ? `↳ ${cat.name}` : cat.name}
                    </span>
                    {catHasChildren ? (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => toggleExpand(cat.id, e)}
                        aria-label={isExpanded ? 'Collapse sub-categories' : 'Expand sub-categories'}
                        className="p-0.5 rounded hover:bg-blue-100/70 text-slate-400 hover:text-[#1D4ED8] shrink-0 ml-1"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1D4ED8] shrink-0">
                        Active
                      </span>
                    ) : null}
                  </Button>
                </div>
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

  // Horizontal cascading scroll chips (Mobile & Tablet)
  const mainCategories = categories.filter((c) => c.level === 1);
  const level2Chips = activeLevel1Id
    ? categories.filter((c) => c.parentId === activeLevel1Id)
    : [];
  const level3Chips = activeLevel2Id
    ? categories.filter((c) => c.parentId === activeLevel2Id)
    : [];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Row 1: Drawer trigger + All Products + Level 1 Main Categories */}
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
                {mainCategories.length}
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

          {mainCategories.map((cat) => {
            const isSelected = activeLevel1Id === cat.id;
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

      {/* Row 2: Level 2 Sub-Categories (shown when active Level 1 has children) */}
      {level2Chips.length > 0 && activeLevel1Id && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 pl-1">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
            Sub:
          </span>
          <Button
            variant={selectedCategory === activeLevel1Id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSelect(activeLevel1Id)}
            className={`whitespace-nowrap shrink-0 text-[12px] font-medium h-7 !min-h-[28px] px-2.5 rounded-md ${
              selectedCategory === activeLevel1Id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            All
          </Button>
          {level2Chips.map((sub) => {
            const isSubSelected = activeLevel2Id === sub.id;
            return (
              <Button
                key={sub.id}
                variant={isSubSelected ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onSelect(sub.id)}
                className={`whitespace-nowrap shrink-0 text-[12px] font-medium h-7 !min-h-[28px] px-2.5 rounded-md ${
                  isSubSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {sub.name}
              </Button>
            );
          })}
        </div>
      )}

      {/* Row 3: Level 3 Sub-Sub Categories (shown when active Level 2 has children) */}
      {level3Chips.length > 0 && activeLevel2Id && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 pl-1">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
            Type:
          </span>
          <Button
            variant={selectedCategory === activeLevel2Id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSelect(activeLevel2Id)}
            className={`whitespace-nowrap shrink-0 text-[12px] font-medium h-7 !min-h-[28px] px-2.5 rounded-md ${
              selectedCategory === activeLevel2Id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            All
          </Button>
          {level3Chips.map((sub3) => {
            const isSub3Selected = selectedCategory === sub3.id;
            return (
              <Button
                key={sub3.id}
                variant={isSub3Selected ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onSelect(sub3.id)}
                className={`whitespace-nowrap shrink-0 text-[12px] font-medium h-7 !min-h-[28px] px-2.5 rounded-md ${
                  isSub3Selected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {sub3.name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
