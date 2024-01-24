export type Locale = "en-US" | "fr-FR";

export const defaultLocale: Locale = "en-US";

export const locales: Locale[] = ["en-US", "fr-FR"];

export const localeNames: Record<Locale, string> = {
  "en-US": "English",
  "fr-FR": "French",
};
