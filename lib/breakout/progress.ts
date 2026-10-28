/**
 * What the 404 game remembers on this device: the best clear time per code and
 * how far along the level ladder the visitor got.
 */
import { readJson, writeJson } from '@/lib/fun/storage';
import { LEVEL_CODES, type StatusCode } from './levels';

const BEST_KEY = (code: StatusCode) => `ninhache:breakout:best:${code}`;
const UNLOCKED_KEY = 'ninhache:breakout:unlocked';

export function getBest(code: StatusCode): number | null {
    const value = readJson<number | null>(BEST_KEY(code), null);
    return typeof value === 'number' && value > 0 ? value : null;
}

/** Stores `ms` if it beats the previous best. Returns true on a new record. */
export function recordBest(code: StatusCode, ms: number): boolean {
    const best = getBest(code);
    if (best !== null && best <= ms) return false;
    writeJson(BEST_KEY(code), Math.round(ms));
    return true;
}

/** Number of levels open, from 1 (only 404) to all of them. */
export function getUnlocked(): number {
    const value = readJson<number>(UNLOCKED_KEY, 1);
    return Math.max(1, Math.min(LEVEL_CODES.length, Number(value) || 1));
}

/** Opens the level after `code`. */
export function unlockAfter(code: StatusCode): number {
    const next = Math.min(LEVEL_CODES.length, LEVEL_CODES.indexOf(code) + 2);
    const unlocked = Math.max(getUnlocked(), next);
    writeJson(UNLOCKED_KEY, unlocked);
    return unlocked;
}

/** `83456` → `1:23.45`. */
export function formatTime(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 10));
    const cs = total % 100;
    const s = Math.floor(total / 100) % 60;
    const m = Math.floor(total / 6000);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
