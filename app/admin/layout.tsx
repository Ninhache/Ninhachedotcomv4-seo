import '../globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata: Metadata = {
    title: {
        default: 'Admin',
        template: '%s \u00b7 Admin',
    },
    description:
        "Back-office de ninhache.fr, r\u00e9serv\u00e9 \u00e0 l'administration du contenu.",
    // The back-office has no business in a search index or an AI answer. It is
    // auth-gated, but /admin/login itself is public and was fully crawlable.
    robots: { index: false, follow: false },
};

// Document shell for the whole /admin subtree. The authenticated app shell
// (sidebar + auth guard) lives in the (auto) route group so that public admin
// routes like /admin/login render here without the guard or the sidebar.
export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
