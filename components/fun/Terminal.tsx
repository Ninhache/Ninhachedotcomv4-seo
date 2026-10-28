'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    type CommandResult,
    complete,
    type Effect,
    type Line,
    type Locale,
    promptFor,
    run,
} from '@/lib/fun/commands';
import { META_SECRET, SECRET_IDS } from '@/lib/secrets/registry';
import { getFound, onSecret, unlock } from '@/lib/secrets/store';
import styles from './fun.module.css';

const MAX_LINES = 200;

type Printed = Line & { key: number };

let lineKey = 0;
const keyed = (line: Line): Printed => ({ ...line, key: lineKey++ });

/**
 * The shell overlay. A modal `<dialog>`, so the browser handles the focus trap,
 * Escape and the inert page behind it. Commands come from `lib/fun/commands`;
 * this component prints their lines and plays their effects.
 */
export function Terminal({
    open,
    onClose,
    onEffect,
}: {
    open: boolean;
    onClose: () => void;
    /** Effects the layer around the terminal owns: secrets list, matrix. */
    onEffect: (effect: Effect) => void;
}) {
    const t = useTranslations('fun.terminal');
    const tSecrets = useTranslations('fun.secrets.items');
    const locale = (useLocale() === 'en' ? 'en' : 'fr') as Locale;
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const timers = useRef<number[]>([]);
    const [lines, setLines] = useState<Printed[]>([]);
    const [value, setValue] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [cursor, setCursor] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [rooted, setRooted] = useState(false);
    const prompt = promptFor(locale, rooted);

    useEffect(() => setRooted(getFound().includes(META_SECRET)), []);

    const print = useCallback(
        (next: Line[]) =>
            setLines(prev => [...prev, ...next.map(keyed)].slice(-MAX_LINES)),
        []
    );

    // The toasts sit under the modal, so the terminal announces its own
    // secrets in its output.
    useEffect(
        () =>
            onSecret(({ id, count }) => {
                if (id === META_SECRET) setRooted(true);
                if (!dialogRef.current?.open) return;
                print([
                    {
                        text: t('secretLine', {
                            name: tSecrets(`${id}.name`),
                            count,
                            total: SECRET_IDS.length,
                        }),
                        tone: 'accent',
                    },
                ]);
            }),
        [t, tSecrets, print]
    );

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            unlock('shell');
            setLines(prev =>
                prev.length
                    ? prev
                    : [keyed({ text: t('welcome'), tone: 'muted' })]
            );
            inputRef.current?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, t]);

    useEffect(() => {
        const output = outputRef.current;
        if (output && lines.length) output.scrollTop = output.scrollHeight;
    }, [lines]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const apply = (effects: Effect[]) => {
        for (const effect of effects) {
            if (effect.type === 'clear') setLines([]);
            else if (effect.type === 'exit') {
                timers.current.push(window.setTimeout(onClose, 300));
            } else if (effect.type === 'navigate') {
                // A hard navigation, like the footer links: the pages differ
                // in which stylesheets they load.
                timers.current.push(
                    window.setTimeout(
                        () => window.location.assign(effect.href),
                        400
                    )
                );
            } else {
                onEffect(effect);
            }
        }
    };

    /** Prints the lines, honouring the delays of the fake wipe. */
    const play = (res: CommandResult) => {
        res.unlock.forEach(unlock);
        const delayed = res.lines.some(l => l.delay);
        if (!delayed) {
            print(res.lines);
            apply(res.effects);
            return;
        }
        setBusy(true);
        let at = 0;
        res.lines.forEach((line, i) => {
            at += line.delay ?? 0;
            timers.current.push(
                window.setTimeout(() => {
                    print([line]);
                    if (i === res.lines.length - 1) {
                        setBusy(false);
                        apply(res.effects);
                        inputRef.current?.focus();
                    }
                }, at)
            );
        });
    };

    const submit = () => {
        const command = value;
        setValue('');
        setCursor(null);
        print([{ text: `${prompt} ${command}`, tone: 'muted' }]);
        if (command.trim()) setHistory(h => [...h, command].slice(-50));
        play(
            run(command, {
                locale,
                rooted,
                found: getFound(),
                total: SECRET_IDS.length,
                now: new Date(),
            })
        );
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (!busy) submit();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            const done = complete(value);
            if (done) setValue(done);
        } else if (event.key === 'ArrowUp' && history.length) {
            event.preventDefault();
            const next =
                cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
            setCursor(next);
            setValue(history[next]);
        } else if (event.key === 'ArrowDown' && cursor !== null) {
            event.preventDefault();
            const next = cursor + 1;
            if (next >= history.length) {
                setCursor(null);
                setValue('');
            } else {
                setCursor(next);
                setValue(history[next]);
            }
        } else if (event.key === 'l' && event.ctrlKey) {
            event.preventDefault();
            setLines([]);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.terminal}
            aria-label={t('title')}
            onClose={onClose}
            onClick={event => {
                // A click on the backdrop lands on the dialog itself.
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className={styles.termBar}>
                <span className={styles.termDots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
                <span className={styles.termTitle}>{t('title')}</span>
                <button
                    type="button"
                    className={styles.iconButton}
                    onClick={onClose}
                    aria-label={t('close')}
                >
                    ×
                </button>
            </div>
            <div
                ref={outputRef}
                className={styles.termOutput}
                onClick={() => inputRef.current?.focus()}
            >
                <div role="log" aria-live="polite">
                    {lines.map(line =>
                        line.href ? (
                            <a
                                key={line.key}
                                href={line.href}
                                className={`${styles.termLine} ${styles.tone_accent}`}
                                target={
                                    line.href.startsWith('http')
                                        ? '_blank'
                                        : undefined
                                }
                                rel="noopener noreferrer"
                            >
                                {line.text}
                            </a>
                        ) : (
                            <div
                                key={line.key}
                                className={`${styles.termLine} ${line.tone ? styles[`tone_${line.tone}`] : ''}`}
                            >
                                {line.text || ' '}
                            </div>
                        )
                    )}
                </div>
                <label className={styles.termInputRow}>
                    <span className={styles.termPrompt} aria-hidden="true">
                        {prompt}
                    </span>
                    <input
                        ref={inputRef}
                        className={styles.termInput}
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={busy}
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-label={t('inputLabel')}
                    />
                </label>
            </div>
        </dialog>
    );
}
