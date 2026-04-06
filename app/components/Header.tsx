'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

type Props = {
  children?: React.ReactNode
  sticky?: boolean
}

export default function Header({ children, sticky }: Props) {
  const { isSignedIn } = useAuth()

  return (
    <header className={`border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0 ${sticky ? 'sticky top-0 z-10' : ''}`}>
      <Link href="/" className="flex items-center gap-3">
        <Image src="/logo.png" alt="ILoveUgc" width={28} height={28} className="shrink-0" />
        <span className="font-semibold text-base tracking-tight text-foreground">ILoveUgc</span>
      </Link>
      {isSignedIn && (
        <Link href="/history" className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
          History
        </Link>
      )}
      {children && <div className={`flex items-center gap-4 ${!isSignedIn ? 'ml-auto' : ''}`}>{children}</div>}
    </header>
  )
}
