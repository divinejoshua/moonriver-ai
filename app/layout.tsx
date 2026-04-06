import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ILoveUgc — Create Viral UGC Ads in minutes",
  description:
    "Turn any product link into a TikTok-ready UGC review video in minutes. AI script, avatar voiceover, auto-captions, and background music. 100K+ views generated.",
  openGraph: {
    title: "ILoveUgc — Create Viral UGC Ads in minutes",
    description:
      "Turn any product link into a TikTok-ready UGC review video in minutes. 100K+ views generated.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} h-full antialiased`}
      >
        <meta name="google-site-verification" content="Spd6vZggACBCo3IxsTgrXWVufSqSGpBDaoIOCBEl7JU" />
        <body className="min-h-full flex flex-col">{children}</body>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-34BF8SH5HS" />
        <Script id="google-analytics">
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-34BF8SH5HS');
        `}
        </Script>
      </html>
    </ClerkProvider>
  );
}
