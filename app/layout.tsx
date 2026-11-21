import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import { ToastProvider } from '@/components/ui/Toast';
import SecurityProvider from '@/components/SecurityProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pro Tech Enterprises | Product Showcase',
  description: 'Pro Tech Enterprises – Your Trusted Technology Partner.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white text-slate-900 antialiased`}>
        <ToastProvider>
          <SecurityProvider>
            <CartProvider>{children}</CartProvider>
          </SecurityProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
