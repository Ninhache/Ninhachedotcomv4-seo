import '@/app/globals.css';
import { setRequestLocale } from 'next-intl/server';
import { PortfolioShell } from '@/app/_components/shell/PortfolioShell';
import type { Locale } from '@/config';

/**
 * Legal subtree layout: the shared portfolio shell, with no article slug
 * table. The slugs are identical in both languages, so the locale switcher's
 * default path-preserving behaviour is already correct here.
 */
export default async function LegalLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    setRequestLocale(locale as Locale);

    return <PortfolioShell locale={locale}>{props.children}</PortfolioShell>;
}
