'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import type { CategoryRow } from '@/lib/database.types'
import { SEM_CATEGORIA } from '@/lib/categories'

/**
 * O filtro recorta só a lista — os cards continuam refletindo o mês inteiro.
 * O estado vive na URL, então voltar e compartilhar link funcionam.
 */
export function Filtros({ categorias }: { categorias: CategoryRow[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const selecionadas = params.get('cat')?.split(',').filter(Boolean) ?? []
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState<string[]>(selecionadas)

  useEffect(() => setBusca(params.get('q') ?? ''), [params])

  const aplicar = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    router.replace(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false })
  }

  // busca com atraso: não dispara request a cada tecla
  useEffect(() => {
    const atual = params.get('q') ?? ''
    if (busca === atual) return
    const t = setTimeout(() => aplicar({ q: busca.trim() || null }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  // A categoria de sistema não vira chip por natureza: ela é a mesma ideia de
  // "sem categoria" repetida três vezes. Vira um chip único, no topo.
  const daNatureza = (n: CategoryRow['nature']) =>
    categorias.filter((c) => c.nature === n && !c.is_system)

  const porNatureza = {
    receita: daNatureza('receita'),
    despesa: daNatureza('despesa'),
    investimento: daNatureza('investimento'),
  }

  const alternar = (id: string) =>
    setRascunho((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar lançamento por nome"
          enterKeyHint="search"
          className="campo pl-9"
        />
      </div>

      <button
        type="button"
        onClick={() => { setRascunho(selecionadas); setAberto(true) }}
        aria-label="Filtrar por categoria"
        className={`toque shrink-0 rounded-xl border px-3 ${
          selecionadas.length
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-line bg-surface text-muted'
        }`}
      >
        <SlidersHorizontal size={18} />
        {selecionadas.length > 0 && (
          <span className="ml-1 text-sm font-semibold">{selecionadas.length}</span>
        )}
      </button>

      <Sheet
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Filtrar por categoria"
        rodape={
          <div className="flex gap-2">
            <Button
              variante="secundario"
              bloco
              onClick={() => { setRascunho([]); aplicar({ cat: null }); setAberto(false) }}
            >
              Limpar
            </Button>
            <Button
              bloco
              onClick={() => { aplicar({ cat: rascunho.join(',') || null }); setAberto(false) }}
            >
              Aplicar
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          <button
            type="button"
            onClick={() => alternar(SEM_CATEGORIA)}
            className={`toque w-full rounded-xl border px-3.5 text-sm ${
              rascunho.includes(SEM_CATEGORIA)
                ? 'border-brand bg-brand/10 font-medium text-brand'
                : 'border-line bg-surface text-muted'
            }`}
          >
            Sem categoria
            {rascunho.includes(SEM_CATEGORIA) && <X size={14} className="ml-1" />}
          </button>

          {(['receita', 'despesa', 'investimento'] as const).map((nat) =>
            porNatureza[nat].length === 0 ? null : (
              <div key={nat}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                  {nat === 'investimento' ? 'Investimento' : nat}
                </p>
                <div className="flex flex-wrap gap-2">
                  {porNatureza[nat].map((c) => {
                    const marcada = rascunho.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => alternar(c.id)}
                        className={`toque rounded-full border px-3 text-sm ${
                          marcada
                            ? 'border-brand bg-brand/10 font-medium text-brand'
                            : 'border-line bg-surface text-muted'
                        }`}
                      >
                        {c.name}
                        {marcada && <X size={14} className="ml-1" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      </Sheet>
    </div>
  )
}
