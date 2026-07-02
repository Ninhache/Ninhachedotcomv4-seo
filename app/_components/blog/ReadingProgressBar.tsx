'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Concave easing so the bar fills FAST early then slows down — a deliberate
 * cognitive nudge (early momentum) without overdoing it. `p^0.7` maps, e.g.,
 * 10% real scroll → ~20% shown, 50% → ~62%, and still resolves to exactly 100%
 * at the end. Tune the exponent down for a stronger early boost.
 */
const EASE = 0.7;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Fixed reading-progress bar pinned to the top of the viewport, measuring scroll
 * through the article element `#{targetId}` (not the whole document, so the
 * header/footer don't skew it).
 *
 * Rendered via a portal to `document.body`: a `position: fixed` element nested
 * under an ancestor with a CSS `transform` (as `AnimatedComponent` sets) would
 * be positioned relative to that ancestor instead of the viewport — the portal
 * sidesteps that trap entirely.
 */
export function ReadingProgressBar({ targetId }: { targetId: string }) {
    const [progress, setProgress] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        let frame = 0;
        const compute = () => {
            frame = 0;
            const el = document.getElementById(targetId);
            if (!el) return;
            const scrollable = el.offsetHeight - window.innerHeight;
            if (scrollable <= 0) {
                setProgress(1);
                return;
            }
            const scrolled = -el.getBoundingClientRect().top;
            setProgress(clamp01(scrolled / scrollable) ** EASE);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(compute);
        };

        compute();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [targetId]);

    if (!mounted) return null;

    return createPortal(
        <div
            aria-hidden
            className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
        >
            <div
                className="h-full origin-left bg-primary transition-[width] duration-75 ease-out"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
            />
        </div>,
        document.body
    );
}
