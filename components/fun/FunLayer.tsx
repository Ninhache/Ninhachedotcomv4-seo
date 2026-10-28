'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Effect } from '@/lib/fun/commands';
import { confetti, matrixRain } from '@/lib/fun/effects';
import {
    isTyping,
    OPEN_TERMINAL_EVENT,
    prefersReducedMotion,
} from '@/lib/fun/events';
import { noteDay, noteLocale, progressOf } from '@/lib/secrets/progress';
import {
    cluesOpen,
    META_SECRET,
    NIGHT_END_HOUR,
    NIGHT_STAY_MS,
    POKE_CLICKS,
    POKE_GAP_MS,
    REGULAR_DAYS,
    SAFE_CODE,
    SECRET_IDS,
    type SecretId,
    secretsOf,
    TIERS,
    type Tier,
} from '@/lib/secrets/registry';
import {
    getFound,
    OPEN_SECRETS_EVENT,
    onSecret,
    unlock,
} from '@/lib/secrets/store';
import styles from './fun.module.css';
import { Terminal } from './Terminal';

const TOAST_MS = 3500;
const KONAMI = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
];
const MAGIC_WORD = 'xyzzy';
const LOCALES_NEEDED = 2;
/**
 * Bookworm: the article's end must be on screen after at least this long,
 * scaled to its length at a fast reading pace, so scrolling straight to the
 * bottom does not count.
 */
const READ_WPM = 350;
const READ_MIN_MS = 20_000;
const READ_MAX_MS = 360_000;

type Toast = {
    id: SecretId;
    count: number;
    tierDone?: Tier;
    key: number;
};

/** Guards the console banner against StrictMode's double effects. */
let consoleReady = false;

/**
 * Prints the devtools banner and exposes `window.ninhache`. `hire()` is the
 * `hired` secret; `help()` carries the first digit of the safe.
 */
function setupConsole() {
    if (consoleReady) return;
    consoleReady = true;
    console.log(
        '%cninhache.fr%c\nVous lisez la console. Bon signe.\nReading the console. Good sign.\n\nninhache.help()',
        'color:#56dcfc;font:700 20px ui-monospace,monospace',
        'color:#8ea3c0;font:13px ui-monospace,monospace'
    );
    Object.assign(window, {
        ninhache: {
            help() {
                console.log(
                    `ninhache.hire()   m’embaucher / hire me\nninhache.help()   ceci / this\n\n// 1/4 : ${SAFE_CODE[0]}`
                );
            },
            hire() {
                unlock('hired');
                console.log(
                    '%cNoté. Je prends ça pour un oui.\nNoted. I’ll take that as a yes.%c\nhttps://ninhache.fr/#contact',
                    'color:#56dcfc;font-weight:700',
                    'color:inherit'
                );
            },
        },
    });
}

/**
 * Everything fun that is not the 404 game: the secret toasts, the secrets list,
 * the terminal and the global listeners behind the small eggs. Mounted once per
 * page, with only the `fun` messages. See `docs/specs/fun-layer.md` § 3.
 */
