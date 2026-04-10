import { PricingTable } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import Footer from '../components/Footer'
import Header from '../components/Header'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header><UserButton /></Header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Simple, transparent pricing</h1>
          <p className="text-sm text-muted-foreground">Start free · upgrade anytime · cancel anytime</p>
        </div>

        <PricingTable />
      </main>

      <Footer />
    </div>
  )
}
