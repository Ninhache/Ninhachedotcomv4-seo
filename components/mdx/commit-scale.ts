import { CYAN } from './tokens';

/**
 * Sequential single-hue cyan intensity ramp for the commit heatmaps, on the
 * navy article background. Empty (no commits) is a neutral faint gray so "no
 * activity" reads differently from "low activity"; the 5 levels are the brand
 * cyan at increasing alpha (a lightness-ordered, CVD-safe sequential ramp).
 */
export const EMPTY_CELL = 'rgba(255,255,255,0.05)';
export const LEVELS = [
    'rgba(86,220,252,0.20)',
    'rgba(86,220,252,0.38)',
    'rgba(86,220,252,0.58)',
    'rgba(86,220,252,0.80)',
    CYAN,
];

/** 4 quantile thresholds from the non-zero values, for 5 spread-out buckets. */
export function quantileThresholds(values: number[]): number[] {
    const nz = values.filter(v => v > 0).sort((a, b) => a - b);
    if (nz.length === 0) return [1, 2, 3, 4];
    const q = (p: number) =>
        nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
    return [q(0.2), q(0.4), q(0.6), q(0.8)];
}

/** Map a count to its ramp color given quantile thresholds (empty if 0). */
export function bucketColor(value: number, thresholds: number[]): string {
    if (value <= 0) return EMPTY_CELL;
    let level = 0;
    for (const t of thresholds) if (value > t) level += 1;
    return LEVELS[Math.min(level, LEVELS.length - 1)];
}
