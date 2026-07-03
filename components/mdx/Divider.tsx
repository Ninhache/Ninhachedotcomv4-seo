import { ralewaySemiBold } from '@/app/fonts';

/**
 * MDX `<Divider>` - a signature section separator: two hairline rails around
 * a centered mark. Without `label`, the mark is a small cyan diamond. With
 * `label`, the label sits between the rails instead, styled as a meta tag.
 */
export function Divider({ label }: { label?: string }) {
    return (
        <div className="not-prose my-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            {label ? (
                <span
                    className={`uppercase tracking-wide text-xs text-muted-foreground ${ralewaySemiBold.className}`}
                >
                    {label}
                </span>
            ) : (
                <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-primary" />
            )}
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
