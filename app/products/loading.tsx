import React from 'react';

export default function ProductsLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col animate-pulse">
      <div className="h-14 bg-white border-b border-slate-200" />
      <div className="bg-white border-b border-slate-200 py-3 px-4">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
            <div className="aspect-square bg-slate-100 rounded-xl" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-8 w-full bg-blue-50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
