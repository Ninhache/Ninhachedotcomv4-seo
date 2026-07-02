import {
    Children,
    cloneElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from 'react';
import { CYAN } from './tokens';

type TimelineItemProps = {
    date?: string;
    title?: string;
    /** Injected by `<Timeline>`: hides the connector under the last item. */
    isLast?: boolean;
    children?: ReactNode;
};

/**
 * One entry in a `<Timeline>` chronology. Rendered as a list item with a
 * filled dot sitting on the connector line, an optional muted `date` above
 * the `title`, and its body.
 */
export function TimelineItem({
    date,
    title,
    isLast,
    children,
}: TimelineItemProps) {
    return (
        <li className="relative list-none pb-6 pl-8 last:pb-0">
            {!isLast && (
                <span
                    aria-hidden
                    className="absolute top-4 bottom-0 left-[7px] w-px bg-border/70"
                />
            )}
            <span
                aria-hidden
                className="absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full border-2"
                style={{ background: '#0f1d30', borderColor: CYAN }}
            />
            {date && (
                <p className="mt-0 mb-0.5 text-muted-foreground text-xs">
                    {date}
                </p>
            )}
            {title && <p className="mt-0 mb-1 font-semibold">{title}</p>}
            <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {children}
            </div>
        </li>
    );
}

/**
 * MDX `<Timeline>`: a vertical chronology. Wraps `<TimelineItem date
 * title>` entries and auto-detects the last one (via `React.Children`,
 * ignoring whitespace) to hide the connector line beneath it. For narrating
 * the order of events in a project, an incident, or a debugging session.
 * Presentational.
 */
export function Timeline({ children }: { children?: ReactNode }) {
    const items = Children.toArray(children).filter(
        (c): c is ReactElement<TimelineItemProps> =>
            isValidElement(c) && c.type === TimelineItem
    );
    return (
        <ol className="not-prose my-6 pl-0">
            {items.map((c, i) =>
                cloneElement(c, {
                    isLast: i === items.length - 1,
                })
            )}
        </ol>
    );
}
