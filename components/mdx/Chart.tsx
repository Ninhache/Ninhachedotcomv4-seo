'use client';

import { useId, useState } from 'react';

type Point = { label: string; value: number };

const W = 640;
const H = 280;
const PAD = { top: 24, right: 16, bottom: 40, left: 40 };
const ACCENT = '#56dcfc';
const ACCENT2 = '#197dff';

/**
 * MDX `<Chart>` - a small, dependency-free, interactive SVG chart (bar or line)
 * fed by inline data: `<Chart type="bar" data={[{label:'A',value:3}, …]} />`.
 * Client component: hovering a bar/point reveals a value tooltip.
 */
export function Chart({
    type = 'bar',
    data = [],
    height = 280,
    caption,
}: {
    type?: 'bar' | 'line';
    data?: Point[];
    height?: number;
    caption?: string;
}) {
    const gradId = useId();
    const [hover, setHover] = useState<number | null>(null);

    if (!Array.isArray(data) || data.length === 0) {
        return (
            <p className="not-prose my-6 text-sm text-muted-foreground">
                (graphique sans données)
            </p>
        );
    }

    const max = Math.max(...data.map(d => d.value), 1);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (innerW / data.length) * (i + 0.5);
    const y = (v: number) => PAD.top + innerH * (1 - v / max);
    const barW = (innerW / data.length) * 0.6;

    return (
        <figure className="not-prose my-8">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', maxHeight: height }}
                role="img"
                aria-label={caption ?? 'Graphique'}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} />
                        <stop offset="100%" stopColor={ACCENT2} />
                    </linearGradient>
                </defs>

                {/* baseline + max gridline */}
                {[0, max].map(v => (
                    <g key={v}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y(v)}
                            y2={y(v)}
                            stroke="rgba(86,220,252,0.15)"
                        />
                        <text
                            x={PAD.left - 8}
                            y={y(v)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fontSize="11"
                            fill="#8ea3c0"
                        >
                            {v}
                        </text>
                    </g>
                ))}

                {type === 'line' && (
                    <polyline
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={data
                            .map((d, i) => `${x(i)},${y(d.value)}`)
                            .join(' ')}
                    />
                )}

                {data.map((d, i) => {
                    const active = hover === i;
                    return (
                        <g
                            key={d.label}
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                        >
                            {type === 'bar' ? (
                                <rect
                                    x={x(i) - barW / 2}
                                    y={y(d.value)}
                                    width={barW}
                                    height={PAD.top + innerH - y(d.value)}
                                    rx="4"
                                    fill={`url(#${gradId})`}
                                    opacity={active || hover === null ? 1 : 0.5}
                                />
                            ) : (
                                <circle
                                    cx={x(i)}
                                    cy={y(d.value)}
                                    r={active ? 6 : 4}
                                    fill={ACCENT}
                                />
                            )}
                            {/* invisible wide hit area for easy hover */}
                            <rect
                                x={x(i) - innerW / data.length / 2}
                                y={PAD.top}
                                width={innerW / data.length}
                                height={innerH}
                                fill="transparent"
                            />
                            <text
                                x={x(i)}
                                y={H - PAD.bottom + 18}
                                textAnchor="middle"
                                fontSize="11"
                                fill="#8ea3c0"
                            >
                                {d.label}
                            </text>
                            {active && (
                                <text
                                    x={x(i)}
                                    y={y(d.value) - 10}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="600"
                                    fill="#e8eef7"
                                >
                                    {d.value}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {caption && (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
