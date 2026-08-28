import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from '@/components/PwaRegister'

export const metadata: Metadata = {
  title: 'KIMANH — Quản lý sản phẩm',
  description: 'Hệ thống quản lý sản phẩm & đào tạo nhân viên KIMANH',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KIMANH',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1D9E75',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Next 16's appleWebApp metadata only emits mobile-web-app-capable, not this
            legacy tag — iOS Safari still needs it to open standalone without the URL bar. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
