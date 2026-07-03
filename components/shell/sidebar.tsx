'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; wip?: boolean };
type NavSection = { title: string | null; items: NavItem[] };

// Sidebar grouped by domain so the (growing) admin surface stays scannable.
const sections: NavSection[] = [
    { title: null, items: [{ href: '/admin', label: 'Dashboard' }] },
    {
        title: 'Portfolio',
        items: [
            { href: '/admin/profile', label: 'Profil' },
            { href: '/admin/projects', label: 'Projets' },
            { href: '/admin/skills', label: 'Skills' },
            { href: '/admin/categories', label: 'Catégories (Skills)' },
        ],
    },
    {
        title: 'Blog',
        items: [
            { href: '/admin/articles', label: 'Articles' },
            { href: '/admin/article-categories', label: 'Catégories' },
        ],
    },
    {
        title: 'Expérience',
        items: [
            { href: '/admin/companies', label: 'Entreprises' },
            { href: '/admin/education', label: 'Éducation' },
        ],
    },
    {
        title: 'CV & Contact',
        items: [
            { href: '/admin/contacts', label: 'Contacts' },
            { href: '/admin/resume', label: 'Resume' },
            { href: '/admin/cv', label: 'Générateur CV' },
        ],
    },
    {
        title: 'Système',
        items: [
            { href: '/admin/aliases', label: 'Aliases' },
            { href: '/admin/users', label: 'Users', wip: true },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    return (
        <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3">
                <span className="font-semibold">Ninhache.fr</span>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto p-2">
                {sections.map((section, i) => (
                    <div
                        key={section.title ?? `section-${i}`}
                        className="space-y-1"
                    >
                        {section.title && (
                            <p className="px-3 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {section.title}
                            </p>
                        )}
                        {section.items.map(it => {
                            // Prefix-match so detail/sub-pages (e.g. an
                            // employer's clients, an article editor) keep their
                            // section highlighted. `/admin` stays exact so it
                            // doesn't match every nested route.
                            const active =
                                pathname === it.href ||
                                (it.href !== '/admin' &&
                                    pathname.startsWith(`${it.href}/`));
                            return (
                                <Link
                                    key={it.href}
                                    href={it.href}
                                    aria-disabled={it.wip}
                                    onClick={e => it.wip && e.preventDefault()}
                                    className={cn(
                                        'group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                        it.wip &&
                                            'cursor-not-allowed opacity-50',
                                        !it.wip &&
                                            'hover:bg-accent hover:text-accent-foreground',
                                        active &&
                                            !it.wip &&
                                            'bg-accent text-accent-foreground'
                                    )}
                                >
                                    <span>{it.label}</span>
                                    {it.wip && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            WIP
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </div>
    );
}
