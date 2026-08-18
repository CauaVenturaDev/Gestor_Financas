import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { SUBNAV_AJUSTES } from '@/app/app/ajustes/subnav'

export default function AjustesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/relatorio" rotulo="Voltar" />
        <h1 className="text-xl font-semibold">Ajustes</h1>
        <SubNav itens={SUBNAV_AJUSTES} />
      </header>

      {children}
    </div>
  )
}
