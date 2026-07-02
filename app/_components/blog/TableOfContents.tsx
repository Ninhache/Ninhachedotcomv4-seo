'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/markdown/render-article';
import { cn } from '@/lib/utils';

/**
 * Sticky table of contents for an article. Receives the heading list already
 * extracted server-side (`toc`), so no Markdown is parsed on the client. An
 * `IntersectionObserver` highlights the section currently in view; clicking an
 * entry smooth-scrolls to it (the heading's `scroll-mt` clears the fixed header).
 */
export function TableOfContents({ toc }: { toc: TocItem[] }) {
    const t = useTranslations('blog');
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (!toc.length) return;
        const observer = new IntersectionObserver(
            entries => {
                // Prefer the topmost heading currently intersecting the band.
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top
                    );
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            // Active = heading sitting in the upper third of the viewport.
            { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] }
        );
        for (const item of toc) {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [toc]);

    if (toc.length < 2) return null;

    const onClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        setActiveId(id);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Reflect the target in the URL without a jump.
        history.replaceState(null, '', `#${id}`);
    };

    return (
        <nav aria-label={t('tocLabel')} className="text-sm">
            <p className="mb-3 font-semibold text-foreground/80">
                {t('tocLabel')}
            </p>
            <ul className="relative space-y-1 border-l border-border/70">
                {toc.map(item => {
                    const active = activeId === item.id;
                    return (
                        <li key={item.id}>
                            <a
                                href={`#${item.id}`}
                                onClick={e => onClick(e, item.id)}
                                style={{
                                    paddingLeft: item.depth === 3 ? 24 : 12,
                                }}
                                className={cn(
                                    '-ml-px block border-l-2 py-1 leading-snug transition-all duration-300 ease-out',
                                    active
                                        ? 'translate-x-0.5 border-primary font-medium text-primary'
                                        : 'border-transparent text-muted-foreground hover:translate-x-0.5 hover:text-foreground/90'
                                )}
                            >
                                {item.text}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
