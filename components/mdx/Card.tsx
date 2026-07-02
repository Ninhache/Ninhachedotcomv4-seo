import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';
import { PANEL_BODY } from './tokens';

/**
 * MDX `<Card>` - a generic DA panel: rounded border, navy surface, cyan hover
 * border. With a `title`, renders a small cyan accent bar next to a
 * `ralewaySemiBold` header above the body. Presentational.
 */
export function Card({
    title,
    children,
}: {
    title?: string;
    children?: ReactNode;
}) {
    return (
        <div className="not-prose rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
            {title && (
                <div className="mb-3 flex items-center gap-2">
                    <span
                        aria-hidden
                        className="h-4 w-[3px] shrink-0 rounded-full bg-primary"
                    />
                    <p className={`font-semibold ${ralewaySemiBold.className}`}>
                        {title}
                    </p>
                </div>
            )}
            <div className={PANEL_BODY}>{children}</div>
        </div>
    );
}
