'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonthsToYm, currentYm, formatYmLong } from '@/lib/date'

/** Seletor de mês/ano com navegação por setas. Padrão: mês atual. */
export function MonthNav({ ym }: { ym: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const irPara = (novo: string) => {
    const p = new URLSearchParams(params.toString())
    if (novo === currentYm()) p.delete('mes')
    else p.set('mes', novo)
    router.push(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => irPara(addMonthsToYm(ym, -1))}
        aria-label="Mês anterior"
        className="toque rounded-xl text-muted active:bg-line/50"
      >
        <ChevronLeft size={22} />
      </button>

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => irPara(currentYm())}
          className="w-full truncate rounded-xl px-2 py-1.5 text-center text-[15px] font-semibold capitalize active:bg-line/40"
          title="Voltar para o mês atual"
        >
          {formatYmLong(ym)}
        </button>
        <input
          type="month"
          value={ym}
          onChange={(e) => e.target.value && irPara(e.target.value)}
          aria-label="Escolher mês"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <button
        type="button"
        onClick={() => irPara(addMonthsToYm(ym, 1))}
        aria-label="Próximo mês"
        className="toque rounded-xl text-muted active:bg-line/50"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  )
}
