import { deflateSync } from 'node:zlib'

/**
 * Codificador de PNG mínimo (RGB, 8 bits por canal, sem transparência).
 *
 * Existe para o app gerar o ícone escolhido na hora, em vez de guardar um
 * arquivo para cada combinação de marca, tile e cor — que seriam centenas.
 */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo: string, dados: Uint8Array): Uint8Array {
  const nome = new TextEncoder().encode(tipo)
  const corpo = new Uint8Array(nome.length + dados.length)
  corpo.set(nome, 0)
  corpo.set(dados, nome.length)

  const out = new Uint8Array(4 + corpo.length + 4)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, dados.length)
  out.set(corpo, 4)
  dv.setUint32(4 + corpo.length, crc32(corpo))
  return out
}

/** `pixels` em RGB, com largura * altura * 3 posições. */
export function encodePNG(largura: number, altura: number, pixels: Uint8Array): Uint8Array {
  const linha = largura * 3
  const bruto = new Uint8Array((linha + 1) * altura)
  for (let y = 0; y < altura; y++) {
    bruto[y * (linha + 1)] = 0 // filtro "none"
    bruto.set(pixels.subarray(y * linha, (y + 1) * linha), y * (linha + 1) + 1)
  }

  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, largura)
  dv.setUint32(4, altura)
  ihdr[8] = 8 // profundidade
  ihdr[9] = 2 // cor: RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const partes = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(bruto, { level: 9 }))),
    chunk('IEND', new Uint8Array(0)),
  ]

  const total = partes.reduce((s, p) => s + p.length, 0)
  const png = new Uint8Array(total)
  let off = 0
  for (const p of partes) {
    png.set(p, off)
    off += p.length
  }
  return png
}
