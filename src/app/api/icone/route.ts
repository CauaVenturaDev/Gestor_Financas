import { type NextRequest } from 'next/server'
import { normalizarAparencia } from '@/lib/aparencia'
import { acharMarca } from '@/lib/icone-formas'
import { paletaDoTile } from '@/lib/icone-paleta'
import { hexParaRGB, renderizarIcone } from '@/lib/icone-render'

export const runtime = 'nodejs'

const TAMANHOS = [16, 32, 48, 60, 96, 120, 180, 192, 256, 512]

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams

  const a = normalizarAparencia({
    icone: q.get('marca') ?? undefined,
    tile: q.get('tile') ?? undefined,
    cor: q.get('cor') ?? undefined,
  })

  const pedido = Number(q.get('size') ?? 192)
  const tamanho = TAMANHOS.includes(pedido) ? pedido : 192
  const maskable = q.get('maskable') === '1'

  const hexes = paletaDoTile(a.cor, a.tile)
  const marca = acharMarca(a.icone)
  const paleta = {
    tile: hexParaRGB(hexes.tile),
    tileFim: hexes.tileFim ? hexParaRGB(hexes.tileFim) : null,
    marca: hexParaRGB(hexes.marca),
    marca2: hexParaRGB(hexes.marca2),
  }

  const png = renderizarIcone(marca, paleta, tamanho, maskable)

  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
