import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { ralewaySemiBold } from '@/app/fonts';

type FlowNode = {
    label: string;
    sub?: string;
    /**
     * Annotates the arrow *leaving* this node, for pipelines where the interesting
     * part is the transition rather than the state (`.java --javac--> .class`).
     * Ignored on the last node, which has no outgoing arrow.
     */
    edge?: string;
};

/**
 * MDX `<Flow>` — a simplified, data-driven flow diagram: labeled nodes joined by
 * arrows. Horizontal on `md`+ (arrows point right), stacked on mobile (arrows
 * point down). Meant for conceptual pipelines/architecture overviews, not exact
 * schematics. `nodes` is `[{ label, sub?, edge? }]`; `caption` is optional.
 *
 * An annotated arrow gets a connecting line so the arrowhead does not float in the
 * middle of the gap the label widens. Un-annotated arrows keep the bare glyph, so
 * adding `edge` to one node never changes how the others render.
 */
export function Flow({
    nodes = [],
    caption,
}: {
    nodes?: FlowNode[];
    caption?: string;
}) {
    if (!nodes.length) return null;
    return (
        <figure className="not-prose my-8">
            <div className="flex flex-col items-stretch gap-1.5 md:flex-row md:items-center md:gap-0">
                {nodes.map((n, i) => (
                    <Fragment key={n.label}>
                        <div className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-center">
                            <div
                                className={`text-foreground text-sm ${ralewaySemiBold.className}`}
                            >
                                {n.label}
                            </div>
                            {n.sub && (
                                <div className="mt-0.5 text-muted-foreground text-xs">
                                    {n.sub}
                                </div>
                            )}
                        </div>
                        {i < nodes.length - 1 &&
                            (n.edge ? (
                                <div className="flex shrink-0 items-center justify-center gap-1.5 py-0.5 md:min-w-28 md:flex-col md:gap-1 md:px-2.5 md:py-0">
                                    <span className="max-w-40 text-center text-muted-foreground text-xs leading-tight">
                                        {n.edge}
                                    </span>
                                    <span
                                        className="flex items-center md:w-full"
                                        aria-hidden
                                    >
                                        <span className="hidden h-px flex-1 bg-primary/40 md:block" />
                                        <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-primary/60 md:-ml-1 md:rotate-0" />
                                    </span>
                                </div>
                            ) : (
                                <div
                                    className="flex shrink-0 items-center justify-center py-0.5 md:px-1.5 md:py-0"
                                    aria-hidden
                                >
                                    <ArrowRight className="h-4 w-4 rotate-90 text-primary/60 md:rotate-0" />
                                </div>
                            ))}
                    </Fragment>
                ))}
            </div>
            {caption && (
                <figcaption className="mt-3 text-center text-muted-foreground text-sm">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
