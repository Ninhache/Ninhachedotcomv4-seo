import {
    Children,
    cloneElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from 'react';
import { ralewaySemiBold } from '@/app/fonts';
import { CYAN, PANEL_BODY } from './tokens';

type StepProps = {
    title?: string;
    /** Injected by `<Steps>` - do not pass manually. */
    n?: number;
    /** Injected by `<Steps>` - hides the connector under the last step. */
    isLast?: boolean;
    children?: ReactNode;
};

/**
 * One step in a `<Steps>` pipeline. Rendered as a list item with a numbered
 * badge sitting on the connector line, an optional bold title, and its body.
 */
export function Step({ title, n, isLast, children }: StepProps) {
    return (
        <li className="relative list-none pb-6 pl-11 last:pb-0">
            {!isLast && (
                <span
                    aria-hidden
                    className="absolute top-8 bottom-0 left-[15px] w-px bg-border/70"
                />
            )}
            <span
                className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full text-center font-semibold text-sm leading-none tabular-nums"
                style={{
                    background: '#0f1d30',
                    color: CYAN,
                    border: `1px solid ${CYAN}`,
                }}
            >
                {n}
            </span>
            {title && (
                <p className={`mt-1 mb-1 ${ralewaySemiBold.className}`}>
                    {title}
                </p>
            )}
            <div className={PANEL_BODY}>{children}</div>
        </li>
    );
}

/**
 * MDX `<Steps>` - a numbered, vertical pipeline. Wraps `<Step>` children and
 * auto-numbers them (via `React.Children`, ignoring whitespace), drawing a
 * connector line between badges. For the ordered processes these articles are
 * full of (sRGB→linéaire→XYZ→Lab, `make bump`, the 3-piece de-obfuscation).
 * Presentational.
 */
export function Steps({ children }: { children?: ReactNode }) {
    const steps = Children.toArray(children).filter(
        (c): c is ReactElement<StepProps> =>
            isValidElement(c) && c.type === Step
    );
    return (
        <ol className="not-prose my-6 pl-0">
            {steps.map((c, i) =>
                cloneElement(c, {
                    n: i + 1,
                    isLast: i === steps.length - 1,
                })
            )}
        </ol>
    );
}
