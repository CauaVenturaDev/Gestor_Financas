import { MARCAS } from '@/lib/icone-formas'

/* ------------------------------------------------------------------ temas -- */

export const TEMAS = [
  { id: 'sistema', nome: 'Sistema', descricao: 'Acompanha o aparelho', familia: 'auto', fundo: '#f7f8fa', escuro: null },
  { id: 'claro', nome: 'Claro', descricao: 'Branco frio, contraste alto', familia: 'claro', fundo: '#f7f8fa', escuro: false },
  { id: 'cinza', nome: 'Cinza', descricao: 'Contraste menor, para uso longo', familia: 'claro', fundo: '#ebeef3', escuro: false },
  { id: 'escuro', nome: 'Escuro', descricao: 'Escuro azulado', familia: 'escuro', fundo: '#0a0d14', escuro: true },
  { id: 'grafite', nome: 'Grafite', descricao: 'Escuro neutro, sem viés azul', familia: 'escuro', fundo: '#121213', escuro: true },
  { id: 'oled', nome: 'Preto puro', descricao: 'Economiza bateria em tela OLED', familia: 'escuro', fundo: '#000000', escuro: true },
  { id: 'indigo', nome: 'Índigo', descricao: 'Noturno de fundo azul profundo', familia: 'escuro', fundo: '#0d0e1e', escuro: true },
] as const

export type TemaId = (typeof TEMAS)[number]['id']
export const TEMA_PADRAO: TemaId = 'sistema'

/* ------------------------------------------------------------------- cor --- */
/*
 * Cada cor tem um par: a versão para fundo claro e a para fundo escuro. A mesma
 * tinta em fundos opostos precisa de luminosidade diferente para continuar
 * legível — usar uma só é o caminho curto para botão que some no escuro.
 */

export const CORES = [
  { id: 'azul',      nome: 'Azul',      claro: '37 78 210',   escuro: '116 152 255', hexClaro: '#254ed2', hexEscuro: '#7498ff' },
  { id: 'indigo',    nome: 'Índigo',    claro: '67 56 202',   escuro: '145 140 255', hexClaro: '#4338ca', hexEscuro: '#918cff' },
  { id: 'violeta',   nome: 'Violeta',   claro: '109 40 217',  escuro: '176 141 255', hexClaro: '#6d28d9', hexEscuro: '#b08dff' },
  { id: 'rosa',      nome: 'Rosa',      claro: '190 24 93',   escuro: '255 126 178', hexClaro: '#be185d', hexEscuro: '#ff7eb2' },
  { id: 'vermelho',  nome: 'Vermelho',  claro: '185 40 45',   escuro: '255 122 118', hexClaro: '#b9282d', hexEscuro: '#ff7a76' },
  { id: 'laranja',   nome: 'Laranja',   claro: '180 70 12',   escuro: '251 152 66',  hexClaro: '#b4460c', hexEscuro: '#fb9842' },
  { id: 'ambar',     nome: 'Âmbar',     claro: '154 92 6',    escuro: '240 186 62',  hexClaro: '#9a5c06', hexEscuro: '#f0ba3e' },
  { id: 'verde',     nome: 'Verde',     claro: '21 122 58',   escuro: '74 205 130',  hexClaro: '#157a3a', hexEscuro: '#4acd82' },
  { id: 'esmeralda', nome: 'Esmeralda', claro: '4 116 84',    escuro: '52 211 153',  hexClaro: '#047454', hexEscuro: '#34d399' },
  { id: 'teal',      nome: 'Turquesa',  claro: '13 114 124',  escuro: '45 200 214',  hexClaro: '#0d727c', hexEscuro: '#2dc8d6' },
  { id: 'grafite',   nome: 'Grafite',   claro: '55 65 81',    escuro: '176 186 202', hexClaro: '#374151', hexEscuro: '#b0baca' },
] as const

export type CorId = (typeof CORES)[number]['id']
export const COR_PADRAO: CorId = 'azul'

/* ----------------------------------------------------------------- fundo --- */

export const FUNDOS = [
  { id: 'chapado',   nome: 'Chapado',    descricao: 'Nada compete com o número' },
  { id: 'gradiente', nome: 'Gradiente',  descricao: 'Véu da cor descendo do topo' },
  { id: 'brilho',    nome: 'Brilho',     descricao: 'Halo saindo de trás do cabeçalho' },
  { id: 'pontos',    nome: 'Pontos',     descricao: 'Textura de papel milimetrado' },
  { id: 'linhas',    nome: 'Linhas',     descricao: 'Pauta horizontal discreta' },
  { id: 'grao',      nome: 'Grão',       descricao: 'Ruído fino, tira o aspecto de chapa' },
] as const

export type FundoId = (typeof FUNDOS)[number]['id']
export const FUNDO_PADRAO: FundoId = 'chapado'

/* ------------------------------------------------------------------ tile --- */

