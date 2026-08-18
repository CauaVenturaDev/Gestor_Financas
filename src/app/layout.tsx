import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CORES, TEMAS, urlDoIcone } from '@/lib/aparencia'
import { aparenciaAtual } from '@/lib/aparencia.server'
import { ToastProvider } from '@/components/ui/Toast'
import { ServiceWorker } from '@/components/ServiceWorker'

export async function generateMetadata(): Promise<Metadata> {
  const a = await aparenciaAtual()
  const manifesto = `/manifest.webmanifest?marca=${a.icone}&tile=${a.tile}&cor=${a.cor}&tema=${a.tema}`

  return {
    title: { default: 'Gestor Financeiro', template: '%s · Gestor Financeiro' },
    description:
      'Controle de receitas, despesas, investimentos e faturas de cartão, feito para usar no celular.',
    applicationName: 'Gestor Financeiro',
    manifest: manifesto,
    appleWebApp: { capable: true, title: 'Finanças', statusBarStyle: 'black-translucent' },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: urlDoIcone(a, 32), sizes: '32x32', type: 'image/png' },
        { url: urlDoIcone(a, 192), sizes: '192x192', type: 'image/png' },
      ],
      // No iOS o ícone é gravado quando o app é adicionado à tela de início.
      // Trocar aqui só vale para a próxima vez que ele for adicionado.
      apple: [{ url: urlDoIcone(a, 180), sizes: '180x180' }],
    },
    robots: { index: false, follow: false },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const { tema } = await aparenciaAtual()

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
            { media: '(prefers-color-scheme: light)', color: TEMAS[1].fundo },
            { media: '(prefers-color-scheme: dark)', color: TEMAS[3].fundo },
          ]
        : (TEMAS.find((t) => t.id === tema)?.fundo ?? TEMAS[1].fundo),
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A aparência vem dos cookies e é aplicada no servidor: a página já nasce com
  // a cor certa, sem o lampejo branco de quem decide o tema depois, no navegador.
  const a = await aparenciaAtual()
  const cor = CORES.find((c) => c.id === a.cor) ?? CORES[0]

  return (
    <html
      lang="pt-BR"
      data-theme={a.tema === 'sistema' ? undefined : a.tema}
      data-fundo={a.fundo === 'chapado' ? undefined : a.fundo}
      // a cor de destaque entra como par claro/escuro; o CSS de cada tema
      // escolhe qual das duas usar
      style={
        {
          '--brand-l': cor.claro,
          '--brand-d': cor.escuro,
        } as React.CSSProperties
      }
    >
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
