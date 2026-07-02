import {
    AlertTriangle,
    GraduationCap,
    Info,
    Lightbulb,
    type LucideIcon,
    OctagonX,
    StickyNote,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';

// Canonical ASCII kinds (accented author input like "piège" is normalized to these).
type CalloutKind =
    | 'note'
    | 'info'
    | 'tip'
    | 'warning'
    | 'danger'
    | 'piege'
    | 'lecon';

const ICONS: Record<CalloutKind, LucideIcon> = {
    note: StickyNote,
    info: Info,
    tip: Lightbulb,
    warning: AlertTriangle,
    danger: OctagonX,
    piege: AlertTriangle,
    lecon: GraduationCap,
};

const DEFAULT_TITLE: Record<CalloutKind, string> = {
    note: 'Note',
    info: 'Info',
    tip: 'Astuce',
    warning: 'Attention',
    danger: 'Danger',
    piege: 'Le piège',
    lecon: 'À retenir',
};

/** Normalize an author-supplied `type` (possibly accented, e.g. "piège", "leçon")
 * to an ASCII kind so the CSS class stays `.callout-piege` / `.callout-lecon`. */
function normalizeKind(type: string): CalloutKind {
    const k = type.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return (k in ICONS ? k : 'note') as CalloutKind;
}

/**
 * MDX `<Callout>` - a richer version of the `:::tip` directive callouts: adds a
 * titled header with a type icon. Reuses the `.callout` / `.callout-<kind>`
 * styles from `app/globals.css` (accent border + tint via `--callout-accent`),
 * so it matches the directive callouts and works both server- and client-side.
 *
 * Kinds: `note` | `info` | `tip` | `warning` | `danger` | `piège` | `leçon`.
 * `piège` (⚠) and `leçon` (🎓) give the recurring "the trap was…" / "what I take
 * away" beats their own visual identity across articles.
 */
export function Callout({
    type = 'note',
    title,
    children,
}: {
    type?: string;
    title?: string;
    children?: ReactNode;
}) {
    const kind = normalizeKind(type);
    const Icon = ICONS[kind];
    return (
        <div className={`callout callout-${kind}`}>
            <p
                className={`mt-0 mb-2 flex items-center gap-2 ${ralewaySemiBold.className}`}
                style={{ color: 'var(--callout-accent)' }}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {title ?? DEFAULT_TITLE[kind]}
            </p>
            {children}
        </div>
    );
}
