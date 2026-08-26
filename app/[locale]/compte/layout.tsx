import '@/app/globals.css';
import { setRequestLocale } from 'next-intl/server';
import { PortfolioShell } from '@/app/_components/shell/PortfolioShell';
import type { Locale } from '@/config';

/**
 * Account subtree layout: the shared portfolio shell, with no article slug
 * table. This URL is the same in both languages, so the locale switcher has
 * nothing to translate.
 */
export default async function AccountLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    setRequestLocale(locale as Locale);

    return <PortfolioShell locale={locale}>{props.children}</PortfolioShell>;
}
