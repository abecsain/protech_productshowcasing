'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import QuantityStepper from './ui/QuantityStepper';
import Button from './ui/Button';
import { useCart } from './CartContext';
import { useToast } from './ui/Toast';
import ProductModal from './ProductModal';

export interface ProductItem {
  id: number;
  name: string;
  description: string;
  price?: number | null;
  category: string;
  categoryId?: number;
  categoryPath?: string;
  image: string;
  imageCount?: number;
}

interface ProductCardProps {
  product: ProductItem;
  canSeePrices: boolean;
  compact?: boolean;
  priority?: boolean;
}

function ProductCard({
  product,
  canSeePrices,
  compact = false,
  priority = false,
}: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const handleCloseModal = React.useCallback(() => setModalOpen(false), []);
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();

  const cartItem = items.find((i) => i.id === product.id);
  const inCartQty = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
      },
      1
    );
  };

  const handleUpdateCartQty = (newQty: number) => {
    if (newQty <= 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQty);
    }
  };

  if (compact) {
    // 3-column compact card for Home page
    return (
      <>
        <div
          data-testid="product-card"
          onClick={() => setModalOpen(true)}
          className={`group flex flex-col bg-white rounded-xl border transition-all cursor-pointer overflow-hidden p-2 sm:p-2.5 justify-between ${
            inCartQty > 0
              ? 'border-[#1D4ED8]/70 shadow-xs ring-1 ring-[#1D4ED8]/30'
              : 'border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-[#1D4ED8]/60'
          }`}
        >
          {/* Square thumbnail with Cart Badge if added */}
          <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 33vw, 180px"
                className="object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                priority={priority}
                loading={priority ? undefined : 'lazy'}
              />
            ) : (
              <span className="text-[10px] font-bold text-slate-300">PTE</span>
            )}

            {inCartQty > 0 && (
              <span className="absolute top-1 right-1 bg-[#1D4ED8] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs z-10 flex items-center gap-0.5">
                ✓ {inCartQty}
              </span>
            )}
          </div>

          {/* 2-line name & price */}
          <div className="mt-1.5 flex flex-col flex-1 justify-between">
            <h3 className="text-[12px] sm:text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#1D4ED8] transition-colors">
              {product.name}
            </h3>

            <div className="mt-1">
              {canSeePrices && typeof product.price === 'number' ? (
                <div className="text-[12px] sm:text-[13px] font-bold text-[#1D4ED8]">
                  ₹{product.price.toLocaleString('en-IN')}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 font-medium">
                  Price on req.
                </div>
              )}
            </div>

            {/* Stepper if added, otherwise quick Add */}
            <div className="mt-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
              {inCartQty > 0 ? (
                <QuantityStepper
                  value={inCartQty}
                  min={0}
                  onChange={handleUpdateCartQty}
                  fullWidth
                  variant="primary"
                  size="sm"
                  showTrashAtMin
                />
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={handleAddToCart}
                  className="h-7 !min-h-[28px] !px-1.5 text-[11px] font-bold text-[#1D4ED8] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 rounded-md"
                  icon={<Plus size={12} strokeWidth={2.5} />}
                >
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>

        {modalOpen && (
          <ProductModal
            productId={product.id}
            initialData={product}
            canSeePrices={canSeePrices}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  // Full product card for /products page
  return (
    <>
      <div
        data-testid="product-card"
        onClick={() => setModalOpen(true)}
        className={`group flex flex-col bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden justify-between ${
          inCartQty > 0
            ? 'border-[#1D4ED8]/70 shadow-xs ring-1 ring-[#1D4ED8]/30'
            : 'border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-[#1D4ED8]/60'
        }`}
      >
        {/* Square Image with Cart Badge if added */}
        <div className="relative w-full aspect-square bg-white overflow-hidden flex items-center justify-center">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-200"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
            />
          ) : (
            <span className="text-slate-400 text-xs">No image</span>
          )}

          {inCartQty > 0 && (
            <span className="absolute top-2 right-2 bg-[#1D4ED8] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10 animate-in fade-in zoom-in duration-150">
              ✓ {inCartQty} in cart
            </span>
          )}
        </div>

        {/* Card Content */}
        <div className="p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {product.categoryPath || product.category}
            </span>
            <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 line-clamp-2 leading-snug mt-0.5 group-hover:text-[#1D4ED8] transition-colors">
              {product.name}
            </h3>

            <div className="mt-1">
              {canSeePrices && typeof product.price === 'number' ? (
                <div className="text-[14px] sm:text-[15px] font-bold text-[#1D4ED8]">
                  ₹{product.price.toLocaleString('en-IN')}
                </div>
              ) : (
                <div className="text-[12px] text-slate-400 font-medium">
                  Price on request
                </div>
              )}
            </div>
          </div>

          {/* Action Row: When added, shows JUST Increase/Decrease and Number; otherwise shows Add Button */}
          <div
            className="pt-2 border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {inCartQty > 0 ? (
              <div className="flex items-center w-full">
                <QuantityStepper
                  value={inCartQty}
                  min={0}
                  onChange={handleUpdateCartQty}
                  fullWidth
                  variant="primary"
                  size="sm"
                  showTrashAtMin
                />
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleAddToCart}
                className="h-8 !min-h-[32px] text-[13px] font-bold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
                icon={<Plus size={14} strokeWidth={2.5} />}
              >
                Add
              </Button>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <ProductModal
          productId={product.id}
          initialData={product}
          canSeePrices={canSeePrices}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default React.memo(ProductCard);
