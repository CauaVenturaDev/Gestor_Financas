/**
 * Temas do app. "sistema" é a ausência do atributo data-theme: quem manda é o
 * prefers-color-scheme do aparelho. Qualquer outro valor vence o sistema.
 */
export const TEMAS = [
  {
    id: 'sistema',
    nome: 'Sistema',
    descricao: 'Acompanha o modo claro ou escuro do aparelho',
    familia: 'auto',
    amostra: ['#f7f8fa', '#0a0d14', '#254ed2'],
  },
  {
    id: 'claro',
    nome: 'Claro',
    descricao: 'Branco frio, contraste alto',
    familia: 'claro',
    amostra: ['#f7f8fa', '#ffffff', '#254ed2'],
  },
  {
    id: 'cinza',
    nome: 'Cinza',
    descricao: 'Claro de contraste menor, mais suave para uso longo',
    familia: 'claro',
    amostra: ['#ebeef3', '#fdfdff', '#2047c3'],
  },
  {
    id: 'escuro',
    nome: 'Escuro',
    descricao: 'Escuro azulado, o padrão do app',
    familia: 'escuro',
    amostra: ['#0a0d14', '#141923', '#7498ff'],
  },
  {
    id: 'grafite',
    nome: 'Grafite',
    descricao: 'Escuro neutro, sem o viés azul',
    familia: 'escuro',
    amostra: ['#121213', '#1d1d1f', '#8da7ff'],
  },
  {
    id: 'oled',
    nome: 'Preto puro',
    descricao: 'Fundo preto de verdade: economiza bateria em tela OLED',
    familia: 'escuro',
    amostra: ['#000000', '#0c0c0e', '#7c9eff'],
  },
  {
    id: 'indigo',
    nome: 'Índigo',
    descricao: 'Noturno de fundo azul profundo',
    familia: 'escuro',
    amostra: ['#0d0e1e', '#181a30', '#8fa3ff'],
  },
] as const

export type TemaId = (typeof TEMAS)[number]['id']

export const TEMA_PADRAO: TemaId = 'sistema'
export const COOKIE_TEMA = 'gf-tema'

export function ehTemaValido(valor: string | undefined | null): valor is TemaId {
  return Boolean(valor) && TEMAS.some((t) => t.id === valor)
}

/** Cor da barra de status do iOS em standalone, por tema. */
export const COR_DE_FUNDO: Record<TemaId, string> = {
  sistema: '#f7f8fa',
  claro: '#f7f8fa',
  cinza: '#ebeef3',
  escuro: '#0a0d14',
  grafite: '#121213',
  oled: '#000000',
  indigo: '#0d0e1e',
}
