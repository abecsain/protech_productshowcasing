'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QuantityStepper from './ui/QuantityStepper';
import { useCart } from './CartContext';
import { useToast } from './ui/Toast';
import Button from './ui/Button';
import IconButton from './ui/IconButton';
import Modal from './ui/Modal';

interface ProductModalProps {
  productId: number;
  initialData?: {
    id: number;
    name: string;
    description: string;
    price?: number | null;
    category?: string;
    image: string;
  };
  canSeePrices: boolean;
  onClose: () => void;
}

interface FullProduct {
  id: number;
  name: string;
  description: string;
  price?: number | null;
  category: string;
  images: string[];
}

export default function ProductModal({
  productId,
  initialData,
  canSeePrices,
  onClose,
}: ProductModalProps) {
  const [product, setProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();

  const cartItem = items.find((i) => i.id === productId);
  const inCartQty = cartItem ? cartItem.quantity : 0;

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/products/${productId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.product) {
            setProduct(data.product);
          }
        }
      } catch (e) {
        console.error('Failed to load product details', e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [productId, canSeePrices]);

  const images = product?.images?.length
    ? product.images
    : initialData?.image
    ? [initialData.image]
    : [];

  const activeImage = images[selectedImageIndex] || '/product-placeholder.svg';
  const name = product?.name || initialData?.name || 'Product';
  const description = product?.description || initialData?.description || '';
  const category = product?.category || initialData?.category || '';
  const price = product?.price !== undefined ? product?.price : initialData?.price;

  const handleAddToCart = () => {
    addItem(
      {
        id: productId,
        name,
        price,
        image: activeImage,
        category,
      },
      quantity
    );
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={category || 'Product Details'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Main Photo Display */}
        <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
          {images.length > 0 ? (
            <Image
              src={activeImage}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-contain p-2"
              priority
            />
          ) : (
            <span className="text-slate-400 text-sm">No image available</span>
          )}
        </div>

        {/* Thumbnails row */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <IconButton
                key={idx}
                variant="ghost"
                onClick={() => setSelectedImageIndex(idx)}
                aria-label={`View photo ${idx + 1}`}
                className={`relative w-14 h-14 min-w-[56px] min-h-[56px] p-0 rounded-lg overflow-hidden border-2 shrink-0 ${
                  selectedImageIndex === idx
                    ? 'border-[#1D4ED8]'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <Image
                  src={img}
                  alt={`${name} thumbnail ${idx + 1}`}
                  fill
                  sizes="56px"
                  className="object-contain p-0.5 bg-white"
                />
              </IconButton>
            ))}
          </div>
        )}

        {/* Details */}
        <div>
          <h2 className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-snug">
            {name}
          </h2>

          {/* Price */}
          <div className="mt-1.5">
            {canSeePrices && typeof price === 'number' ? (
              <div className="text-[18px] font-bold text-[#1D4ED8]">
                ₹{price.toLocaleString('en-IN')}
              </div>
            ) : (
              <div className="text-[14px] font-medium text-slate-500">
                Price on request
              </div>
            )}
          </div>

          {/* Description */}
          <p className="mt-2.5 text-[14px] text-slate-600 leading-relaxed">
            {description || (loading ? 'Loading description...' : 'Quality guaranteed by Protech Enterprises.')}
          </p>
        </div>

        {/* Quantity & Add to Cart Action */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {inCartQty > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#1D4ED8]">In Cart:</span>
                <QuantityStepper
                  value={inCartQty}
                  min={0}
                  onChange={(newQty) => {
                    if (newQty <= 0) {
                      removeItem(productId);
                    } else {
                      updateQuantity(productId, newQty);
                    }
                  }}
                  variant="primary"
                  size="sm"
                  showTrashAtMin
                />
              </div>

              <Button
                variant="primary"
                onClick={onClose}
                className="flex-1"
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-slate-600">Qty:</span>
                <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={handleAddToCart}
              >
                Add to Cart
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
