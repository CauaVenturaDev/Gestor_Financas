import { type NextRequest } from 'next/server'
import { TEMAS, normalizarAparencia, urlDoIcone } from '@/lib/aparencia'

/**
 * O manifesto é dinâmico porque o ícone é escolhido pelo usuário. As escolhas
 * viajam na query em vez de cookie: o navegador busca o manifesto sem
 * credenciais por padrão, então cookie não chegaria aqui.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const a = normalizarAparencia({
    tema: q.get('tema') ?? undefined,
    cor: q.get('cor') ?? undefined,
    icone: q.get('marca') ?? undefined,
    tile: q.get('tile') ?? undefined,
  })

  const tema = TEMAS.find((t) => t.id === a.tema) ?? TEMAS[0]

  return Response.json(
    {
      name: 'Gestor Financeiro',
      short_name: 'Finanças',
      description: 'Controle de receitas, despesas, investimentos e faturas de cartão.',
      start_url: '/app/relatorio',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: tema.fundo,
      theme_color: tema.fundo,
      lang: 'pt-BR',
      dir: 'ltr',
      categories: ['finance', 'productivity'],
      icons: [
        { src: urlDoIcone(a, 192), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: urlDoIcone(a, 512), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: urlDoIcone(a, 512, true), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Relatório', url: '/app/relatorio' },
        { name: 'Lançamentos', url: '/app/movimentacoes' },
        { name: 'Faturas de cartão', url: '/app/cartoes' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
