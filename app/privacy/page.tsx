import Link from 'next/link'
import Footer from '../components/Footer'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — ILoveUgc',
  description: 'Privacy Policy for ILoveUgc, an AI UGC video generator by Wetrocloud Inc.',
}

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 29, 2026</p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">

            <section className="space-y-3">
              <h2 className="text-base font-semibold">1. Overview</h2>
              <p>
                Wetrocloud Inc. ("we", "us", or "our") operates ILoveUgc at moonriverai.com (the "Service"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information. By using the Service you agree to the practices described here.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">2. Information We Collect</h2>

              <h3 className="font-medium text-foreground">Account Information</h3>
              <p>
                When you sign up we collect your name and email address via Clerk, our authentication provider. We do not store your password — authentication is handled entirely by Clerk.
              </p>

              <h3 className="font-medium text-foreground">Content You Provide</h3>
              <p>
                We collect the product URLs you submit, any scripts you edit, and any product images or videos you upload. This content is stored in our database and on AWS S3 in order to generate and deliver your videos.
              </p>

              <h3 className="font-medium text-foreground">Payment Information</h3>
              <p>
                Payments are processed by Stripe. We do not store your credit card details. We receive a confirmation of payment and your Stripe customer ID to track your purchase.
              </p>

              <h3 className="font-medium text-foreground">Usage Data</h3>
              <p>
                We automatically collect basic usage data including pages visited, video generation activity, and error logs. This data is used to operate and improve the Service.
              </p>

              <h3 className="font-medium text-foreground">Analytics</h3>
              <p>
                We use Google Analytics to understand how visitors use the Service. Google Analytics collects anonymized data such as pages viewed, session duration, and referring sources. You can opt out via the{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics Opt-out Add-on</a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li>To create your account and authenticate you</li>
                <li>To generate AI scripts, voiceovers, and videos based on your input</li>
                <li>To process payments and manage your video credit balance</li>
                <li>To send transactional emails (e.g. payment receipts)</li>
                <li>To diagnose errors and improve the Service</li>
                <li>To comply with legal obligations</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">4. Third-Party Providers</h2>
              <p>
                We share data with the following third-party providers solely to operate the Service:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li><span className="text-foreground font-medium">Clerk</span> — authentication and user management</li>
                <li><span className="text-foreground font-medium">Supabase</span> — database storage</li>
                <li><span className="text-foreground font-medium">AWS S3</span> — media file storage</li>
                <li><span className="text-foreground font-medium">Stripe</span> — payment processing</li>
                <li><span className="text-foreground font-medium">Google Gemini</span> — AI script generation</li>
                <li><span className="text-foreground font-medium">ElevenLabs</span> — AI voiceover generation</li>
                <li><span className="text-foreground font-medium">FAL AI</span> — lip-sync video generation</li>
                <li><span className="text-foreground font-medium">Google Analytics</span> — anonymized usage analytics</li>
              </ul>
              <p>
                Each provider operates under their own privacy policy and data processing terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">5. Data Retention</h2>
              <p>
                We retain your account and project data for as long as your account is active. Generated media files (images, audio, video) are stored on AWS S3 and may be retained indefinitely to support re-downloads. You may request deletion of your data at any time by contacting us.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">6. Security</h2>
              <p>
                We use industry-standard measures to protect your data, including encrypted connections (HTTPS), access-controlled cloud storage, and authentication via Clerk. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">7. Your Rights</h2>
              <p>
                Depending on your jurisdiction you may have the right to access, correct, or delete your personal data. To exercise any of these rights, email us at{' '}
                <a href="mailto:hello@moonriverai.com" className="text-primary hover:underline">hello@moonriverai.com</a>.
                We will respond within 30 days.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">8. Children's Privacy</h2>
              <p>
                The Service is not directed at children under 18. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, please contact us and we will delete it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will post the updated policy on this page with a revised date. Continued use of the Service after changes take effect constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">10. Contact</h2>
              <p>
                Questions or concerns about this Privacy Policy? Contact us at{' '}
                <a href="mailto:hello@moonriverai.com" className="text-primary hover:underline">hello@moonriverai.com</a>.
              </p>
              <p className="text-muted-foreground">
                Wetrocloud Inc.<br />
                hello@moonriverai.com
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
