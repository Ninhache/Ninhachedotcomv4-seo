import '../globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata: Metadata = {
    title: 'Admin',
    description: 'Admin desc',
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
