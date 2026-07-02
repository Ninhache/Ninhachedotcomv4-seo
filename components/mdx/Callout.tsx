import {
    AlertTriangle,
    Info,
    Lightbulb,
    type LucideIcon,
    OctagonX,
    StickyNote,
} from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutType = 'note' | 'info' | 'tip' | 'warning' | 'danger';

const ICONS: Record<CalloutType, LucideIcon> = {
    note: StickyNote,
    info: Info,
    tip: Lightbulb,
    warning: AlertTriangle,
    danger: OctagonX,
};

const DEFAULT_TITLE: Record<CalloutType, string> = {
    note: 'Note',
    info: 'Info',
    tip: 'Astuce',
    warning: 'Attention',
    danger: 'Danger',
};

/**
 * MDX `<Callout>` — a richer version of the `:::tip` directive callouts: adds a
 * titled header with a type icon. Reuses the `.callout` / `.callout-<type>`
 * styles from `app/globals.css` (accent border + tint via `--callout-accent`),
 * so it matches the directive callouts and works both server- and client-side.
 */
export function Callout({
    type = 'note',
    title,
    children,
}: {
    type?: CalloutType;
    title?: string;
    children?: ReactNode;
}) {
    const Icon = ICONS[type] ?? ICONS.note;
    return (
        <div className={`callout callout-${type}`}>
            <p
                className="mt-0 mb-2 flex items-center gap-2 font-semibold"
                style={{ color: 'var(--callout-accent)' }}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {title ?? DEFAULT_TITLE[type] ?? DEFAULT_TITLE.note}
            </p>
            {children}
        </div>
    );
}
