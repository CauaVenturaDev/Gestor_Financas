import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { ServiceWorker } from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: { default: 'Gestor Financeiro', template: '%s · Gestor Financeiro' },
  description:
    'Controle de receitas, despesas, investimentos e faturas de cartão, feito para usar no celular.',
  applicationName: 'Gestor Financeiro',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Finanças',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover libera as safe areas do notch e da Dynamic Island.
  // Sem maximum-scale e sem user-scalable: bloquear zoom quebra acessibilidade.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0d14' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
