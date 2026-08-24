import { CORES, type CorId, type TileId } from '@/lib/aparencia'

export interface PaletaHex {
  tile: string
  tileFim: string | null
  marca: string
  marca2: string
}

const BRANCO = '#ffffff'
const QUASE_PRETO = '#101318'

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function hex(c: [number, number, number]): string {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

export function mistura(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return hex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/**
 * Cores do tile a partir da cor e do tratamento escolhidos. Vale para os dois
 * lados: a pré-visualização em SVG e o PNG que é instalado.
 */
export function paletaDoTile(corId: CorId, tile: TileId): PaletaHex {
  const cor = CORES.find((c) => c.id === corId) ?? CORES[0]
  const claro = cor.hexClaro
  const suave = cor.hexEscuro

  switch (tile) {
    case 'gradiente':
      return {
        tile: mistura(claro, BRANCO, 0.22),
        tileFim: mistura(claro, QUASE_PRETO, 0.22),
        marca: BRANCO,
        marca2: mistura(BRANCO, claro, 0.45),
      }
    case 'escuro':
      return {
        tile: QUASE_PRETO,
        tileFim: null,
        marca: suave,
        marca2: mistura(suave, QUASE_PRETO, 0.5),
      }
    case 'claro':
      return {
        tile: BRANCO,
        tileFim: null,
        marca: claro,
        marca2: mistura(claro, BRANCO, 0.55),
      }
    default:
      return {
        tile: claro,
        tileFim: null,
        marca: BRANCO,
        marca2: mistura(BRANCO, claro, 0.45),
      }
  }
}
