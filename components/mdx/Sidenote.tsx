'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CYAN } from './tokens';

type Pos = { left: number; top: number; width: number };

/**
 * Inline MDX `<Sidenote>`: a footnote-style aside that does NOT break the
 * sentence. The `n` marker stays inline as a small cyan superscript; clicking it
 * opens the note in a DA popover. The popover is `position: fixed` with its left
 * edge **clamped to the viewport**, so it never runs off-screen even when the
 * marker sits at the end of a line. Closes on outside-click, scroll, resize or
 * Escape. Used mid-sentence: `texte<Sidenote n={1}>la note</Sidenote>`.
 */
export function Sidenote({
    children,
    n,
}: {
    children?: ReactNode;
    n?: number | string;
}) {
    const [pos, setPos] = useState<Pos | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const noteRef = useRef<HTMLSpanElement>(null);
    const marker = n ?? '*';
    const open = pos !== null;

    function toggle() {
        if (open) {
            setPos(null);
            return;
        }
        const r = btnRef.current?.getBoundingClientRect();
        if (!r) return;
        const margin = 12;
        const width = Math.min(320, window.innerWidth - margin * 2);
        const left = Math.max(
            margin,
            Math.min(
                r.left + r.width / 2 - width / 2,
                window.innerWidth - width - margin
            )
        );
        setPos({ left, top: r.bottom + 6, width });
    }

    useEffect(() => {
        if (!open) return;
        const close = () => setPos(null);
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!btnRef.current?.contains(t) && !noteRef.current?.contains(t))
                close();
        };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, [open]);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="cursor-pointer align-super font-semibold text-[0.7em] leading-none hover:underline"
                style={{ color: CYAN }}
            >
                {marker}
            </button>
            {pos && (
                <span
                    ref={noteRef}
                    role="note"
                    className="fixed z-50 rounded-lg border border-border bg-popover px-3 py-2 text-left text-muted-foreground text-sm normal-case leading-snug shadow-xl"
                    style={{
                        left: pos.left,
                        top: pos.top,
                        width: pos.width,
                        borderLeftColor: CYAN,
                        borderLeftWidth: '2px',
                    }}
                >
                    {children}
                </span>
            )}
        </>
    );
}
