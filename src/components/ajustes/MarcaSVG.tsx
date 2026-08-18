import { type Camada, acharMarca } from '@/lib/icone-formas'
import { paletaDoTile } from '@/lib/icone-paleta'
import type { CorId, TileId } from '@/lib/aparencia'

let seq = 0

/**
 * Pré-visualização da marca em SVG, a partir da mesma geometria que o PNG usa.
 * Instantânea: mudar a cor não custa uma ida ao servidor.
 */
export function MarcaSVG({
  marca: marcaId,
  tile,
  cor,
  tamanho = 48,
  raio = '22.5%',
}: {
  marca: string
  tile: TileId
  cor: CorId
  tamanho?: number
  raio?: string
}) {
  const marca = acharMarca(marcaId)
  const p = paletaDoTile(cor, tile)
  const id = `m${(seq = (seq + 1) % 100000)}-${marcaId}`

  const tinta = (c: Camada['c']) =>
    c === 'marca' ? p.marca : c === 'marca2' ? p.marca2 : p.tile

  const base = marca.camadas[0]

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      style={{ borderRadius: raio, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        {p.tileFim && (
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.tile} />
            <stop offset="100%" stopColor={p.tileFim} />
          </linearGradient>
        )}
        {/* camadas "sobre" só recolorem a silhueta da primeira camada */}
        <clipPath id={`${id}-c`}>{forma(base, 'clip')}</clipPath>
      </defs>

      <rect width="24" height="24" fill={p.tileFim ? `url(#${id}-g)` : p.tile} />

      {marca.camadas.map((camada, i) => (
        <g key={i} clipPath={camada.sobre ? `url(#${id}-c)` : undefined}>
          {forma(camada, tinta(camada.c))}
        </g>
      ))}
    </svg>
  )
}

function forma(c: Camada, fill: string) {
  const cor = fill === 'clip' ? undefined : fill

  if (c.t === 'circ') return <circle cx={c.cx} cy={c.cy} r={c.r} fill={cor} />
  if (c.t === 'rect') {
    return <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={c.r ?? 0} fill={cor} />
  }
  return <polygon points={c.p.map(([x, y]) => `${x},${y}`).join(' ')} fill={cor} />
}
