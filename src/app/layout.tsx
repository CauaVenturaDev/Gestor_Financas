import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { COOKIE_TEMA, COR_DE_FUNDO, TEMA_PADRAO, ehTemaValido } from '@/lib/theme'
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

async function temaEscolhido() {
  const cookie = (await cookies()).get(COOKIE_TEMA)?.value
  return ehTemaValido(cookie) ? cookie : TEMA_PADRAO
}

export async function generateViewport(): Promise<Viewport> {
  const tema = await temaEscolhido()

  return {
    width: 'device-width',
    initialScale: 1,
    // viewport-fit=cover libera as safe areas do notch e da Dynamic Island.
    // Sem maximum-scale e sem user-scalable: bloquear zoom quebra acessibilidade.
    viewportFit: 'cover',
    // Com tema escolhido, a barra de status do iOS segue a cor dele; em
    // "sistema", segue o aparelho.
    themeColor:
      tema === 'sistema'
        ? [
            { media: '(prefers-color-scheme: light)', color: COR_DE_FUNDO.claro },
            { media: '(prefers-color-scheme: dark)', color: COR_DE_FUNDO.escuro },
          ]
        : COR_DE_FUNDO[tema],
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // O tema vem do cookie e é aplicado no servidor: a página já nasce com a cor
  // certa, sem o lampejo branco de quem decide o tema depois, no navegador.
  const tema = await temaEscolhido()

  return (
    <html lang="pt-BR" data-theme={tema === 'sistema' ? undefined : tema}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
