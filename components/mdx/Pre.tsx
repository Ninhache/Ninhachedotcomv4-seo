'use client';

import { Check, Copy } from 'lucide-react';
import { type ComponentPropsWithoutRef, useRef, useState } from 'react';

/**
 * `pre` override for article code blocks. Wraps the `rehype-pretty-code` output
 * (Shiki-highlighted on the server; plain in the client preview) to add a
 * **copy button** and a **language badge**. Registered as `pre` in
 * `mdx-components.tsx`, so every fenced code block gets it — line highlighting,
 * diffs and focus come from the `@shikijs/transformers` notation + globals.css.
 */
export function Pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
    const ref = useRef<HTMLPreElement>(null);
    const [copied, setCopied] = useState(false);
    const lang = (props as Record<string, unknown>)['data-language'] as
        | string
        | undefined;

    const copy = async () => {
        const text = ref.current?.innerText ?? '';
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard denied (no permission / insecure context) — no-op.
        }
    };

    return (
        <div className="group relative">
            {lang && (
                <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/40 px-1.5 py-0.5 font-medium text-[10px] text-white/60 uppercase tracking-wide transition group-hover:opacity-0">
                    {lang}
                </span>
            )}
            <button
                type="button"
                onClick={copy}
                aria-label="Copier le code"
                className="absolute top-2 right-2 rounded bg-black/40 p-1.5 text-white/70 opacity-0 transition hover:text-white group-hover:opacity-100"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </button>
            <pre ref={ref} {...props}>
                {children}
            </pre>
        </div>
    );
}
