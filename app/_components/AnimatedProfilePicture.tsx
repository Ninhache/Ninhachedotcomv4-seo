'use client';

import { RefreshCw, ZapOff } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { mediaSrc } from '@/lib/baseurl';
import { type Blast, createBlast } from '@/lib/fun/blast';
import { prefersReducedMotion } from '@/lib/fun/events';
import {
    heatOf,
    isOverloaded,
    record,
    type Stage,
    stageOf,
} from '@/lib/fun/overload';
import { unlock } from '@/lib/secrets/store';
import styles from '@/styles/about.module.css';
import { isInViewport } from '@/utils';

const DEFAULT_PHOTO = '/images/Photo.webp';
// Shipped with the front so the swap works before the back-office has any
// alternate face.
const FALLBACK_ALT = '/images/Photo-alt.webp';

/** Shaking and flickering before it pops, ms. */
const BLOWING_MS = 550;
/** From the pop to the secret toast: let the smoke clear first, ms. */
const UNLOCK_DELAY_MS = 1400;
/** How often the heat is re-read once the clicks stop, ms. */
const COOL_TICK_MS = 250;
/** How often the broken button smokes, ms. */
const WISP_MS = 500;
/** A dead portrait still twitches: a fit every 3.5 to 8 s, ms. */
const SPASM_EVERY_MS = [3500, 8000] as const;
/** Between two spasms of one fit, ms. */
const SPASM_GAP_MS = 150;
/** Sparks per click at each heat stage. */
const SPARKS = [0, 3, 6, 10] as const;
/** Where the badge sits, in portrait radii from the centre. */
const BADGE_AT = 0.62;

type Phase = 'ok' | 'blowing' | 'blown';

interface AnimatedProfilePictureProps {
    src?: string | null;
    altSrcs?: string[];
    hiddenSrc?: string | null;
    alt: string;
    swapLabel: string;
    brokenLabel: string;
    customCss?: CSSProperties;
}

const isRemote = (url: string) => /^https?:\/\//i.test(url);
const between = (min: number, max: number) => min + Math.random() * (max - min);

/** A short kick of the whole portrait, harder as it heats up. */
const jolt = (el: HTMLElement | null, strength: number) => {
    const d = 1 + strength * 1.5;
    el?.animate(
        [
            { translate: '0 0' },
            { translate: `${d}px ${-d}px` },
            { translate: `${-d}px ${d / 2}px` },
            { translate: '0 0' },
        ],
        { duration: 160 }
    );
};

/** The face browns out for a blink, like a bulb on a bad wire. */
const flicker = (el: HTMLElement | null) => {
    el?.animate(
        [
            { filter: 'none' },
            { filter: 'brightness(1.9) contrast(1.4)' },
            { filter: 'brightness(0.55) saturate(0.3)' },
            { filter: 'none' },
        ],
        { duration: 130 }
    );
};

