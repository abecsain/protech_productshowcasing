'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSecurity } from './SecurityProvider';

export interface CartItem {
  id: number;
  name: string;
  price?: number | null;
  image: string;
  quantity: number;
  category?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: { id: number; name: string; price?: number | null; image: string; category?: string }, quantity?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number | null;
  pricesLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'pte_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { canSeePrices, authChecked } = useSecurity();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const prevCanSeeRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to storage', e);
      }
    }
  }, [items, hydrated]);

  // Sync cart item prices whenever price visibility changes or items without prices exist while allowed
  const itemIdsKey = items.map((i) => `${i.id}:${typeof i.price === 'number' ? 'p' : 'n'}`).join(',');
  useEffect(() => {
    if (!hydrated) return;

    const justEnabled = !prevCanSeeRef.current && canSeePrices;
    prevCanSeeRef.current = canSeePrices;

    if (!canSeePrices) {
      if (authChecked && items.some((i) => i.price !== undefined && i.price !== null)) {
        setItems((prev) => prev.map(({ price: _p, ...rest }) => rest));
      }
      setPricesLoading(false);
      return;
    }

    if (items.length === 0) {
      setPricesLoading(false);
      return;
    }

    // Fetch live prices for items missing price, or all cart items when price access just turned ON
    const idsToFetch = justEnabled
      ? items.map((i) => i.id)
      : items.filter((i) => typeof i.price !== 'number').map((i) => i.id);

    if (idsToFetch.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();
    setPricesLoading(true);

    (async () => {
      try {
        const mergedPrices: Record<number, number> = {};
        for (let i = 0; i < idsToFetch.length; i += 50) {
          const chunk = idsToFetch.slice(i, i + 50);
          const res = await fetch(`/api/prices?ids=${chunk.join(',')}`, {
            signal: controller.signal,
            cache: 'no-store',
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.canSeePrices === false) return;
          if (data.prices) {
            Object.assign(mergedPrices, data.prices);
          }
        }
        if (!cancelled && Object.keys(mergedPrices).length > 0) {
          setItems((prev) =>
            prev.map((item) =>
              mergedPrices[item.id] !== undefined
                ? { ...item, price: Number(mergedPrices[item.id]) }
                : item
            )
          );
        }
      } catch {
        // Ignore abort/network errors
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hydrated, canSeePrices, authChecked, itemIdsKey]);

  const addItem = (product: { id: number; name: string; price?: number | null; image: string; category?: string }, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                ...(typeof product.price === 'number' ? { price: product.price } : {}),
              }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Only expose totalPrice when price visibility is allowed and every item has a valid numeric price
  const hasPrices = canSeePrices && items.length > 0 && items.every((i) => typeof i.price === 'number');
  const totalPrice = hasPrices
    ? items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
    : null;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
        pricesLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
