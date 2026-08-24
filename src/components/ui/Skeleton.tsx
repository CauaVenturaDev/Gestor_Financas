export function Bloco({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-line/60 ${className}`} />
}

/**
 * Esqueleto do miolo de qualquer aba. Existe para a troca de aba responder no
 * toque: a barra de baixo já marca a aba nova e o conteúdo aparece em silhueta
 * enquanto os dados vêm, em vez de a tela ficar parada esperando o servidor.
 */
export function EsqueletoDaAba() {
  return (
    <div className="space-y-4 px-4 pt-3" aria-busy="true" aria-label="Carregando">
      <div className="space-y-3 pt-safe">
        <div className="flex items-center gap-2">
          <Bloco className="h-9 w-9 rounded-full" />
          <Bloco className="h-6 flex-1" />
          <Bloco className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex gap-1.5">
          <Bloco className="h-9 w-24 rounded-full" />
          <Bloco className="h-9 w-24 rounded-full" />
          <Bloco className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Bloco className="h-[74px] rounded-2xl" />
        <Bloco className="h-[74px] rounded-2xl" />
      </div>

      <Bloco className="h-[132px] rounded-2xl" />

      <div className="space-y-2.5">
        <Bloco className="h-5 w-32" />
        <Bloco className="h-[124px] rounded-2xl" />
      </div>
    </div>
  )
}