const AnimatedProfilePicture: React.FC<AnimatedProfilePictureProps> = ({
    src,
    altSrcs = [],
    hiddenSrc,
    alt,
    swapLabel,
    brokenLabel,
    customCss = {},
}) => {
    const main = src ? mediaSrc(src) : DEFAULT_PHOTO;
    const faces = [
        main,
        ...(altSrcs.length > 0 ? altSrcs.map(mediaSrc) : [FALLBACK_ALT]),
    ];
    // Nothing uploaded yet: the main photo comes back out of the smoke.
    const hidden = hiddenSrc ? mediaSrc(hiddenSrc) : main;

    const ref = useRef<HTMLButtonElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hiddenRef = useRef<HTMLImageElement>(null);
    const blast = useRef<Blast | null>(null);
    const clicks = useRef<number[]>([]);
    const timers = useRef<number[]>([]);
    const [revealed, setRevealed] = useState(false);
    const [swaps, setSwaps] = useState(0);
    const [stage, setStage] = useState<Stage>(0);
    const [phase, setPhase] = useState<Phase>('ok');
    const shown = swaps % faces.length;
    const broken = phase === 'blown';

    useEffect(() => {
        if (revealed) return;
        const check = () => {
            if (ref.current && isInViewport(ref.current)) setRevealed(true);
        };
        window.addEventListener('scroll', check);
        window.addEventListener('resize', check);
        check();
        return () => {
            window.removeEventListener('scroll', check);
            window.removeEventListener('resize', check);
        };
    }, [revealed]);

    useEffect(() => {
        if (canvasRef.current) blast.current = createBlast(canvasRef.current);
        const pending = timers.current;
        return () => {
            blast.current?.dispose();
            for (const id of pending) window.clearTimeout(id);
        };
    }, []);

    // Cooling down: the heat drops as old clicks leave the window.
    useEffect(() => {
        if (stage === 0 || phase !== 'ok') return;
        const id = window.setInterval(() => {
            const next = stageOf(heatOf(clicks.current, performance.now()));
            setStage(next);
            if (next === 3 && !prefersReducedMotion()) {
                blast.current?.wisp(BADGE_AT, BADGE_AT);
            }
        }, COOL_TICK_MS);
        return () => window.clearInterval(id);
    }, [stage, phase]);

    // The broken button keeps smoking until the page is reloaded.
    useEffect(() => {
        if (!broken || prefersReducedMotion()) return;
        const id = window.setInterval(
            () => blast.current?.wisp(BADGE_AT, BADGE_AT),
            WISP_MS
        );
        return () => window.clearInterval(id);
    }, [broken]);

    // The short circuit is not quite over: now and then, 2 or 3 spasms.
    useEffect(() => {
        if (!broken || prefersReducedMotion()) return;
        const pending: number[] = [];
        const fit = () => {
            const spasms = 2 + Math.round(Math.random());
            for (let i = 0; i < spasms; i++) {
                pending.push(
                    window.setTimeout(() => {
                        jolt(ref.current, 2);
                        flicker(hiddenRef.current);
                        blast.current?.sparks(4);
                        const a = Math.random() * Math.PI * 2;
                        blast.current?.wisp(Math.cos(a), Math.sin(a));
                    }, i * SPASM_GAP_MS)
                );
            }
            pending.push(window.setTimeout(fit, between(...SPASM_EVERY_MS)));
        };
        pending.push(window.setTimeout(fit, between(...SPASM_EVERY_MS)));
        return () => {
            for (const id of pending) window.clearTimeout(id);
        };
    }, [broken]);

    const later = (fn: () => void, ms: number) => {
        timers.current.push(window.setTimeout(fn, ms));
    };

    const blowUp = () => {
        setPhase('blowing');
        if (prefersReducedMotion()) {
            setStage(0);
            setPhase('blown');
            unlock('poke');
            return;
        }
        later(() => {
            blast.current?.explode();
            // A dead button is not hot any more.
            setStage(0);
            setPhase('blown');
        }, BLOWING_MS);
        later(() => unlock('poke'), BLOWING_MS + UNLOCK_DELAY_MS);
    };

    const onClick = () => {
        const motion = !prefersReducedMotion();
        if (phase === 'blowing') return;
        if (broken) {
            // Dead button: a crackle, nothing else.
            if (motion) {
                blast.current?.sparks(4);
                jolt(ref.current, 1);
            }
            return;
        }
        const now = performance.now();
        clicks.current = record(clicks.current, now);
        setSwaps(n => n + 1);
        const next = stageOf(heatOf(clicks.current, now));
        setStage(next);
        if (motion && next > 0) {
            blast.current?.sparks(SPARKS[next]);
            jolt(ref.current, next);
        }
        if (isOverloaded(clicks.current, now)) blowUp();
    };

    const label = broken ? brokenLabel : swapLabel;

    return (
        <div className={styles.photo_wrap} style={customCss}>
            <button
                ref={ref}
                id="photo"
                type="button"
                className={styles.photo}
                title={label}
                data-revealed={revealed}
                data-swapped={swaps > 0}
                data-stage={stage}
                data-phase={phase}
                onClick={onClick}
            >
                {faces.map((face, i) => (
                    <Image
                        key={i}
                        className={styles.image}
                        src={face}
                        alt={i === shown && !broken ? alt : ''}
                        aria-hidden={i !== shown || broken}
                        data-shown={i === shown}
                        width={380}
                        height={380}
                        unoptimized={isRemote(face)}
                    />
                ))}
                <Image
                    ref={hiddenRef}
                    className={styles.image}
                    src={hidden}
                    alt={broken ? alt : ''}
                    aria-hidden={!broken}
                    data-face="hidden"
                    width={380}
                    height={380}
                    unoptimized={isRemote(hidden)}
                />
                <span
                    className={styles.photo_badge}
                    aria-hidden
                    style={
                        broken
                            ? undefined
                            : { transform: `rotate(${swaps * 180}deg)` }
                    }
                >
                    {broken ? (
                        <ZapOff size={18} strokeWidth={2.5} />
                    ) : (
                        <RefreshCw size={18} strokeWidth={2.5} />
                    )}
                </span>
                <span className={styles.visually_hidden}>{label}</span>
            </button>
            <canvas
                ref={canvasRef}
                className={styles.photo_blast}
                aria-hidden
            />
        </div>
    );
};

export default AnimatedProfilePicture;
