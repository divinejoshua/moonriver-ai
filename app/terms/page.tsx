import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — ILoveUgc',
  description: 'Terms of Service for ILoveUgc, an AI UGC video generator by Wetrocloud Inc.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="ILoveUgc" width={28} height={28} className="shrink-0" />
          <span className="font-semibold text-base tracking-tight text-foreground">ILoveUgc</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 29, 2026</p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">

            <section className="space-y-3">
              <h2 className="text-base font-semibold">1. Agreement to Terms</h2>
              <p>
                These Terms of Service ("Terms") govern your access to and use of ILoveUgc (the "Service"), operated by Wetrocloud Inc. ("we", "us", or "our"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">2. Description of Service</h2>
              <p>
                ILoveUgc is an AI-powered platform that generates short-form UGC (user-generated content) style product review videos from a product URL. The Service uses third-party AI and media processing providers to generate scripts, voiceovers, lip-synced avatar videos, and captions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">3. Eligibility</h2>
              <p>
                You must be at least 18 years old and capable of entering into a legally binding contract to use the Service. By using ILoveUgc you represent that you meet these requirements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">4. Account Registration</h2>
              <p>
                You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at{' '}
                <a href="mailto:hello@moonriverai.com" className="text-primary hover:underline">hello@moonriverai.com</a>{' '}
                if you suspect unauthorized access.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">5. Purchases and Payments</h2>
              <p>
                Access to video generation requires a one-time purchase. All payments are processed securely via Stripe. Prices are listed in USD and are subject to change with notice. All sales are final unless otherwise required by applicable law.
              </p>
              <p>
                Video generation credits ("videos") are tied to your account and are non-transferable. Unused credits do not expire unless your account is terminated for violation of these Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">6. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li>Generate content that is defamatory, obscene, or violates any law</li>
                <li>Infringe on the intellectual property rights of third parties</li>
                <li>Create misleading, deceptive, or fraudulent advertising</li>
                <li>Scrape product pages you do not have permission to access</li>
                <li>Circumvent usage limits, access controls, or billing systems</li>
                <li>Resell or sublicense access to the Service without written consent</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these rules without refund.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">7. Intellectual Property</h2>
              <p>
                You retain ownership of any product content you provide (URLs, images, videos). By using the Service you grant Wetrocloud Inc. a limited license to process that content solely to deliver the Service.
              </p>
              <p>
                You own the videos generated for you. Wetrocloud Inc. retains all rights to the ILoveUgc platform, AI models, avatars, and infrastructure. You may not copy, reverse-engineer, or redistribute any part of the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">8. Third-Party Services</h2>
              <p>
                The Service integrates with third-party providers including but not limited to Google Gemini, ElevenLabs, FAL AI, AWS, and Stripe. Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the actions or availability of third-party services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">9. Disclaimers</h2>
              <p>
                The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that generated videos will achieve any specific reach, views, or commercial result. AI-generated content may contain errors, inaccuracies, or unintended output — always review content before publishing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Wetrocloud Inc. and its officers, directors, employees, and agents will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim will not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">11. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page with a revised date. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">12. Contact</h2>
              <p>
                Questions about these Terms? Contact us at{' '}
                <a href="mailto:hello@moonriverai.com" className="text-primary hover:underline">hello@moonriverai.com</a>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Wetrocloud Inc. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="mailto:hello@iloveugc.ai" className="hover:text-foreground transition-colors">hello@iloveugc.ai</a>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
