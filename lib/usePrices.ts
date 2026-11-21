'use client';

import { useState, useEffect, useRef } from 'react';
import { useSecurity } from '@/components/SecurityProvider';

const priceCache: Record<number, number> = {};

export function usePrices(productIds: number[]) {
  const { canSeePrices } = useSecurity();
  const [prices, setPrices] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const id of productIds) {
      if (priceCache[id] !== undefined) initial[id] = priceCache[id];
    }
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const fetchedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!canSeePrices) {
      setPrices({});
      return;
    }

    const missingIds = productIds.filter(
      (id) => priceCache[id] === undefined && !fetchedIdsRef.current.has(id)
    );

    if (missingIds.length === 0) {
      setPrices((prev) => {
        let hasNew = false;
        const next = { ...prev };
        for (const id of productIds) {
          if (priceCache[id] !== undefined && next[id] !== priceCache[id]) {
            next[id] = priceCache[id];
            hasNew = true;
          }
        }
        return hasNew ? next : prev;
      });
      return;
    }

    missingIds.forEach((id) => fetchedIdsRef.current.add(id));
    setLoading(true);

    const controller = new AbortController();
    fetch(`/api/prices?ids=${missingIds.join(',')}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { prices: {} }))
      .then((data) => {
        if (data.prices) {
          Object.assign(priceCache, data.prices);
          setPrices((prev) => ({ ...prev, ...data.prices }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [productIds, canSeePrices]);

  return { prices, canSeePrices, loading };
}
