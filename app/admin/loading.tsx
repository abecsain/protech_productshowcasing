import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-5 sm:space-y-6 animate-pulse">
      <div className="h-8 w-44 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="h-28 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-7 w-16 bg-blue-100 rounded" />
        </div>
        <div className="h-28 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-7 w-16 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
            <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
              <div className="h-3 w-1/5 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-20 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
