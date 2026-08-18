'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface ItemSubNav {
  href: string
  rotulo: string
}

/** Subtelas de cada aba: seletor no topo, rolável na horizontal no celular. */
export function SubNav({ itens }: { itens: ItemSubNav[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Subtelas" className="sem-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1.5 pb-1">
        {itens.map(({ href, rotulo }) => {
          const ativo = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`toque whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors
                  ${ativo ? 'bg-ink text-bg' : 'border border-line bg-surface text-muted active:bg-line/40'}`}
              >
                {rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
