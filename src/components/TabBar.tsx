'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, Wallet } from 'lucide-react'

const ABAS = [
  { href: '/app/movimentacoes', rotulo: 'Movimentações', Icone: Wallet },
  { href: '/app/cartoes', rotulo: 'Faturas', Icone: CreditCard },
]

/** Duas abas fixas. No celular, barra inferior de 56px mais a safe area. */
export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 vidro pb-safe sm:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativo = pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium
                  transition-colors ${ativo ? 'text-brand' : 'text-faint active:text-muted'}`}
              >
                <Icone size={22} strokeWidth={ativo ? 2.4 : 1.9} />
                {rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** No desktop a navegação sobe para o topo. */
export function TopNav({ nome }: { nome?: string | null }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-surface/85 vidro sm:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        <Link href="/app/movimentacoes" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink">
            <Wallet size={16} />
          </span>
          Gestor Financeiro
        </Link>
        <nav aria-label="Navegação principal" className="flex gap-1">
          {ABAS.map(({ href, rotulo, Icone }) => {
            const ativo = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors
                  ${ativo ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-line/50'}`}
              >
                <Icone size={17} />
                {rotulo}
              </Link>
            )
          })}
        </nav>
        <Link
          href="/app/conta"
          className="ml-auto truncate rounded-xl px-3 py-2 text-sm text-muted hover:bg-line/50"
        >
          {nome || 'Conta'}
        </Link>
      </div>
    </header>
  )
}
