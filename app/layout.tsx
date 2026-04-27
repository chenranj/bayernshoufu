import type { Metadata, Viewport } from 'next';
import { Inter, Archivo_Black } from 'next/font/google';
import './globals.css';
import { ProtectionLayer } from '@/components/protection-layer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const archivo = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bayernshoufu',
  description: 'A fan jersey archive for FC Bayern enthusiasts.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body data-protect="1">
        <ProtectionLayer />
        {children}
      </body>
    </html>
  );
}
