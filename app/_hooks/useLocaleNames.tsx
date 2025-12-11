import { Locale, locales } from '@/config'
import { useTranslations } from 'next-intl'

export default function useLocaleNames(): Record<Locale, string> {
  const t = useTranslations('useLocaleNames')

  return locales.reduce(
    (acc, locale) => {
      acc[locale] = t(locale) as string
      return acc
    },
    {} as Record<Locale, string>,
  )
}
