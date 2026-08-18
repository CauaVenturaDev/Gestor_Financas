interface Props {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  icone?: React.ReactNode
}

export function EmptyState({ titulo, descricao, acao, icone }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icone && <span className="text-faint">{icone}</span>}
      <div>
        <p className="font-medium">{titulo}</p>
        {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}
