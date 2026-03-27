import Image from 'next/image'

type Props = {
  children?: React.ReactNode
  sticky?: boolean
}

export default function Header({ children, sticky }: Props) {
  return (
    <header className={`border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0 ${sticky ? 'sticky top-0 z-10' : ''}`}>
      <a href="/" className="flex items-center gap-3">
        <Image src="/logo.png" alt="Moonriver" width={28} height={28} className="shrink-0" />
        <span className="font-semibold text-base tracking-tight text-foreground">Moonriver</span>
      </a>
      <a href="/history" className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
        History
      </a>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  )
}
