/**
 * The found-secrets list, kept on this device only. `unlock` is the single
 * entry point: anything on the site that wants to award a secret calls it and
 * forgets about it; the banner and the counter listen to the event.
 */
import { readJson, writeJson } from '@/lib/fun/storage';
import {
    isSecretId,
    META_SECRET,
    SECRET_IDS,
    SECRETS,
    type SecretId,
    secretsOf,
    type Tier,
} from './registry';

const STORAGE_KEY = 'ninhache:secrets';
export const SECRET_EVENT = 'ninhache:secret';
/** Dispatched by any « Secrets n/N » button; the fun layer opens the list. */
export const OPEN_SECRETS_EVENT = 'ninhache:secrets-open';

export type SecretEventDetail = {
    id: SecretId;
    count: number;
    /** Set when this secret was the last one missing from its tier. */
    tierDone?: Tier;
};

export function getFound(): SecretId[] {
    const raw = readJson<unknown>(STORAGE_KEY, []);
    return Array.isArray(raw)
        ? raw.filter(
              (id): id is SecretId => typeof id === 'string' && isSecretId(id)
          )
        : [];
}

function award(found: SecretId[], id: SecretId): SecretId[] {
    const next = [...found, id];
    writeJson(STORAGE_KEY, next);
    const tier = SECRETS.find(s => s.id === id)?.tier;
    const tierDone =
        tier && secretsOf(tier).every(s => next.includes(s)) ? tier : undefined;
    window.dispatchEvent(
        new CustomEvent<SecretEventDetail>(SECRET_EVENT, {
            detail: { id, count: next.length, tierDone },
        })
    );
    return next;
}

/** Awards `id` once. Returns true the first time only. */
export function unlock(id: SecretId): boolean {
    if (typeof window === 'undefined') return false;
    let found = getFound();
    if (found.includes(id)) return false;
    found = award(found, id);

    const others = SECRET_IDS.filter(s => s !== META_SECRET);
    if (!found.includes(META_SECRET) && others.every(s => found.includes(s))) {
        award(found, META_SECRET);
    }
    return true;
}

/** Subscribes to new secrets. Returns the unsubscribe function. */
export function onSecret(
    callback: (detail: SecretEventDetail) => void
): () => void {
    const listener = (event: Event) =>
        callback((event as CustomEvent<SecretEventDetail>).detail);
    window.addEventListener(SECRET_EVENT, listener);
    return () => window.removeEventListener(SECRET_EVENT, listener);
}

export function openSecrets(): void {
    window.dispatchEvent(new Event(OPEN_SECRETS_EVENT));
}
