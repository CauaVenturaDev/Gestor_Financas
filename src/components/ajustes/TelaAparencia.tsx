'use client'

import { useState, useTransition } from 'react'
import { Check, Info } from 'lucide-react'
import {
  type Aparencia, CORES, type CorId, FUNDOS, type FundoId, ICONES_PRONTOS,
  MARCAS, TEMAS, type TemaId, TILES, type TileId,
} from '@/lib/aparencia'
import { MarcaSVG } from '@/components/ajustes/MarcaSVG'
import { setAparencia } from '@/server/actions/preferences'

const GRUPOS_TEMA = [
  { familia: 'auto', titulo: 'Automático' },
  { familia: 'claro', titulo: 'Claros' },
  { familia: 'escuro', titulo: 'Escuros' },
] as const

export function TelaAparencia({ inicial }: { inicial: Aparencia }) {
  const [a, setA] = useState<Aparencia>(inicial)
  const [, iniciar] = useTransition()

  /**
   * Aplica no documento antes de gravar: o toque tem resposta imediata mesmo
   * com rede ruim, e o cookie só alinha o que o servidor vai renderizar depois.
   */
  const aplicar = (patch: Partial<Aparencia>) => {
    const novo = { ...a, ...patch }
    setA(novo)

    const raiz = document.documentElement
    if (patch.tema !== undefined) {
      if (novo.tema === 'sistema') raiz.removeAttribute('data-theme')
      else raiz.setAttribute('data-theme', novo.tema)

      const fundoTema = TEMAS.find((t) => t.id === novo.tema)?.fundo
      if (fundoTema && novo.tema !== 'sistema') {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fundoTema)
      }
    }
    if (patch.fundo !== undefined) {
      if (novo.fundo === 'chapado') raiz.removeAttribute('data-fundo')
      else raiz.setAttribute('data-fundo', novo.fundo)
    }
    if (patch.cor !== undefined) {
      const c = CORES.find((x) => x.id === novo.cor) ?? CORES[0]
      raiz.style.setProperty('--brand-l', c.claro)
      raiz.style.setProperty('--brand-d', c.escuro)
    }

    iniciar(() => {
      void setAparencia(patch)
    })
  }

  return (
    <div className="space-y-8 pb-4">
      {/* ---------------------------------------------------------- ícone -- */}
      <section>
        <Titulo>Ícone</Titulo>
        <Ajuda>
          No iPhone, o ícone é gravado no momento em que você adiciona o app à tela de início.
          Trocar aqui vale para a próxima vez que adicionar — para atualizar agora, remova o
          atalho e adicione de novo. Na aba do navegador a troca aparece ao recarregar.
        </Ajuda>

        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-faint">
          Prontos
        </h3>
        <div className="sem-scrollbar -mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2.5">
            {ICONES_PRONTOS.map((p) => {
              const ativo = a.icone === p.icone && a.tile === p.tile && a.cor === p.cor
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => aplicar({ icone: p.icone, tile: p.tile, cor: p.cor })}
                  className={`flex w-[86px] shrink-0 flex-col items-center gap-2 rounded-2xl border p-2.5 transition-colors ${
                    ativo ? 'border-brand bg-brand/10' : 'border-line'
                  }`}
                >
                  <MarcaSVG marca={p.icone} tile={p.tile} cor={p.cor} tamanho={54} />
                  <span
                    className={`w-full truncate text-center text-xs font-medium ${
                      ativo ? 'text-brand' : 'text-muted'
                    }`}
                  >
                    {p.nome}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-faint">
          Ou monte o seu — marca
        </h3>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {MARCAS.map((m) => (
            <Quadro
              key={m.id}
              ativo={a.icone === m.id}
              rotulo={m.nome}
              onClick={() => aplicar({ icone: m.id })}
            >
              <MarcaSVG marca={m.id} tile={a.tile} cor={a.cor} tamanho={44} />
            </Quadro>
          ))}
        </div>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-faint">
          Fundo do ícone
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {TILES.map((t) => (
            <Quadro
              key={t.id}
              ativo={a.tile === t.id}
              rotulo={t.nome}
              onClick={() => aplicar({ tile: t.id as TileId })}
            >
              <MarcaSVG marca={a.icone} tile={t.id as TileId} cor={a.cor} tamanho={44} />
            </Quadro>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ cor -- */}
      <section>
        <Titulo>Cor do app</Titulo>
        <p className="mb-3 text-sm text-muted">
          Vale para botões, aba ativa, links e para o fundo das telas quando ele tem cor.
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {CORES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={a.cor === c.id}
              onClick={() => aplicar({ cor: c.id as CorId })}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                a.cor === c.id ? 'border-brand bg-brand/10' : 'border-line'
              }`}
            >
              <span
                className="relative grid h-9 w-9 place-items-center rounded-full"
                style={{ background: c.hexClaro }}
              >
                <span
                  className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-surface"
                  style={{ background: c.hexEscuro }}
                />
                {a.cor === c.id && <Check size={16} className="text-white" strokeWidth={3} />}
              </span>
              <span
                className={`w-full truncate text-center text-[11px] font-medium ${
                  a.cor === c.id ? 'text-brand' : 'text-muted'
                }`}
              >
                {c.nome}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- tema -- */}
      <section>
        <Titulo>Tema</Titulo>
        <div className="space-y-4">
          {GRUPOS_TEMA.map((g) => (
            <div key={g.familia}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                {g.titulo}
              </h3>
              <ul className="card divide-y divide-line overflow-hidden">
                {TEMAS.filter((t) => t.familia === g.familia).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={a.tema === t.id}
                      onClick={() => aplicar({ tema: t.id as TemaId })}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
                    >
                      <span
                        aria-hidden="true"
                        className="h-10 w-10 shrink-0 rounded-xl border border-line"
                        style={{ background: t.fundo }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.nome}</span>
                        <span className="block text-sm text-muted">{t.descricao}</span>
                      </span>
                      {a.tema === t.id && <Check size={20} className="shrink-0 text-brand" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- fundo -- */}
      <section>
        <Titulo>Fundo das telas</Titulo>
        <p className="mb-3 text-sm text-muted">
          A textura usa a cor escolhida acima e se adapta a qualquer tema.
        </p>
        <ul className="card divide-y divide-line overflow-hidden">
          {FUNDOS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                aria-pressed={a.fundo === f.id}
                onClick={() => aplicar({ fundo: f.id as FundoId })}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
              >
                <span
                  aria-hidden="true"
                  data-amostra={f.id}
                  className="h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-bg"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{f.nome}</span>
                  <span className="block text-sm text-muted">{f.descricao}</span>
                </span>
                {a.fundo === f.id && <Check size={20} className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
        {a.fundo === 'brilho' && a.tema === 'oled' && (
          <p className="mt-2 rounded-xl border border-alerta/30 bg-alerta/10 px-3.5 py-2.5 text-sm text-alerta">
            O brilho acende o fundo e joga fora a economia de bateria do Preto puro. Os dois
            juntos funcionam, mas um anula o motivo do outro existir.
          </p>
        )}
      </section>
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-[17px] font-semibold">{children}</h2>
}

function Ajuda({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-muted">
      <Info size={17} className="mt-0.5 shrink-0 text-faint" />
      <span>{children}</span>
    </p>
  )
}

function Quadro({
  ativo, rotulo, onClick, children,
}: {
  ativo: boolean
  rotulo: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={rotulo}
      onClick={onClick}
      title={rotulo}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-1.5 transition-colors ${
        ativo ? 'border-brand bg-brand/10' : 'border-line'
      }`}
    >
      {children}
      <span
        className={`w-full truncate text-center text-[10.5px] font-medium ${
          ativo ? 'text-brand' : 'text-muted'
        }`}
      >
        {rotulo}
      </span>
    </button>
  )
}
