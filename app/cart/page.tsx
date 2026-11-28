'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, ShoppingCart, ArrowLeft, Building2, MapPin, Smartphone, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useCart } from '@/components/CartContext';
import { useSecurity } from '@/components/SecurityProvider';
import PageContainer from '@/components/ui/PageContainer';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

interface UserInfo {
  name: string;
  firmName?: string;
  mobile: string;
  address?: string;
  canSeePrices: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalCount, totalPrice, pricesLoading } = useCart();
  const { userInfo: user, canSeePrices } = useSecurity();
  const [adminWhatsapp, setAdminWhatsapp] = useState('918319613801');

  // Guest details modal state for unauthenticated ordering
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestFirmName, setGuestFirmName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load previously entered guest info if any
    try {
      const saved = localStorage.getItem('pte_guest_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setGuestName(parsed.name);
        if (parsed.firmName) setGuestFirmName(parsed.firmName);
        if (parsed.mobile) setGuestMobile(parsed.mobile);
        if (parsed.address) setGuestAddress(parsed.address);
      }
    } catch {}

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

  const sendWhatsAppOrder = (customer: {
    name: string;
    firmName: string;
    mobile: string;
    address: string;
    canSeePrices: boolean;
  }) => {
    if (items.length === 0) return;

    const targetWa = adminWhatsapp || '918319613801';
    let message = '';

    if (customer.canSeePrices && typeof totalPrice === 'number') {
      message += `🧾 *PROTECH ENTERPRISES - ORDER BILL*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `👤 *Customer:* ${customer.name}\n`;
      if (customer.firmName) message += `🏢 *Firm Name:* ${customer.firmName}\n`;
      if (customer.mobile) message += `📱 *Mobile:* +91 ${customer.mobile}\n`;
      if (customer.address) message += `📍 *Address:* ${customer.address}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📦 *BILL DETAILS (PRODUCT-WISE):*\n\n`;

      items.forEach((item, index) => {
        const unitPrice = typeof item.price === 'number' ? item.price : 0;
        const itemTotal = unitPrice * item.quantity;
        message += `${index + 1}. *${item.name}*\n`;
        message += `   Qty: ${item.quantity} × ₹${unitPrice.toLocaleString('en-IN')} = *₹${itemTotal.toLocaleString('en-IN')}*\n\n`;
      });

      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📊 *Total Items:* ${totalCount}\n`;
      message += `💰 *TOTAL BILL AMOUNT: ₹${totalPrice.toLocaleString('en-IN')}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `Please confirm our order bill and provide dispatch details. Thank you!`;
    } else {
      message += `🛒 *PROTECH ENTERPRISES - PURCHASE ORDER*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `👤 *Customer:* ${customer.name}\n`;
      if (customer.firmName) message += `🏢 *Firm Name:* ${customer.firmName}\n`;
      if (customer.mobile) message += `📱 *Mobile:* +91 ${customer.mobile}\n`;
      if (customer.address) message += `📍 *Address:* ${customer.address}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📦 *REQUESTED ORDER ITEMS:*\n\n`;

      items.forEach((item, index) => {
        message += `${index + 1}. *${item.name}* (Qty: ${item.quantity})\n`;
      });

      message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Please confirm availability and share the best wholesale price quotation for this order. Thank you!`;
    }

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${targetWa}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleBuyClick = () => {
    if (items.length === 0) return;

    if (user && user.mobile) {
      // User is logged in: directly dispatch with their registered info
      sendWhatsAppOrder({
        name: user.name || 'Valued Customer',
        firmName: user.firmName || '',
        mobile: user.mobile || '',
        address: user.address || '',
        canSeePrices: Boolean(canSeePrices),
      });
    } else {
      // User is not logged in / unregistered: prompt for firm name, mobile, address
      setIsGuestModalOpen(true);
    }
  };

  const handleGuestSubmit = () => {
    const errors: Record<string, string> = {};
    const trimmedName = guestName.trim();
    const trimmedFirm = guestFirmName.trim();
    const cleanMobile = guestMobile.replace(/\D/g, '');
    const trimmedAddress = guestAddress.trim();

    if (!trimmedName) {
      errors.name = 'Customer name is required';
    }
    if (!trimmedFirm) {
      errors.firmName = 'Firm / Business name is required';
    }
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!trimmedAddress) {
      errors.address = 'Address is required';
    }

    if (Object.keys(errors).length > 0) {
      setGuestErrors(errors);
      return;
    }

    try {
      localStorage.setItem(
        'pte_guest_info',
        JSON.stringify({
          name: trimmedName,
          firmName: trimmedFirm,
          mobile: cleanMobile,
          address: trimmedAddress,
        })
      );
    } catch {}

    setIsGuestModalOpen(false);

    sendWhatsAppOrder({
      name: trimmedName,
      firmName: trimmedFirm,
      mobile: cleanMobile,
      address: trimmedAddress,
      canSeePrices: false,
    });
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
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-contain p-1"
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

                      {canSeePrices && typeof item.price === 'number' ? (
                        <div className="mt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-[#1D4ED8]">
                              ₹{item.price.toLocaleString('en-IN')}{' '}
                              <span className="text-[11px] text-slate-400 font-normal">/ unit</span>
                            </span>
                            <span className="text-slate-300 sm:hidden">•</span>
                            <span className="text-[13px] font-bold text-slate-800 sm:hidden">
                              Total: ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ) : canSeePrices && pricesLoading ? (
                        <div className="text-[12px] text-slate-400 mt-0.5 font-medium">
                          Loading price...
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
                    {canSeePrices && typeof item.price === 'number' && (
                      <div className="text-right shrink-0 hidden sm:block pr-2">
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Item Total</div>
                        <div className="text-[16px] font-bold text-slate-900">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
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
                    {canSeePrices && typeof totalPrice === 'number' ? 'Order Bill Summary' : 'Order Summary'}
                  </h2>

                  <div className="space-y-2.5 text-[14px] text-slate-600">
                    {canSeePrices && typeof totalPrice === 'number' && (
                      <div className="space-y-1.5 pb-2 border-b border-slate-100">
                        {items.map((item) => {
                          const unit = typeof item.price === 'number' ? item.price : 0;
                          const lineTotal = unit * item.quantity;
                          return (
                            <div key={item.id} className="flex items-start justify-between gap-2 text-[13px]">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {item.quantity} × ₹{unit.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-900 shrink-0">
                                ₹{lineTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Total Items</span>
                      <span className="font-semibold text-slate-900">{totalCount}</span>
                    </div>

                    {canSeePrices && typeof totalPrice === 'number' ? (
                      <div className="flex justify-between text-[16px] font-bold text-slate-900 pt-2 border-t border-slate-100">
                        <span>Total Bill</span>
                        <span className="text-[#1D4ED8]">₹{totalPrice.toLocaleString('en-IN')}</span>
                      </div>
                    ) : canSeePrices && pricesLoading ? (
                      <div className="pt-2 border-t border-slate-100 text-[12px] text-slate-500">
                        Calculating product prices...
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
                      onClick={handleBuyClick}
                      disabled={items.length === 0 || (canSeePrices && pricesLoading)}
                      loading={canSeePrices && pricesLoading}
                      loadingText="Calculating Bill..."
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

      <Footer className="hidden sm:block" />

      {/* Sticky Bottom Bar on Mobile with Safe-Area Padding */}
      {items.length > 0 && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              {canSeePrices && typeof totalPrice === 'number' ? (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Total Bill</div>
                  <div className="text-[17px] font-bold text-[#1D4ED8] leading-tight">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </div>
                </div>
              ) : canSeePrices && pricesLoading ? (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{totalCount} {totalCount === 1 ? 'Item' : 'Items'}</div>
                  <div className="text-[13px] font-medium text-slate-500">Calculating...</div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{totalCount} {totalCount === 1 ? 'Item' : 'Items'}</div>
                  <div className="text-[13px] font-medium text-slate-600">Price on Request</div>
                </div>
              )}
            </div>
            <div className="flex-1 max-w-[210px]">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleBuyClick}
                disabled={items.length === 0 || (canSeePrices && pricesLoading)}
                loading={canSeePrices && pricesLoading}
                loadingText="Calculating..."
                className="font-bold py-2.5 shadow-sm"
              >
                Buy on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Customer Details Modal before WhatsApp Dispatch */}
      <Modal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        title="Enter Details to Order"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Please provide your name, business firm, and contact details. This will be included with your order items on WhatsApp for swift fulfillment.
          </p>

          <div className="space-y-3">
            <Input
              label="Customer Name"
              required
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                if (guestErrors.name) setGuestErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Enter your full name"
              icon={<User size={16} />}
              error={guestErrors.name}
            />

            <Input
              label="Firm / Business Name"
              required
              value={guestFirmName}
              onChange={(e) => {
                setGuestFirmName(e.target.value);
                if (guestErrors.firmName) setGuestErrors((prev) => ({ ...prev, firmName: '' }));
              }}
              placeholder="Enter your shop or company name"
              icon={<Building2 size={16} />}
              error={guestErrors.firmName}
            />

            <Input
              label="Mobile Number"
              required
              type="tel"
              prefixText="+91"
              value={guestMobile}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                setGuestMobile(clean);
                if (guestErrors.mobile) setGuestErrors((prev) => ({ ...prev, mobile: '' }));
              }}
              placeholder="9876543210"
              error={guestErrors.mobile}
              maxLength={10}
            />

            <Input
              label="Address"
              required
              multiline
              rows={2}
              value={guestAddress}
              onChange={(e) => {
                setGuestAddress(e.target.value);
                if (guestErrors.address) setGuestErrors((prev) => ({ ...prev, address: '' }));
              }}
              placeholder="Shop/Office address, City, State, PIN"
              icon={<MapPin size={16} />}
              error={guestErrors.address}
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsGuestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleGuestSubmit}
              className="font-bold bg-[#1D4ED8]"
            >
              Send on WhatsApp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
