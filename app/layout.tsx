export const dynamic = 'force-dynamic';

import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import PwaInit from '@/components/PwaInit';

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'], 
  weight: ['400', '500', '600', '700', '800'] 
});

export const metadata: Metadata = {
  title: 'نظام إدارة المخزون والأرباح الذكي',
  description: 'إدارة مخزون ومبيعات محلات الملابس',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
