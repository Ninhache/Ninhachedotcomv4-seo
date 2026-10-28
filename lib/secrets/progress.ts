/**
 * Partial progress toward the secrets that take more than one step. Shown as
 * « 2/3 » on their locked card: an unfinished counter is harder to leave alone
 * than a blank one. Kept on this device only, like the found list.
 */

import { LEVEL_CODES } from '@/lib/breakout/levels';
import { getUnlocked } from '@/lib/breakout/progress';
import { readJson, writeJson } from '@/lib/fun/storage';
import { REGULAR_DAYS, type SecretId } from './registry';

const STORAGE_KEY = 'ninhache:fun:progress';
const LOCALES = 2;

type Progress = { locales: string[]; days: string[] };

function read(): Progress {
    const raw = readJson<Partial<Progress> | null>(STORAGE_KEY, null);
    const list = (value: unknown) =>
        Array.isArray(value)
            ? value.filter((x): x is string => typeof x === 'string')
            : [];
    return { locales: list(raw?.locales), days: list(raw?.days) };
}

function add(field: keyof Progress, value: string, cap: number): number {
    const progress = read();
    if (!progress[field].includes(value)) {
        progress[field] = [...progress[field], value].slice(-cap);
        writeJson(STORAGE_KEY, progress);
    }
    return progress[field].length;
}

/** Records a locale seen. Returns how many distinct locales so far. */
export function noteLocale(locale: string): number {
    return add('locales', locale, LOCALES);
}

/** Records today, local time. Returns how many distinct days so far. */
export function noteDay(now: Date): number {
    const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    return add('days', day, REGULAR_DAYS);
}

/** `{ done, total }` for a multi-step secret, null for a one-shot one. */
export function progressOf(
    id: SecretId
): { done: number; total: number } | null {
    if (id === 'polyglot') {
        return { done: read().locales.length, total: LOCALES };
    }
    if (id === 'regular') {
        return { done: read().days.length, total: REGULAR_DAYS };
    }
    if (id === 'teapot') {
        return { done: getUnlocked() - 1, total: LEVEL_CODES.length };
    }
    return null;
}
