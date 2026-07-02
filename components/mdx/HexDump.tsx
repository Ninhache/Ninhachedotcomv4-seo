'use client';

import { useMemo, useState } from 'react';
import { BLUE, CYAN } from '@/components/mdx/tokens';

type Field = { start: number; len: number; label: string; color?: string };

// Cycled when a field has no explicit `color`. Brand accents first, then a
// handful of distinct hues so adjacent fields never collide by default.
const PALETTE = [CYAN, BLUE, '#a855f7', '#f59e0b', '#22c55e', '#ec4899'];

// Bytes wrap onto a new row past this count; also bounds the grid's track count.
const MAX_COLS = 16;

/** Tolerant hex-byte tokenizer: splits on whitespace/commas, drops anything
 * that isn't 1-2 hex digits, upper-cases and zero-pads the rest. */
function parseBytes(data: string): string[] {
    return data
        .split(/[\s,]+/)
        .map(tok => tok.trim().replace(/^0x/i, ''))
        .filter(tok => /^[0-9a-fA-F]{1,2}$/.test(tok))
        .map(tok => tok.toUpperCase().padStart(2, '0'));
}

/**
 * MDX `<HexDump>` - an interactive byte grid for reverse-engineering articles:
 * labelled ranges ("fields") are tinted, and hovering either a cell or the
 * legend highlights that field's whole span. With `driftDemo`, a toggle
 * shifts every field one byte to the right (derived, not mutating `fields`)
 * to show how misreading a single byte cascades into every field after it.
 */
export function HexDump({
    data,
    fields = [],
    driftDemo = false,
    caption,
}: {
    data: string;
    fields?: Field[];
    driftDemo?: boolean;
    caption?: string;
}) {
    const [drifted, setDrifted] = useState(false);
    const [activeField, setActiveField] = useState<number | null>(null);

    const bytes = useMemo(() => parseBytes(data), [data]);

    // Derived, never mutates the `fields` prop: shift each start by +1,
    // clamped so a field can't be pushed past the end of the data.
    const effectiveFields = useMemo(() => {
        if (!drifted) return fields;
        return fields.map(f => {
            const maxStart = Math.max(0, bytes.length - f.len);
            return { ...f, start: Math.min(f.start + 1, maxStart) };
        });
    }, [fields, drifted, bytes.length]);

    const fieldColors = useMemo(
        () =>
            effectiveFields.map(
                (f, i) => f.color ?? PALETTE[i % PALETTE.length]
            ),
        [effectiveFields]
    );

    // Byte index -> owning field index (first field wins on overlap), so
    // both the grid cells and the hover logic share one lookup.
    const byteFieldIndex = useMemo(() => {
        const map = new Array<number>(bytes.length).fill(-1);
        for (let fi = 0; fi < effectiveFields.length; fi++) {
            const f = effectiveFields[fi];
            const end = Math.min(f.start + f.len, bytes.length);
            for (let i = Math.max(0, f.start); i < end; i++) {
                if (map[i] === -1) map[i] = fi;
            }
        }
        return map;
    }, [effectiveFields, bytes.length]);

    if (bytes.length === 0) {
        return (
            <p className="not-prose my-6 text-sm text-muted-foreground">
                (dump hexadécimal sans données)
            </p>
        );
    }

    return (
        <figure className="not-prose my-8">
            {driftDemo && (
                <button
                    type="button"
                    aria-pressed={drifted}
                    onClick={() => setDrifted(d => !d)}
                    className="mb-4 rounded-md border border-border px-3 py-1.5 font-medium text-xs transition-colors hover:bg-muted/50"
                >
                    {drifted ? 'Rétablir' : "Décaler d'un octet"}
                </button>
            )}

            <div className="overflow-x-auto">
                <div
                    role="img"
                    aria-label={caption ?? 'Dump hexadécimal'}
                    className="grid gap-1"
                    style={{
                        gridTemplateColumns: `repeat(${MAX_COLS}, minmax(2.25rem, 1fr))`,
                    }}
                >
                    {bytes.map((byte, i) => {
                        const fi = byteFieldIndex[i];
                        const color = fi === -1 ? null : fieldColors[fi];
                        const active = fi !== -1 && activeField === fi;
                        return (
                            <div
                                key={i}
                                onMouseEnter={() =>
                                    fi !== -1 && setActiveField(fi)
                                }
                                onMouseLeave={() => setActiveField(null)}
                                className={`flex items-center justify-center rounded-sm border-2 border-transparent py-1.5 text-center font-mono text-xs transition-colors ${
                                    color ? 'cursor-pointer' : ''
                                }`}
                                style={
                                    color
                                        ? {
                                              backgroundColor: `color-mix(in oklch, ${color} ${active ? 32 : 14}%, transparent)`,
                                              borderTopColor: color,
                                              borderBottomColor: color,
                                          }
                                        : undefined
                                }
                            >
                                {byte}
                            </div>
                        );
                    })}
                </div>
            </div>

            {effectiveFields.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {effectiveFields.map((f, fi) => {
                        const color = fieldColors[fi];
                        const end = f.start + f.len - 1;
                        return (
                            <li key={fi}>
                                <button
                                    type="button"
                                    onMouseEnter={() => setActiveField(fi)}
                                    onMouseLeave={() => setActiveField(null)}
                                    onFocus={() => setActiveField(fi)}
                                    onBlur={() => setActiveField(null)}
                                    className="flex items-center gap-2 rounded-sm px-1 py-0.5 transition-opacity"
                                    style={{
                                        opacity:
                                            activeField === null ||
                                            activeField === fi
                                                ? 1
                                                : 0.45,
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="h-3 w-3 shrink-0 rounded-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="font-medium">
                                        {f.label}
                                    </span>
                                    <span className="font-mono text-muted-foreground text-xs">
                                        [{f.start}..{end}]
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {caption && (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
