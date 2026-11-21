'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useCart } from '@/components/CartContext';
import { useSecurity } from '@/components/SecurityProvider';
import PageContainer from '@/components/ui/PageContainer';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

interface UserInfo {
  name: string;
  mobile: string;
  canSeePrices: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalCount, totalPrice } = useCart();
  const { userInfo: user } = useSecurity();
  const [adminWhatsapp, setAdminWhatsapp] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.whatsapp) {
            setAdminWhatsapp(settingsData.whatsapp.replace(/\D/g, ''));
          }
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
    loadSettings();
  }, []);

  const handleBuyWhatsApp = () => {
    if (items.length === 0) return;

    const customerName = user?.name || 'Customer';
    const customerMobile = user?.mobile || '';
    const canSeePrices = Boolean(user?.canSeePrices);

    let message = `Hello Pro Tech Enterprises,\n\nI would like to place an order:\n`;
    message += `Customer: ${customerName}\n`;
    if (customerMobile) {
      message += `Mobile: ${customerMobile}\n`;
    }
    message += `\nOrder Items:\n`;

    items.forEach((item, index) => {
      if (canSeePrices && typeof item.price === 'number') {
        const itemTotal = item.price * item.quantity;
        message += `${index + 1}. ${item.name} - Qty: ${item.quantity} (₹${item.price.toLocaleString('en-IN')} each = ₹${itemTotal.toLocaleString('en-IN')})\n`;
      } else {
        message += `${index + 1}. ${item.name} - Qty: ${item.quantity}\n`;
      }
    });

    if (canSeePrices && typeof totalPrice === 'number') {
      message += `\nEstimated Total: ₹${totalPrice.toLocaleString('en-IN')}\n`;
    }

    message += `\nPlease confirm availability and share details. Thank you!`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${adminWhatsapp}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="flex-1 py-6 sm:py-10 pb-28 sm:pb-12">
        <PageContainer>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    window.history.back();
                  } else {
                    router.push('/products');
                  }
                }}
                className="text-slate-700 hover:text-[#1D4ED8] -ml-1 text-[13px] font-semibold"
                icon={<ArrowLeft size={16} strokeWidth={2.5} />}
              >
                Back
              </Button>
              <h1 className="text-[20px] sm:text-[28px] font-bold text-slate-900 tracking-tight">
                Shopping Cart ({totalCount})
              </h1>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[13px]"
              >
                Clear Cart
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={32} className="text-slate-400" />}
              title="Your cart is empty"
              description="Browse our technology products and add items to your cart."
              actionLabel="Explore Products"
              onAction={() => router.push('/products')}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Items List (Left 2 columns on laptop) */}
              <div className="lg:col-span-2 space-y-3">
                {items.map((item) => (
                  <Card key={item.id} padding="sm" className="flex items-center gap-3 sm:gap-4">
                    {/* Square Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">PTE</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[14px] sm:text-[15px] font-semibold text-slate-900 truncate">
                        {item.name}
                      </h2>

                      {user?.canSeePrices && typeof item.price === 'number' ? (
                        <div className="text-[14px] font-bold text-[#1D4ED8] mt-0.5">
                          ₹{item.price.toLocaleString('en-IN')}{' '}
                          <span className="text-[12px] text-slate-400 font-normal">each</span>
                        </div>
                      ) : (
                        <div className="text-[12px] text-slate-400 mt-0.5 font-medium">
                          Price on request
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-3">
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(qty) => updateQuantity(item.id, qty)}
                          size="sm"
                        />

                        <IconButton
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </IconButton>
                      </div>
                    </div>

                    {/* Subtotal on desktop */}
                    {user?.canSeePrices && typeof item.price === 'number' && (
                      <div className="text-right shrink-0 hidden sm:block pr-2">
                        <div className="text-[12px] text-slate-500">Subtotal</div>
                        <div className="text-[15px] font-bold text-slate-900">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Order Summary Card (Right 1 column on laptop) */}
              <div className="lg:col-span-1">
                <Card padding="md" className="space-y-4">
                  <h2 className="text-[18px] font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Order Summary
                  </h2>

                  <div className="space-y-2 text-[14px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Items</span>
                      <span className="font-semibold text-slate-900">{totalCount}</span>
                    </div>

                    {user?.canSeePrices && typeof totalPrice === 'number' ? (
                      <div className="flex justify-between text-[16px] font-bold text-slate-900 pt-2 border-t border-slate-100">
                        <span>Estimated Total</span>
                        <span className="text-[#1D4ED8]">₹{totalPrice.toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 text-[12px] text-slate-500">
                        Prices will be confirmed directly on WhatsApp by the administrator.
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleBuyWhatsApp}
                      disabled={!adminWhatsapp}
                    >
                      Buy on WhatsApp
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </PageContainer>
      </main>

      {/* Sticky Bottom Bar on Mobile with Safe-Area Padding */}
      {items.length > 0 && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleBuyWhatsApp}
            disabled={!adminWhatsapp}
          >
            Buy on WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
