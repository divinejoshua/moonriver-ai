import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} Wetrocloud Inc. All rights reserved.</span>
      <div className="flex items-center gap-4">
        <a href="mailto:hello@iloveugc.ai" className="hover:text-foreground transition-colors">hello@iloveugc.ai</a>
        <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </div>
    </footer>
  )
}
