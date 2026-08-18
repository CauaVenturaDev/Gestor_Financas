import Link from 'next/link'
import { Wallet } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-safe">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-safe">
        <header className="pb-6 pt-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-ink">
              <Wallet size={20} />
            </span>
            <span className="text-lg font-semibold">Gestor Financeiro</span>
          </Link>
        </header>
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  )
}