export const TILES = [
  { id: 'chapado',   nome: 'Chapado',   descricao: 'A cor escolhida, sólida' },
  { id: 'gradiente', nome: 'Gradiente', descricao: 'Da cor clara para a escura' },
  { id: 'escuro',    nome: 'Escuro',    descricao: 'Fundo quase preto, marca colorida' },
  { id: 'claro',     nome: 'Claro',     descricao: 'Fundo branco, marca colorida' },
] as const

export type TileId = (typeof TILES)[number]['id']
export const TILE_PADRAO: TileId = 'gradiente'

export { MARCAS }
export type { Marca } from '@/lib/icone-formas'
export const MARCA_PADRAO_ID = 'carteira'

/* ------------------------------------------------------------- prontos --- */
/*
 * Combinações fechadas de marca, tile e cor. Escolher as três peças separadas dá
 * liberdade, mas quase ninguém quer montar um ícone — quer escolher um.
 */

export const ICONES_PRONTOS = [
  { id: 'classico',  nome: 'Clássico',   icone: 'carteira',   tile: 'chapado',   cor: 'azul' },
  { id: 'noturno',   nome: 'Noturno',    icone: 'monograma',  tile: 'escuro',    cor: 'azul' },
  { id: 'safira',    nome: 'Safira',     icone: 'monograma',  tile: 'gradiente', cor: 'indigo' },
  { id: 'ametista',  nome: 'Ametista',   icone: 'losango',    tile: 'gradiente', cor: 'violeta' },
  { id: 'mata',      nome: 'Mata',       icone: 'barras',     tile: 'gradiente', cor: 'esmeralda' },
  { id: 'brasa',     nome: 'Brasa',      icone: 'fluxo',      tile: 'gradiente', cor: 'laranja' },
  { id: 'ouro',      nome: 'Ouro',       icone: 'moeda',      tile: 'chapado',   cor: 'ambar' },
  { id: 'mare',      nome: 'Maré',       icone: 'anel',       tile: 'gradiente', cor: 'teal' },
  { id: 'papel',     nome: 'Papel',      icone: 'cofre',      tile: 'claro',     cor: 'grafite' },
  { id: 'rubi',      nome: 'Rubi',       icone: 'alvo',       tile: 'gradiente', cor: 'rosa' },
  { id: 'poupanca',  nome: 'Poupança',   icone: 'porquinho',  tile: 'chapado',   cor: 'rosa' },
  { id: 'tinta',     nome: 'Tinta',      icone: 'barras',     tile: 'escuro',    cor: 'verde' },
] as const satisfies readonly {
  id: string
  nome: string
  icone: string
  tile: TileId
  cor: CorId
}[]

/* --------------------------------------------------------------- cookies --- */

export const COOKIES = {
  tema: 'gf-tema',
  cor: 'gf-cor',
  fundo: 'gf-fundo',
  icone: 'gf-icone',
  tile: 'gf-tile',
} as const

export interface Aparencia {
  tema: TemaId
  cor: CorId
  fundo: FundoId
  icone: string
  tile: TileId
}

export const APARENCIA_PADRAO: Aparencia = {
  tema: TEMA_PADRAO,
  cor: COR_PADRAO,
  fundo: FUNDO_PADRAO,
  icone: MARCA_PADRAO_ID,
  tile: TILE_PADRAO,
}

const valida = <T extends string>(lista: readonly { id: T }[], v: unknown, padrao: T): T =>
  lista.some((i) => i.id === v) ? (v as T) : padrao

export function normalizarAparencia(bruto: Partial<Record<keyof Aparencia, string | undefined>>): Aparencia {
  return {
    tema: valida(TEMAS, bruto.tema, TEMA_PADRAO),
    cor: valida(CORES, bruto.cor, COR_PADRAO),
    fundo: valida(FUNDOS, bruto.fundo, FUNDO_PADRAO),
    icone: valida(MARCAS, bruto.icone, MARCA_PADRAO_ID),
    tile: valida(TILES, bruto.tile, TILE_PADRAO),
  }
}

/** Um tema escuro precisa da versão clara da cor, e vice-versa. */
export function corDoTema(cor: CorId, tema: TemaId, preferEscuro = false): string {
  const t = TEMAS.find((x) => x.id === tema)
  const escuro = t?.escuro ?? preferEscuro
  const c = CORES.find((x) => x.id === cor) ?? CORES[0]
  return escuro ? c.hexEscuro : c.hexClaro
}

/** URL do PNG do ícone, gerado sob demanda a partir das escolhas. */
export function urlDoIcone(a: Aparencia, size: number, maskable = false): string {
  const p = new URLSearchParams({
    marca: a.icone,
    tile: a.tile,
    cor: a.cor,
    size: String(size),
  })
  if (maskable) p.set('maskable', '1')
  return `/api/icone?${p}`
}
