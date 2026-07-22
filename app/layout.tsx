import type { Metadata } from "next";
import Script from "next/script";
import { Bebas_Neue, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GlobalChat from "@/components/GlobalChat";

// Google Analytics 4 measurement id. Falls back to the id already wired up
// on the site; override with NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel env
// vars if you ever move to a different GA4 property.
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-ZEZ5BF0QF4";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Marquee — Discover anime, movies, rankings, and quizzes",
    template: "%s",
  },
  description:
    "A polished entertainment marquee for browsing anime, movies, rankings, blog posts, and quizzes.",
  openGraph: {
    siteName: "Marquee",
    type: "website",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body min-h-screen flex flex-col">
        {/* Google tag (gtag.js) — loads after the page is interactive so it
            never blocks first paint; "afterInteractive" is the strategy
            Next.js recommends for analytics scripts. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <GlobalChat />
      </body>
    </html>
  );
}
