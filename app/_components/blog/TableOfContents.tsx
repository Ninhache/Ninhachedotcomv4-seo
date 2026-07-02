'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/markdown/render-article';
import { cn } from '@/lib/utils';

/**
 * Sticky table of contents for an article. Receives the heading list already
 * extracted server-side (`toc`), so no Markdown is parsed on the client. An
 * `IntersectionObserver` highlights the section currently in view.
 *
 * `position: sticky` is used (not `fixed`), so — unlike the progress bar — it is
 * unaffected by any ancestor `transform`; it still lives outside animated
 * wrappers for consistency.
 */
export function TableOfContents({ toc }: { toc: TocItem[] }) {
    const t = useTranslations('blog');
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (!toc.length) return;
        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                }
            },
            // Trigger when a heading sits in the upper third of the viewport.
            { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
        );
        for (const item of toc) {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [toc]);

    if (toc.length < 2) return null;

    return (
        <nav aria-label={t('tocLabel')} className="text-sm">
            <p className="mb-3 font-semibold text-foreground/80">
                {t('tocLabel')}
            </p>
            <ul className="space-y-2 border-l border-border">
                {toc.map(item => (
                    <li
                        key={item.id}
                        style={{ paddingLeft: item.depth === 3 ? 24 : 12 }}
                    >
                        <a
                            href={`#${item.id}`}
                            className={cn(
                                '-ml-px block border-l-2 py-0.5 leading-snug transition-colors',
                                activeId === item.id
                                    ? 'border-primary font-medium text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
