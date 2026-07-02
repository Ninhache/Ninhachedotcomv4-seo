'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Fade-in-on-scroll wrapper for block MDX components, matching the site's
 * `AnimatedComponent` signature move (opacity 0->1 + a small translateY) but
 * self-contained and **respecting `prefers-reduced-motion`** (shows instantly,
 * no motion). Reveals once, when scrolled into view.
 */
export function FadeIn({ children }: { children?: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ) {
            setShown(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    io.disconnect();
                }
            },
            { rootMargin: '0px 0px -10% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
        >
            {children}
        </div>
    );
}
