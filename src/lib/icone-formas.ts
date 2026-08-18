/**
 * Geometria das marcas, num espaço de 24 x 24.
 *
 * A mesma definição serve para dois consumidores: a pré-visualização em SVG na
 * tela de aparência e o rasterizador que gera os PNG do PWA. Descrever a forma
 * uma vez só é o que garante que o ícone escolhido é o ícone instalado.
 *
 * As camadas são pintadas na ordem da lista, uma por cima da outra.
 */

export type Tinta = 'marca' | 'marca2' | 'tile'

/**
 * `sobre` marca uma camada que só recolore o que já foi pintado — é como se
 * pintar por cima da silhueta da primeira camada, sem vazar para o fundo. É o
 * que permite um anel de duas cores sem precisar descrever arcos.
 */
interface Base {
  c: Tinta
  sobre?: true
}

export type Camada =
  | (Base & { t: 'circ'; cx: number; cy: number; r: number })
  | (Base & { t: 'rect'; x: number; y: number; w: number; h: number; r?: number })
  | (Base & { t: 'poly'; p: [number, number][] })

export interface Marca {
  id: string
  nome: string
  descricao: string
  camadas: Camada[]
}

export const MARCAS: Marca[] = [
  {
    id: 'carteira',
    nome: 'Carteira',
    descricao: 'Literal e entendido na hora',
    camadas: [
      { t: 'poly', p: [[3.6, 8.6], [12, 3.7], [20.4, 8.6]], c: 'marca' },
      { t: 'rect', x: 3, y: 8, w: 18, h: 12.4, r: 3.2, c: 'marca' },
      { t: 'circ', cx: 16.6, cy: 14.2, r: 1.75, c: 'tile' },
    ],
  },
  {
    id: 'monograma',
    nome: 'Monograma G',
    descricao: 'Abstrato: ninguém mais vai ter igual',
    camadas: [
      { t: 'circ', cx: 12, cy: 12, r: 9.2, c: 'marca' },
      { t: 'circ', cx: 12, cy: 12, r: 5, c: 'tile' },
      { t: 'rect', x: 12, y: 9.6, w: 10.4, h: 4.8, c: 'tile' },
      { t: 'rect', x: 12.4, y: 10.5, w: 7.4, h: 3, r: 1.5, c: 'marca' },
    ],
  },
  {
    id: 'anel',
    nome: 'Anel',
    descricao: 'Proporção: como o dinheiro se divide',
    camadas: [
      { t: 'circ', cx: 12, cy: 12, r: 9.2, c: 'marca' },
      { t: 'rect', x: 0, y: 0, w: 12, h: 24, c: 'marca2', sobre: true },
      { t: 'circ', cx: 12, cy: 12, r: 4.6, c: 'tile' },
    ],
  },
  {
    id: 'barras',
    nome: 'Barras',
    descricao: 'A silhueta mais legível em tamanho pequeno',
    camadas: [
      { t: 'rect', x: 3.4, y: 13, w: 4.6, h: 7.6, r: 1.5, c: 'marca2' },
      { t: 'rect', x: 9.7, y: 9, w: 4.6, h: 11.6, r: 1.5, c: 'marca' },
      { t: 'rect', x: 16, y: 4.4, w: 4.6, h: 16.2, r: 1.5, c: 'marca' },
    ],
  },
  {
    id: 'fluxo',
    nome: 'Fluxo',
    descricao: 'O que entra e o que sai',
    camadas: [
      { t: 'rect', x: 5.6, y: 8.4, w: 3.2, h: 11.4, r: 1.4, c: 'marca' },
      { t: 'poly', p: [[3, 10.4], [7.2, 3.9], [11.4, 10.4]], c: 'marca' },
      { t: 'rect', x: 15.2, y: 4.2, w: 3.2, h: 11.4, r: 1.4, c: 'marca2' },
      { t: 'poly', p: [[12.6, 13.6], [16.8, 20.1], [21, 13.6]], c: 'marca2' },
    ],
  },
  {
    id: 'moeda',
    nome: 'Moeda',
    descricao: 'Dinheiro sem rodeio',
    camadas: [
      { t: 'circ', cx: 12, cy: 12, r: 9.2, c: 'marca' },
      { t: 'circ', cx: 12, cy: 12, r: 6.8, c: 'marca2' },
      { t: 'rect', x: 10.8, y: 7.2, w: 2.4, h: 9.6, r: 1.2, c: 'tile' },
    ],
  },
  {
    id: 'cofre',
    nome: 'Cofre',
    descricao: 'Guardado e trancado',
    camadas: [
      { t: 'rect', x: 3.2, y: 4, w: 17.6, h: 15.4, r: 3, c: 'marca' },
      { t: 'circ', cx: 12, cy: 11.7, r: 4.4, c: 'tile' },
      { t: 'circ', cx: 12, cy: 11.7, r: 1.7, c: 'marca' },
      { t: 'rect', x: 6.2, y: 19, w: 2.8, h: 2.6, r: 0.9, c: 'marca' },
      { t: 'rect', x: 15, y: 19, w: 2.8, h: 2.6, r: 0.9, c: 'marca' },
    ],
  },
  {
    id: 'alvo',
    nome: 'Alvo',
    descricao: 'Meta e acompanhamento',
    camadas: [
      { t: 'circ', cx: 12, cy: 12, r: 9.2, c: 'marca' },
      { t: 'circ', cx: 12, cy: 12, r: 6.4, c: 'tile' },
      { t: 'circ', cx: 12, cy: 12, r: 3.2, c: 'marca' },
    ],
  },
  {
    id: 'losango',
    nome: 'Losango',
    descricao: 'Marca geométrica, sem tema',
    camadas: [
      { t: 'poly', p: [[12, 2.4], [21.6, 12], [12, 21.6], [2.4, 12]], c: 'marca' },
      { t: 'rect', x: 0, y: 0, w: 24, h: 12, c: 'marca2', sobre: true },
      { t: 'poly', p: [[12, 7.4], [16.6, 12], [12, 16.6], [7.4, 12]], c: 'tile' },
    ],
  },
  {
    id: 'porquinho',
    nome: 'Porquinho',
    descricao: 'Poupança, sem cerimônia',
    camadas: [
      { t: 'circ', cx: 11.6, cy: 13.2, r: 7.4, c: 'marca' },
      { t: 'poly', p: [[5.8, 7.8], [10.6, 6], [8.8, 10.8]], c: 'marca' },
      { t: 'rect', x: 8.8, y: 9.4, w: 5.4, h: 1.9, r: 0.95, c: 'tile' },
      { t: 'rect', x: 7.4, y: 18.6, w: 2.6, h: 2.8, r: 0.9, c: 'marca' },
      { t: 'rect', x: 13.4, y: 18.6, w: 2.6, h: 2.8, r: 0.9, c: 'marca' },
      { t: 'circ', cx: 16.2, cy: 12.2, r: 0.95, c: 'tile' },
    ],
  },
]

export const MARCA_PADRAO = 'carteira'

export function acharMarca(id: string | undefined | null): Marca {
  return MARCAS.find((m) => m.id === id) ?? MARCAS.find((m) => m.id === MARCA_PADRAO)!
}

/** Testa se um ponto está dentro da camada. Usado pelo rasterizador. */
export function dentro(camada: Camada, x: number, y: number): boolean {
  if (camada.t === 'circ') {
    const dx = x - camada.cx
    const dy = y - camada.cy
    return dx * dx + dy * dy <= camada.r * camada.r
  }

  if (camada.t === 'rect') {
    const { x: rx, y: ry, w, h } = camada
    const r = Math.min(camada.r ?? 0, w / 2, h / 2)
    if (x < rx || x > rx + w || y < ry || y > ry + h) return false
    if (r <= 0) return true
    // fora dos cantos arredondados
    const cx = Math.min(Math.max(x, rx + r), rx + w - r)
    const cy = Math.min(Math.max(y, ry + r), ry + h - r)
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= r * r
  }

  // polígono: número de cruzamentos
  const p = camada.p
  let dentroPoly = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]
    const [xj, yj] = p[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentroPoly = !dentroPoly
    }
  }
  return dentroPoly
}
