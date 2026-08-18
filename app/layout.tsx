import type { Metadata } from "next";
import Script from "next/script";
import { Bebas_Neue, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GlobalChat from "@/components/GlobalChat";
import { buildOgImageUrl } from "@/lib/og";

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

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Marquee — Discover anime, movies, rankings, and quizzes",
    template: "%s",
  },
  description:
    "A polished entertainment marquee for browsing anime, movies, rankings, blog posts, and quizzes.",
  keywords: [
    "anime",
    "movies",
    "anime rankings",
    "movie rankings",
    "best anime to watch",
    "best movies to watch",
    "anime recommendations",
    "movie recommendations",
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    siteName: "Marquee",
    type: "website",
    url: BASE_URL,
    title: "Marquee — Discover anime, movies, rankings, and quizzes",
    description:
      "A polished entertainment marquee for browsing anime, movies, rankings, blog posts, and quizzes.",
    images: [
      {
        url: buildOgImageUrl({
          title: "Marquee",
          subtitle: "Discover anime, movies, rankings, and quizzes",
          badge: "MARQUEE",
        }),
        width: 1200,
        height: 630,
        alt: "Marquee — Discover anime, movies, rankings, and quizzes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      buildOgImageUrl({
        title: "Marquee",
        subtitle: "Discover anime, movies, rankings, and quizzes",
        badge: "MARQUEE",
      }),
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Marquee",
  url: BASE_URL,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Marquee",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/movies/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
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
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
        {/* Google tag (gtag.js) — loaded with "lazyOnload" so its ~68 KiB
            downloads during browser idle time, after the page has finished
            loading, instead of racing the app's own JS on the critical
            path (this is what Lighthouse's "Reduce unused JavaScript" /
            "Legacy JavaScript" diagnostics were flagging). Analytics
            firing a beat later is imperceptible to users. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="lazyOnload"
        />
        <Script id="ga4-init" strategy="lazyOnload">
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
