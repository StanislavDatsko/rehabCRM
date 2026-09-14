import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { t } from '../i18n/messages';
import './globals.css';

export const metadata: Metadata = {
  title: t('productName'),
  description: t('tagline'),
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" data-theme="light">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
        >
          {t('skipToContent')}
        </a>
        {children}
      </body>
    </html>
  );
}
