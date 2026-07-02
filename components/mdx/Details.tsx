import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { CYAN } from './tokens';

type DetailsProps = {
    summary?: string;
    children?: ReactNode;
};

/**
 * MDX `<Details>`: a native `<details>` disclosure for relegating heavy
 * proofs / big code blocks out of the main reading flow. The `summary`
 * header carries a chevron that rotates open via the `group-open:` variant;
 * the revealed body is left in normal prose flow (no `not-prose`) so
 * markdown inside keeps its usual styling. Presentational.
 */
export function Details({ summary = 'Détails', children }: DetailsProps) {
    return (
        <details className="group my-6 rounded-xl border border-border bg-muted/20 p-4 open:pb-4">
            <summary className="not-prose flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
                <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-90"
                    style={{ color: CYAN }}
                />
                {summary}
            </summary>
            <div className="mt-3 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {children}
            </div>
        </details>
    );
}
