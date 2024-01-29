import '@/styles/globals.css';

import { Locale, locales } from "@/config";
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const title = `Almeida Neo's Portfolio`;
const description = `Remind me to add a description please`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    locale: "en_US",
    type: "website",
    url: "https://ninhache.fr/",
    images: [
      {
        url: "https://ninhache.fr/resources/images/Social.png",
        secureUrl: "https://ninhache.fr/resources/images/Social.png",
        type: "image/png",
        width: 1920,
        height: 1080,
      }
    ],
    title,
    description,
    siteName: "Almeida Neo Portfolio"
  },
  twitter: {
    title,
    description,
    images: [
      {
        url: "https://ninhache.fr/portfolio/images/Social.png",
        secureUrl: "https://ninhache.fr/portfolio/images/Social.png",
        type: "image/png",
        width: 1920,
        height: 1080,
      }
    ],
    card: "summary_large_image",
    site: "@NinhacheUwU",
  },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {

  if (locales.includes(locale) === false) {
    return notFound();
  }

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  );
}
