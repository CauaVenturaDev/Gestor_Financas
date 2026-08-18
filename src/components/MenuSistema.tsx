'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, ChevronRight, LogOut, MoreVertical, Palette, UserRound,
} from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { COR_DE_FUNDO, TEMAS, type TemaId } from '@/lib/theme'
import { setTheme } from '@/server/actions/preferences'
import { signOutAction } from '@/server/actions/auth'

const ATALHOS = [
  { href: '/app/ajustes/conta', rotulo: 'Conta', descricao: 'Nome, senha e exclusão', Icone: UserRound },
  { href: '/app/ajustes/aparencia', rotulo: 'Aparência', descricao: 'Tema do app', Icone: Palette },
  { href: '/app/ajustes/notificacoes', rotulo: 'Notificações', descricao: 'Avisos por e-mail', Icone: Bell },
]

/**
 * Menu do sistema, no canto do cabeçalho. Traz o troca-tema inteiro aqui dentro
 * porque é o ajuste que mais se mexe; o resto leva para a tela de ajustes.
 */
export function MenuSistema({ tema }: { tema: TemaId }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [escolhido, setEscolhido] = useState<TemaId>(tema)
  const [saindo, iniciarSaida] = useTransition()
  const [, iniciarTema] = useTransition()

  const aplicarTema = (id: TemaId) => {
    setEscolhido(id)
    const raiz = document.documentElement
    if (id === 'sistema') raiz.removeAttribute('data-theme')
    else raiz.setAttribute('data-theme', id)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DE_FUNDO[id])
    iniciarTema(() => {
      void setTheme(id)
    })
  }

  const ir = (href: string) => {
    setAberto(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Ajustes do app"
        className="toque shrink-0 rounded-full text-muted active:bg-line/50"
      >
        <MoreVertical size={20} />
      </button>

      <Sheet aberto={aberto} aoFechar={() => setAberto(false)} titulo="Ajustes">
        <div className="space-y-5 pb-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
              Tema
            </h3>
            <div className="sem-scrollbar -mx-5 overflow-x-auto px-5">
              <div className="flex w-max gap-2">
                {TEMAS.map((t) => {
                  const ativo = escolhido === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => aplicarTema(t.id)}
                      aria-pressed={ativo}
                      className={`flex w-[84px] flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                        ativo ? 'border-brand bg-brand/10' : 'border-line'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-full overflow-hidden rounded-lg border border-line"
                      >
                        {t.amostra.map((cor, i) => (
                          <span key={i} className="flex-1" style={{ background: cor }} />
                        ))}
                      </span>
                      <span
                        className={`w-full truncate text-center text-xs font-medium ${
                          ativo ? 'text-brand' : 'text-muted'
                        }`}
                      >
                        {t.nome}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="card divide-y divide-line overflow-hidden">
            {ATALHOS.map(({ href, rotulo, descricao, Icone }) => (
              <button
                key={href}
                type="button"
                onClick={() => ir(href)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
              >
                <Icone size={19} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{rotulo}</span>
                  <span className="block text-sm text-muted">{descricao}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-faint" />
              </button>
            ))}
          </section>

          <button
            type="button"
            disabled={saindo}
            onClick={() => iniciarSaida(() => signOutAction())}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left font-medium active:bg-line/40 disabled:opacity-50"
          >
            <LogOut size={19} className="text-muted" />
            Sair e trocar de conta
          </button>
        </div>
      </Sheet>
    </>
  )
}
