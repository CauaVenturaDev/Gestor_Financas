import type { ItemSubNav } from '@/components/SubNav'

/**
 * O relatório saiu da tela de lançamentos e virou aba própria: a página
 * inicial fica só com a lista e os filtros, e os números ganham espaço para
 * ter os próprios recortes.
 */
export const SUBNAV_MOVIMENTACOES: ItemSubNav[] = [
  { href: '/app/movimentacoes', rotulo: 'Lançamentos' },
  { href: '/app/movimentacoes/recorrentes', rotulo: 'Recorrentes' },
  { href: '/app/movimentacoes/categorias', rotulo: 'Categorias' },
]

export const SUBNAV_RELATORIO: ItemSubNav[] = [
  { href: '/app/relatorio', rotulo: 'Mês' },
  { href: '/app/relatorio/patrimonio', rotulo: 'Patrimônio' },
]

export const SUBNAV_CARTOES: ItemSubNav[] = [
  { href: '/app/cartoes', rotulo: 'Faturas' },
  { href: '/app/cartoes/projecao', rotulo: 'Projeção' },
  { href: '/app/cartoes/bancos', rotulo: 'Bancos' },
]
