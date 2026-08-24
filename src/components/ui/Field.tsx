'use client'

interface Props {
  label: string
  htmlFor?: string
  erro?: string
  dica?: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, htmlFor, erro, dica, children, className = '' }: Props) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="rotulo">
        {label}
      </label>
      {children}
      {erro ? (
        <span className="erro-campo" role="alert">
          {erro}
        </span>
      ) : dica ? (
        <span className="mt-1.5 block text-sm text-faint">{dica}</span>
      ) : null}
    </div>
  )
}
