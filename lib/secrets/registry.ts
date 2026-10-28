/**
 * Every secret of the site, in the order the « Secrets n/N » list shows them.
 * Names, descriptions, hints and clues live under `fun.secrets.items.<id>` in
 * the translations. See `docs/specs/fun-layer.md` § 3.2.
 *
 * The order is a difficulty curve on purpose: a few free ones so the counter
 * never reads zero for long, then the ones you have to poke at, then the ones
 * that take days, timing or four hiding places.
 */
export const TIERS = ['warmup', 'digging', 'obsession'] as const;
export type Tier = (typeof TIERS)[number];

export const SECRETS = [
    { id: 'curious', tier: 'warmup' },
    { id: 'shell', tier: 'warmup' },
    { id: 'lost', tier: 'warmup' },
    { id: 'polyglot', tier: 'warmup' },

    { id: 'breaker', tier: 'digging' },
    { id: 'poke', tier: 'digging' },
    { id: 'konami', tier: 'digging' },
    { id: 'xyzzy', tier: 'digging' },
    { id: 'hired', tier: 'digging' },
    { id: 'honeypot', tier: 'digging' },
    { id: 'root', tier: 'digging' },
    { id: 'red-pill', tier: 'digging' },

    { id: 'teapot', tier: 'obsession' },
    { id: 'flawless', tier: 'obsession' },
    { id: 'speedrun', tier: 'obsession' },
    { id: 'bookworm', tier: 'obsession' },
    { id: 'regular', tier: 'obsession' },
    { id: 'night-owl', tier: 'obsession' },
    { id: 'safe', tier: 'obsession' },
    { id: 'completionist', tier: 'obsession' },
] as const;

export type SecretId = (typeof SECRETS)[number]['id'];

export const SECRET_IDS: readonly SecretId[] = SECRETS.map(s => s.id);

/** Unlocked on its own once every other secret is found. */
export const META_SECRET: SecretId = 'completionist';

export function isSecretId(value: string): value is SecretId {
    return (SECRET_IDS as readonly string[]).includes(value);
}

export function secretsOf(tier: Tier): SecretId[] {
    return SECRETS.filter(s => s.tier === tier).map(s => s.id);
}

/**
 * A tier's hints sharpen into clues once every secret of the tiers before it
 * is found. The warm-up has nothing before it, so its hints are clues already.
 */
export function cluesOpen(tier: Tier, found: readonly SecretId[]): boolean {
    const before = TIERS.slice(0, TIERS.indexOf(tier));
    return before.every(t => secretsOf(t).every(id => found.includes(id)));
}

/** The 404 game: a clear under this time is the `speedrun` secret. */
export const SPEEDRUN_MS = 45_000;
/** Above this, a 404 clear is too slow to be worth a « so close » line. */
export const SPEEDRUN_NEAR_MS = 75_000;
/**
 * The four digits of the safe, numbered 1/4 to 4/4 where they hide: the
 * console's `ninhache.help()`, the terminal's `.env`, the honeypot's « caught »
 * screen and `public/humans.txt` (a static file: change it by hand).
 */
export const SAFE_CODE = '7319';
/** Distinct days of visit for the `regular` secret. */
export const REGULAR_DAYS = 3;
/** Night owl: a visit before this hour, local time, that lasts a little. */
export const NIGHT_END_HOUR = 5;
export const NIGHT_STAY_MS = 4000;
