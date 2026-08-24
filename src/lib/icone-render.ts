import { type Camada, type Marca, dentro } from '@/lib/icone-formas'
import { encodePNG } from '@/lib/png'

type RGB = [number, number, number]

export interface Paleta {
  tile: RGB
  tileFim: RGB | null // gradiente; null = chapado
  marca: RGB
  marca2: RGB
}

const AMOSTRAS = 3 // 3x3 por pixel: suaviza a borda sem custo relevante

/**
 * Rasteriza a marca num quadrado opaco.
 *
 * `margem` controla quanto da arte fica longe da borda. O ícone maskable do
 * Android tem 20% de cada lado cortados no recorte circular, então lá a arte
 * precisa nascer menor.
 */
export function renderizarIcone(
  marca: Marca,
  paleta: Paleta,
  tamanho: number,
  maskable = false,
): Uint8Array {
  const px = new Uint8Array(tamanho * tamanho * 3)
  const escala = maskable ? 0.56 : 0.74 // fração do lado ocupada pela arte
  const arte = tamanho * escala
  const off = (tamanho - arte) / 2

  const camadas: Camada[] = marca.camadas

  for (let y = 0; y < tamanho; y++) {
    // gradiente do tile: interpolação vertical, calculada uma vez por linha
    const t = paleta.tileFim ? y / (tamanho - 1) : 0
    const fundo: RGB = paleta.tileFim
      ? [
          Math.round(paleta.tile[0] + (paleta.tileFim[0] - paleta.tile[0]) * t),
          Math.round(paleta.tile[1] + (paleta.tileFim[1] - paleta.tile[1]) * t),
          Math.round(paleta.tile[2] + (paleta.tileFim[2] - paleta.tile[2]) * t),
        ]
      : paleta.tile

    for (let x = 0; x < tamanho; x++) {
      let r = 0
      let g = 0
      let b = 0

      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const ax = ((x + (sx + 0.5) / AMOSTRAS - off) / arte) * 24
          const ay = ((y + (sy + 0.5) / AMOSTRAS - off) / arte) * 24

          // pintura em ordem, uma camada sobre a outra
          let cor: RGB = fundo
          let pintado = false
          if (ax >= 0 && ax <= 24 && ay >= 0 && ay <= 24) {
            for (const camada of camadas) {
              if (!dentro(camada, ax, ay)) continue
              if (camada.sobre && !pintado) continue // recolorir não pinta o fundo
              if (camada.c === 'tile') {
                cor = fundo
                pintado = false
              } else {
                cor = camada.c === 'marca' ? paleta.marca : paleta.marca2
                pintado = true
              }
            }
          }

          r += cor[0]
          g += cor[1]
          b += cor[2]
        }
      }

      const n = AMOSTRAS * AMOSTRAS
      const i = (y * tamanho + x) * 3
      px[i] = Math.round(r / n)
      px[i + 1] = Math.round(g / n)
      px[i + 2] = Math.round(b / n)
    }
  }

  return encodePNG(tamanho, tamanho, px)
}

export function hexParaRGB(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}
