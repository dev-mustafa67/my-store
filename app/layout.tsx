export const dynamic = 'force-dynamic';

import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'نظام إدارة المخزون والأرباح الذكي',
  description: 'إدارة مخزون ومبيعات محلات الملابس',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
