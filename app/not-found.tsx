import type { Metadata } from 'next';
import fr from '@/app/_translations/fr.json';
import { NotFoundView } from '@/components/breakout/NotFoundView';
import { FunRoot } from '@/components/fun/FunRoot';

export const metadata: Metadata = {
    title: '404',
    robots: { index: false },
};

/**
 * The 404 for paths the locale proxy never sees (anything with a dot, like
 * `/.env` or `/wp-login.php`). There is no locale to read, so it speaks the
 * default one; the root layout renders no document, hence the html and body.
 */
export default function RootNotFound() {
    return (
        <html lang="fr">
            <body>
                <NotFoundView
                    locale="fr"
                    messages={{ fun: fr.fun }}
                    copy={fr.fun.notFound}
                />
                <FunRoot locale="fr" messages={{ fun: fr.fun }} />
            </body>
        </html>
    );
}
