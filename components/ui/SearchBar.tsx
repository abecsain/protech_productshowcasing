'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search products by name...',
  className = '',
  id = 'search-input',
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center w-full min-h-[44px] h-11 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>

      <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
        <Search size={20} strokeWidth={2} />
      </div>

      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-11 pr-11 bg-white border border-slate-300 rounded-lg text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] transition-colors"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-r-lg"
        >
          <X size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
