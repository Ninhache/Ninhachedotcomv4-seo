import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
import { MobileSidebar } from '@/components/shell/mobile-sidebar';
import { Sidebar } from '@/components/shell/sidebar';
import { authOptions } from '@/lib/auth/auth.config';

// Server-side auth gate for every authenticated admin page. Runs before any
// page in the (auto) group renders; unauthenticated requests never see the
// shell or trigger client API calls — they are redirected to the login page.
export default async function AuthenticatedAdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/admin/login');
    }

    return (
        <div className="min-h-dvh bg-muted/20">
            <div className="mx-auto max-w-7xl">
                <div className="grid lg:grid-cols-[260px_1fr]">
                    <aside className="sticky top-0 hidden h-dvh border-r bg-background lg:block">
                        <Sidebar />
                    </aside>
                    <div className="flex min-h-dvh flex-col">
                        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background px-4 py-2 lg:hidden">
                            <MobileSidebar />
                            <span className="font-semibold">Ninhache.fr</span>
                        </header>
                        <main className="flex-1 p-4 md:p-6">{children}</main>
                    </div>
                </div>
            </div>
        </div>
    );
}
