

export type Locale = "en" | "fr";

export const defaultLocale: Locale = "fr";

export const locales: Locale[] = ["en", "fr"];

export const localeNames: Record<Locale, string> = {
  "en": "English",
  "fr": "French",
};

export const localePrefix = undefined;

///

import { Pathnames } from "next-intl/navigation";

// export const locales = ['en', 'de'] as const;

export const pathnames = {
  '/': '/',
  // '/resume': {
  //   'en': '/resume',
  //   'fr': '/cv'
  // }
} satisfies Pathnames<typeof locales>;

// export type AppPathnames = keyof typeof pathnames;


