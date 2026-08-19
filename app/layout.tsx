export const dynamic = 'force-dynamic';

import './globals.css';
import type { ReactNode } from 'react';
import { Cairo } from 'next/font/google';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata = {
  title: 'نظام إدارة المخزون والأرباح الذكي',
  description: 'إدارة مخزون ومبيعات محلات الملابس',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  );
}
