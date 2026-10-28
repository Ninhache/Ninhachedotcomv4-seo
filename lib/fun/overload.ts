/**
 * The home portrait short-circuits when it is spammed. What counts is the
 * rate, not a total: clicks older than the window are forgotten, so someone
 * clicking once a second can go on forever and never come close.
 */

/** Clicks inside the window that blow the portrait up. */
export const OVERLOAD_CLICKS = 20;
/** Sliding window, ms. 20 in 5 s is 4 clicks a second, held. */
export const OVERLOAD_WINDOW_MS = 5000;
/**
 * Share of OVERLOAD_CLICKS where each warning stage starts: warm (7 clicks in
 * the window), hot (12), critical (16). One click a second peaks at 5.
 */
const STAGES = [0.35, 0.6, 0.8] as const;

/** 0 calm, 1 warm, 2 hot, 3 critical. */
export type Stage = 0 | 1 | 2 | 3;

/** The clicks still inside the window at `now`. */
export function recent(times: readonly number[], now: number): number[] {
    return times.filter(t => now - t < OVERLOAD_WINDOW_MS);
}

/** Adds a click at `now` and forgets the ones that fell out of the window. */
export function record(times: readonly number[], now: number): number[] {
    return [...recent(times, now), now];
}

/** How close to blowing up, from 0 to 1. */
export function heatOf(times: readonly number[], now: number): number {
    return Math.min(1, recent(times, now).length / OVERLOAD_CLICKS);
}

export function stageOf(heat: number): Stage {
    return STAGES.filter(s => heat >= s).length as Stage;
}

export function isOverloaded(times: readonly number[], now: number): boolean {
    return recent(times, now).length >= OVERLOAD_CLICKS;
}
