'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { addMonthsToYm, currentYm, formatYmLong } from '@/lib/date'

/**
 * Seletor de mês com navegação por setas.
 *
 * As setas são Link, não botão: além de serem navegação de verdade, o Next
 * pré-carrega o mês vizinho assim que a seta entra na tela, então o toque
 * costuma usar o que já está em memória. E como trocar de mês muda só a query
 * string, o esqueleto de carregamento não aparece — por isso a própria seta
 * vira um giro enquanto o mês novo não chega. Sem isso o toque parece ignorado.
 */
export function MonthNav({ ym }: { ym: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const href = (novo: string) => {
    const p = new URLSearchParams(params.toString())
    if (novo === currentYm()) p.delete('mes')
    else p.set('mes', novo)
    return `${pathname}${p.size ? `?${p}` : ''}`
  }

  return (
    <div className="flex items-center gap-1">
      <Seta
        href={href(addMonthsToYm(ym, -1))}
        rotulo="Mês anterior"
        Icone={ChevronLeft}
      />

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => router.push(href(currentYm()), { scroll: false })}
          className="w-full truncate rounded-xl px-2 py-1.5 text-center text-[15px] font-semibold capitalize active:bg-line/40"
          title="Voltar para o mês atual"
        >
          {formatYmLong(ym)}
        </button>
        <input
          type="month"
          value={ym}
          onChange={(e) => e.target.value && router.push(href(e.target.value), { scroll: false })}
          aria-label="Escolher mês"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <Seta
        href={href(addMonthsToYm(ym, 1))}
        rotulo="Próximo mês"
        Icone={ChevronRight}
      />
    </div>
  )
}

function Seta({
  href,
  rotulo,
  Icone,
}: {
  href: string
  rotulo: string
  Icone: typeof ChevronLeft
}) {
  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      aria-label={rotulo}
      className="toque shrink-0 rounded-xl text-muted active:bg-line/50"
    >
      <Conteudo Icone={Icone} />
    </Link>
  )
}

/** useLinkStatus só funciona dentro do Link, daí o componente separado. */
function Conteudo({ Icone }: { Icone: typeof ChevronLeft }) {
  const { pending } = useLinkStatus()
  return pending ? (
    <Loader2 size={20} className="animate-spin text-brand" />
  ) : (
    <Icone size={22} />
  )
}
