import { NextIntlClientProvider } from 'next-intl';
import { FunLayer } from './FunLayer';

/**
 * Mounts the fun layer with its own provider and only the `fun` messages: the
 * layouts that host it carry no provider of their own.
 */
export function FunRoot({
    locale,
    messages,
}: {
    locale: string;
    messages: Record<string, unknown>;
}) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <FunLayer />
        </NextIntlClientProvider>
    );
}
