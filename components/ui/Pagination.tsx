'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`flex items-center justify-center gap-1.5 py-4 ${className}`}
      aria-label="Pagination"
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center gap-1 text-[14px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
        aria-label="Previous page"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((page, index, array) => {
            const prev = array[index - 1];
            const showEllipsis = prev && page - prev > 1;

            return (
              <React.Fragment key={page}>
                {showEllipsis && (
                  <span className="w-9 text-center text-slate-400 select-none">
                    ...
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`
                    min-h-[44px] min-w-[44px] px-3.5 inline-flex items-center justify-center text-[14px] font-semibold rounded-lg transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]
                    ${
                      currentPage === page
                        ? 'bg-[#1D4ED8] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}
      </div>

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center gap-1 text-[14px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </nav>
  );
}

export default Pagination;