export function FunLayer() {
    const t = useTranslations('fun.secrets');
    const locale = useLocale();
    const pathname = usePathname();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [found, setFound] = useState<SecretId[]>([]);
    const [terminalOpen, setTerminalOpen] = useState(false);
    // The list reads this device's storage, so it renders only once asked
    // for, never on the server.
    const [listReady, setListReady] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const toastKey = useRef(0);

    const openList = useCallback(() => {
        // Opening the list is the first secret: nobody sees « 0/20 ».
        unlock('curious');
        setFound(getFound());
        setListReady(true);
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    // Toasts, one per new secret, each leaving after TOAST_MS.
    useEffect(
        () =>
            onSecret(({ id, count, tierDone }) => {
                const key = toastKey.current++;
                setFound(getFound());
                setToasts(prev => [...prev, { id, count, tierDone, key }]);
                window.setTimeout(
                    () => setToasts(prev => prev.filter(x => x.key !== key)),
                    TOAST_MS
                );
                if (id === META_SECRET && !prefersReducedMotion()) confetti();
            }),
        []
    );

    // Requests from buttons and commands elsewhere on the page.
    useEffect(() => {
        const onTerminal = () => setTerminalOpen(true);
        window.addEventListener(OPEN_SECRETS_EVENT, openList);
        window.addEventListener(OPEN_TERMINAL_EVENT, onTerminal);
        return () => {
            window.removeEventListener(OPEN_SECRETS_EVENT, openList);
            window.removeEventListener(OPEN_TERMINAL_EVENT, onTerminal);
        };
    }, [openList]);

    // Keyboard eggs: Konami, the magic word, the terminal hotkey.
    useEffect(() => {
        let konami = 0;
        let typed = '';
        const onKey = (event: KeyboardEvent) => {
            if (isTyping(event.target) || event.ctrlKey || event.metaKey) {
                return;
            }
            const key =
                event.key.length === 1 ? event.key.toLowerCase() : event.key;

            konami =
                key === KONAMI[konami] ? konami + 1 : key === KONAMI[0] ? 1 : 0;
            if (konami === KONAMI.length) {
                konami = 0;
                unlock('konami');
                if (!prefersReducedMotion()) confetti();
            }

            if (key.length === 1) {
                typed = (typed + key).slice(-MAGIC_WORD.length);
                if (typed === MAGIC_WORD) unlock('xyzzy');
            }

            // The key under Escape: a backquote on QWERTY, a ² on AZERTY.
            if (event.code === 'Backquote' || key === '`' || key === '²') {
                event.preventDefault();
                setTerminalOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Poke: quick clicks on the profile picture of the home page.
    useEffect(() => {
        let clicks = 0;
        let last = 0;
        const onClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target?.closest?.('#photo')) return;
            const now = event.timeStamp;
            clicks = now - last < POKE_GAP_MS ? clicks + 1 : 1;
            last = now;
            if (clicks >= POKE_CLICKS) unlock('poke');
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);

    // Once per page: the console, the visit counters, the night owl.
    useEffect(() => {
        setupConsole();
        if (noteDay(new Date()) >= REGULAR_DAYS) unlock('regular');
        if (new Date().getHours() >= NIGHT_END_HOUR) return;
        const timer = window.setTimeout(
            () => unlock('night-owl'),
            NIGHT_STAY_MS
        );
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (noteLocale(locale) >= LOCALES_NEEDED) unlock('polyglot');
    }, [locale]);

    // Bookworm: the end of a blog article, reached at a reading pace.
    useEffect(() => {
        // The pathname is only here to rerun the check after a client-side
        // navigation to another article.
        if (!pathname) return;
        const article = document.getElementById('blog-article');
        if (!article) return;
        const words = (article.textContent ?? '').split(/\s+/).length;
        const needed = Math.min(
            READ_MAX_MS,
            Math.max(READ_MIN_MS, (words / READ_WPM) * 60_000)
        );
        const start = performance.now();
        const timer = window.setInterval(() => {
            if (performance.now() - start < needed) return;
            if (article.getBoundingClientRect().bottom > window.innerHeight) {
                return;
            }
            unlock('bookworm');
            clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [pathname]);

    const onEffect = useCallback(
        (effect: Effect) => {
            if (effect.type === 'secrets') {
                setTerminalOpen(false);
                openList();
            } else if (effect.type === 'matrix') {
                // The rain is drawn under the page, so the modal goes first.
                setTerminalOpen(false);
                if (!prefersReducedMotion()) matrixRain();
            }
        },
        [openList]
    );

    const total = SECRET_IDS.length;
    const percent = Math.round((found.length / total) * 100);
    const complete = found.length === total;

    return (
        <>
            {/* For whoever reads the source: a word to type, and a digit. */}
            <div
                hidden
                dangerouslySetInnerHTML={{
                    __html: '<!-- Vous lisez la source pour le plaisir. Tapez xyzzy, n’importe où. / You read source for fun. Type xyzzy, anywhere. -->',
                }}
            />

            <div className={styles.toastStack} aria-live="polite">
                {toasts.map(toast => (
                    <div
                        key={toast.key}
                        className={styles.toast}
                        data-tier-done={Boolean(toast.tierDone)}
                        role="status"
                    >
                        <span className={styles.toastIcon} aria-hidden="true">
                            {toast.tierDone ? '!' : '?'}
                        </span>
                        <span className={styles.toastBody}>
                            <span className={styles.toastKicker}>
                                {toast.tierDone
                                    ? t('tierDone', {
                                          tier: t(`tiers.${toast.tierDone}`),
                                      })
                                    : t('found')}
                            </span>
                            <span className={styles.toastName}>
                                {t(`items.${toast.id}.name`)}
                            </span>
                        </span>
                        <span className={styles.toastCount}>
                            {toast.count}/{total}
                        </span>
                    </div>
                ))}
            </div>

            <dialog
                ref={dialogRef}
                className={styles.dialog}
                aria-labelledby="fun-secrets-title"
                onClick={event => {
                    if (event.target === event.currentTarget) {
                        event.currentTarget.close();
                    }
                }}
            >
                <div className={styles.dialogInner}>
                    <div className={styles.dialogHead}>
                        <div>
                            <h2
                                id="fun-secrets-title"
                                className={styles.dialogTitle}
                            >
                                {t('title')}
                            </h2>
                            <p className={styles.dialogIntro}>
                                {complete
                                    ? t('introDone', { total })
                                    : t('intro', {
                                          count: found.length,
                                          total,
                                      })}
                            </p>
                        </div>
                        <button
                            type="button"
                            className={styles.iconButton}
                            aria-label={t('close')}
                            onClick={() => dialogRef.current?.close()}
                        >
                            ×
                        </button>
                    </div>
                    <div
                        className={styles.progress}
                        role="progressbar"
                        aria-valuenow={found.length}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-label={t('title')}
                    >
                        <div
                            className={styles.progressFill}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    {listReady &&
                        TIERS.map(tier => (
                            <TierSection key={tier} tier={tier} found={found} />
                        ))}
                    {!complete && (
                        <p className={styles.dialogRule}>{t('rule')}</p>
                    )}
                </div>
            </dialog>

            <Terminal
                open={terminalOpen}
                onClose={() => setTerminalOpen(false)}
                onEffect={onEffect}
            />
        </>
    );
}

/**
 * One tier of the list. A missing secret shows its cryptic hint, or its clue
 * once the tiers before are done, plus partial progress when it has steps.
 */
function TierSection({ tier, found }: { tier: Tier; found: SecretId[] }) {
    const t = useTranslations('fun.secrets');
    const ids = secretsOf(tier);
    const done = ids.filter(id => found.includes(id)).length;
    const clues = cluesOpen(tier, found);

    return (
        <section className={styles.tier}>
            <h3 className={styles.tierHead}>
                <span>{t(`tiers.${tier}`)}</span>
                <span className={styles.tierCount}>
                    {done}/{ids.length}
                </span>
            </h3>
            <ul className={styles.secretList}>
                {ids.map(id => {
                    const isFound = found.includes(id);
                    const progress = isFound ? null : progressOf(id);
                    return (
                        <li
                            key={id}
                            className={styles.secret}
                            data-found={isFound}
                        >
                            <span className={styles.secretName}>
                                {isFound ? t(`items.${id}.name`) : t('unknown')}
                                {progress && progress.done > 0 && (
                                    <span className={styles.secretProgress}>
                                        {progress.done}/{progress.total}
                                    </span>
                                )}
                            </span>
                            <span className={styles.secretText}>
                                {isFound
                                    ? t(`items.${id}.description`)
                                    : t(
                                          `items.${id}.${clues ? 'clue' : 'hint'}`
                                      )}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
