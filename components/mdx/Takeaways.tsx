import { ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';
import { PANEL_BODY } from './tokens';

/**
 * MDX `<Takeaways>` - a "key takeaways" / TL;DR box, visually distinct from a
 * `<Callout>` (no accent border, no kind). Cyan `ListChecks` icon + header
 * above the body, which is usually a markdown bullet list. Presentational.
 */
export function Takeaways({
    title = 'Points clés',
    children,
}: {
    title?: string;
    children?: ReactNode;
}) {
    return (
        <div className="not-prose rounded-2xl border border-border bg-secondary p-5">
            <div className="mb-3 flex items-center gap-2">
                <ListChecks className="h-4 w-4 shrink-0 text-primary" />
                <p className={`text-primary ${ralewaySemiBold.className}`}>
                    {title}
                </p>
            </div>
            <div className={PANEL_BODY}>{children}</div>
        </div>
    );
}
