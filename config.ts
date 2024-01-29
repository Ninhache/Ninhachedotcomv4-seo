

export type Locale = "en-US" | "fr-FR";

export const defaultLocale: Locale = "en-US";

export const locales: Locale[] = ["en-US", "fr-FR"];

export const localeNames: Record<Locale, string> = {
  "en-US": "English",
  "fr-FR": "French",
};

export const localePrefix = undefined;

///

import { Pathnames } from "next-intl/navigation";

// export const locales = ['en', 'de'] as const;

export const pathnames = {
  '/': '/',
  '/resume': {
    'en-US': '/resume',
    'fr-FR': '/cv'
  }
} satisfies Pathnames<typeof locales>;

// export type AppPathnames = keyof typeof pathnames;


