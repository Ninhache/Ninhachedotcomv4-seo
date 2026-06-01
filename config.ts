export type Locale = 'en' | 'fr';

export const defaultLocale: Locale = 'fr';

export const locales: Locale[] = ['en', 'fr'];

export const localeNames: Record<Locale, string> = {
    en: 'English',
    fr: 'French',
};
