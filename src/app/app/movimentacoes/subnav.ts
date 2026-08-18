import type { ItemSubNav } from '@/components/SubNav'

export const SUBNAV_MOVIMENTACOES: ItemSubNav[] = [
  { href: '/app/movimentacoes', rotulo: 'Mês' },
  { href: '/app/movimentacoes/recorrentes', rotulo: 'Recorrentes' },
  { href: '/app/movimentacoes/categorias', rotulo: 'Categorias' },
  { href: '/app/movimentacoes/patrimonio', rotulo: 'Patrimônio' },
]

export const SUBNAV_CARTOES: ItemSubNav[] = [
  { href: '/app/cartoes', rotulo: 'Faturas' },
  { href: '/app/cartoes/projecao', rotulo: 'Projeção' },
  { href: '/app/cartoes/bancos', rotulo: 'Bancos' },
]
